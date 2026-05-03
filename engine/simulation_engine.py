from datetime import datetime
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import traceback
import json

from .eligibility_engine import verificar_elegibilidade
from .financial_engine import calcular_viabilidade_financeira, resolver_taxa_juros
from app.models.sqlalchemy_models import Bank, BankTable, Coefficient, BankRule, PromotoraRule, User
from app.models.models import BancoAprovado
from app.services.admin_service import AdminService

async def executar_simulacao_completa(cliente_input, db: AsyncSession, user_id: int):
    # 0. Pre-calculate Simulation Level Metrics
    try:
        saldo_devedor = float(cliente_input.saldo_devedor or 0)
        parcela_atual = float(cliente_input.valor_parcela or 0)
        prazo_restante = int(cliente_input.prazo_restante or 0)
        prazo_total = int(cliente_input.prazo_total or 0)
        
        try:
            taxa_port_calc = float(resolver_taxa_juros(saldo_devedor, parcela_atual, prazo_restante))
        except:
            taxa_port_calc = 0.0

        # Get Promotora Rules
        user_res = await db.execute(select(User).where(User.id == user_id))
        user_obj = user_res.scalar_one_or_none()
        promotora_id = user_id
        if user_obj and user_obj.role != 'promotora' and user_obj.broker_id:
            promotora_id = user_obj.broker_id

        rules_res = await db.execute(select(PromotoraRule).where(PromotoraRule.promotora_id == promotora_id))
        p_rules = rules_res.scalars().all()
        p_priority_config = []
        p_origin_config = []
        for r in p_rules:
            if r.rule_key == 'priority_config': p_priority_config = json.loads(r.rule_value)
            if r.rule_key == 'origin_bank_config': p_origin_config = json.loads(r.rule_value)

        # 0.1 Validate Promotora Origin Bank Rules (PRIORIDADE MÁXIMA)
        import re
        def get_clean_words(text):
            if not text: return set()
            t = str(text).upper()
            for noise in ["BANCO", "S.A.", "SA", "CONSIGNADO", "CREDITO", "FINANCEIRA", "BANK", "PORTABILIDADE", "INSTITUICAO"]:
                t = t.replace(noise, " ")
            return set(re.findall(r'[A-Z0-9]{2,}', t))

        full_origin_name = str(cliente_input.banco or "").upper()
        input_words = get_clean_words(full_origin_name)
        parcelas_pagas = prazo_total - prazo_restante
        
        for rule in p_origin_config:
            rule_bank_name = str(rule.get('origin_bank', '')).upper()
            rule_words = get_clean_words(rule_bank_name)
            
            # Correspondência por palavras-chave (ex: "C6" casa com "626 - C6 CONSIGNADO")
            is_match = False
            if rule_words and input_words and len(rule_words.intersection(input_words)) > 0:
                is_match = True
            elif rule_bank_name and (rule_bank_name in full_origin_name or full_origin_name in rule_bank_name):
                is_match = True
                
            if is_match:
                min_paid = int(rule.get('min_paid', 0))
                if parcelas_pagas < min_paid:
                    return {
                        "ofertas": [],
                        "rejeitados": [{
                            "banco": "BLOQUEIO REGRAS PROMOTORA",
                            "motivo": f"A regra da sua promotora exige no mínimo {min_paid} parcelas pagas para o banco {rule_bank_name}. (Identificado: {full_origin_name} com {parcelas_pagas} pagas)",
                            "elegivel": False
                        }],
                        "total_bancos_analisados": 0,
                        "total_aprovados": 0,
                        "total_rejeitados": 1,
                        "cliente": {
                            "nome": getattr(cliente_input, "nome_cliente", ""),
                            "cpf": getattr(cliente_input, "cpf_cliente", ""),
                            "saldo_devedor": saldo_devedor,
                            "valor_parcela": parcela_atual
                        }
                    }

        bancos_aprovados = []
        rejeitados = []
        
        # 1. Carrega todos os bancos ativos e suas regras do Banco de Dados
        result = await db.execute(
            select(Bank)
            .where(Bank.active == True)
            .options(
                selectinload(Bank.rules), 
                selectinload(Bank.tables).selectinload(BankTable.coefficients)
            )
        )
        todos_os_bancos = result.scalars().all()
        
        for banco in todos_os_bancos:
            try:
                if not banco.rules:
                    rejeitados.append({
                        "banco": banco.name,
                        "bank_id": banco.id,
                        "logo_url": banco.logo_url,
                        "motivo": "Banco sem regras cadastradas",
                        "elegivel": False
                    })
                    continue
                    
                # Buscar todas as regras aplicáveis (pelo convênio ou genéricas)
                regras_aplicaveis = []
                convenio_input = str(cliente_input.convenio or "").strip().upper()
                sub_input = str(cliente_input.sub_convenio or "").strip().upper()

                for r in banco.rules:
                    rule_conv = str(r.agreement or "").strip().upper()
                    match_conv = rule_conv == convenio_input or not rule_conv
                    
                    match_sub = True
                    rule_sub = str(r.sub_agreement or "").strip().upper()
                    if rule_sub and sub_input:
                        match_sub = rule_sub == sub_input
                    elif rule_sub and not sub_input:
                        match_sub = False 
                    
                    if match_conv and match_sub:
                        regras_aplicaveis.append(r)
                
                if not regras_aplicaveis:
                    rejeitados.append({
                        "banco": banco.name,
                        "bank_id": banco.id,
                        "logo_url": banco.logo_url,
                        "motivo": f"Sem regras configuradas para o convênio {convenio_input}.",
                        "elegivel": False
                    })
                    continue
                    
                # Aplicar todas as regras aplicáveis. Se qualquer uma rejeitar, o banco é rejeitado.
                banco_bloqueado = False
                for regra in regras_aplicaveis:
                    elegivel, motivo = verificar_elegibilidade(cliente_input, regra)
                    if not elegivel:
                        rejeitados.append({
                            "banco": banco.name,
                            "bank_id": banco.id,
                            "logo_url": banco.logo_url,
                            "motivo": motivo,
                            "elegivel": False
                        })
                        banco_bloqueado = True
                        break
                
                if banco_bloqueado:
                    continue
 
                banco_tem_oferta = False
                motivos_tabelas = []

                for tabela in banco.tables:
                    if not tabela.active:
                        continue
                    
                    # Additional Table Validation: Agreement Matching (INSS, SIAPE, etc.)
                    t_conv = str(tabela.agreement or "").strip().upper()
                    if t_conv and t_conv != convenio_input:
                        motivos_tabelas.append(f"Tabela {tabela.name}: Convênio {t_conv} diferente de {convenio_input}")
                        continue
                        
                    # Additional Table Validation: Sub-Agreement
                    t_sub = str(tabela.sub_agreement or "").strip().upper()
                    if t_sub:
                        if not sub_input or t_sub != sub_input:
                            motivos_tabelas.append(f"Tabela {tabela.name}: Sub-convênio {t_sub} não coincide")
                            continue

                    # Additional Table Validation: Min Paid Installments
                    if tabela.min_paid_installments:
                        parcelas_pagas = (int(prazo_total) - int(prazo_restante))
                        if parcelas_pagas < int(tabela.min_paid_installments):
                            motivos_tabelas.append(f"Tabela {tabela.name}: Exige {tabela.min_paid_installments} parcelas pagas (Cliente tem {parcelas_pagas})")
                            continue
                    
                    # Additional Table Validation: Installment limits
                    if tabela.min_installment and parcela_atual < float(tabela.min_installment):
                        motivos_tabelas.append(f"Tabela {tabela.name}: Parcela mínima R$ {tabela.min_installment}")
                        continue
                    if tabela.max_installment and float(tabela.max_installment) > 0 and parcela_atual > float(tabela.max_installment):
                        motivos_tabelas.append(f"Tabela {tabela.name}: Parcela máxima R$ {tabela.max_installment}")
                        continue
                        
                    # Additional Table Validation: Age limits
                    if tabela.min_age and int(cliente_input.idade or 0) < tabela.min_age:
                        motivos_tabelas.append(f"Tabela {tabela.name}: Idade mínima {tabela.min_age}")
                        continue
                    if tabela.max_age and tabela.max_age > 0 and int(cliente_input.idade or 0) > tabela.max_age:
                        motivos_tabelas.append(f"Tabela {tabela.name}: Idade máxima {tabela.max_age}")
                        continue
                            
                    # Additional Table Validation: Exclusividade de Tabela de Invalidez
                    tabela_nome = tabela.name.lower()
                    especies_invalidez_match = ["04", "05", "06", "32", "33", "34", "92", "4", "5", "6", 4, 5, 6, 32, 33, 34, 92]
                    cliente_is_invalidez = str(cliente_input.convenio).upper() == "INSS" and cliente_input.especie_beneficio in especies_invalidez_match
                    
                    if "invalidez" in tabela_nome and not cliente_is_invalidez:
                        motivos_tabelas.append(f"Tabela {tabela.name}: Exclusiva para Invalidez")
                        continue
                        
                    # 1. Taxa Portabilidade Ajustada vs Mínima do Banco (Hierarquia: Tabela > Banco)
                    tabela_viavel_taxa = True
                    tabela_threshold = float(tabela.min_port_rate or 0.0)
                    
                    for regra in regras_aplicaveis:
                        bank_threshold = float(regra.portability_rate_threshold or 0.0)
                        
                        # Se a tabela NÃO define um limite próprio, usamos o do banco
                        if tabela_threshold <= 0 and bank_threshold > 0:
                            port_adj = float(tabela.portability_adjustment or 0.0)
                            taxa_port_com_ajuste = taxa_port_calc + port_adj
                            if taxa_port_com_ajuste < (bank_threshold - 0.0005):
                                tabela_viavel_taxa = False
                                motivos_tabelas.append(f"Tabela {tabela.name}: Taxa port. {taxa_port_com_ajuste:.2f}% abaixo do global {bank_threshold}%")
                                break
                        
                        # Se a tabela DEFINE um limite, comparamos com a taxa do cliente (ignorando o banco)
                        elif tabela_threshold > 0:
                            if taxa_port_calc < (tabela_threshold - 0.0005):
                                tabela_viavel_taxa = False
                                motivos_tabelas.append(f"Tabela {tabela.name}: Taxa port. atual {taxa_port_calc:.2f}% abaixo do permitido por esta tabela ({tabela_threshold}%)")
                                break
                    
                    if not tabela_viavel_taxa:
                        continue
                                
                    tem_coeficiente_valido = False
                    for coeff_obj in tabela.coefficients:
                        # Removido filtro rígido de prazo (target_term). 
                        # Agora analisamos todos os prazos disponíveis na tabela.
                        current_term = int(coeff_obj.term)
                        
                        tem_coeficiente_valido = True
                        try:
                            resultado = calcular_viabilidade_financeira(
                                cliente_input, banco, coeff_obj, tabela
                            )
                            
                            viavel = resultado[0]
                            troco = float(resultado[1])
                            stats = resultado[2]
                            motivo_rejeicao = resultado[3] if len(resultado) > 3 else "Viabilidade reprovada"
                            
                            if not viavel:
                                motivos_tabelas.append(f"Tabela {tabela.name}: {motivo_rejeicao}")
                                continue
                                
                            # Validação de Troco Mínimo (Regra de Aceitação)
                            for regra in regras_aplicaveis:
                                if hasattr(regra, "min_release_amount") and regra.min_release_amount:
                                    if troco < float(regra.min_release_amount):
                                        viavel = False
                                        motivo_rejeicao = f"Troco insuficiente (R$ {troco:.2f} < R$ {regra.min_release_amount})"
                                        break
                            
                            if not viavel:
                                motivos_tabelas.append(f"Tabela {tabela.name}: {motivo_rejeicao}")
                                continue

                            banco_tem_oferta = True
                            bancos_aprovados.append({
                                "banco": banco.name,
                                "bank_id": banco.id,
                                "logo_url": banco.logo_url,
                                "convenio": cliente_input.convenio,
                                "tabela": tabela.name,
                                "taxa_juros": float(coeff_obj.interest_rate),
                                "taxa_refin": float(stats["taxa_refin"]) if stats else 0.0,
                                "taxa_portabilidade_atual": float(stats["taxa_portabilidade_atual"]) if stats else 0.0,
                                "weighted_refin": float(stats["weighted_refin"]) if stats else 0.0,
                                "port_adj": float(stats["port_adj"]) if stats else 0.0,
                                "refin_adj": float(stats["refin_adj"]) if stats else 0.0,
                                "taxa_convenio": float(stats["taxa_convenio"]) if stats else 0.0,
                                "valor_liberado": troco,
                                "valor_total_contrato": troco + saldo_devedor,
                                "valor_parcela": parcela_atual,
                                "prazo": target_term,
                                "priority": getattr(banco, 'priority', 99),
                                "elegivel": True
                            })
                        except Exception as e:
                            continue
                    
                    if not tem_coeficiente_valido:
                        motivos_tabelas.append(f"Tabela {tabela.name}: Sem coeficiente para o prazo {prazo_total}")
                
                if not banco_tem_oferta:
                    motivo_final = "Nenhuma tabela compatível."
                    if motivos_tabelas:
                        motivo_final = " | ".join(motivos_tabelas) # Mostra TODOS os motivos
                    
                    rejeitados.append({
                        "banco": banco.name,
                        "bank_id": banco.id,
                        "logo_url": banco.logo_url,
                        "motivo": motivo_final,
                        "elegivel": False
                    })
            except Exception as e:
                continue
        
        # Aplicar Prioridades da Promotora
        for approved in bancos_aprovados:
            for p in p_priority_config:
                if str(p.get('convenio', '')).upper() == str(cliente_input.convenio).upper() and int(p.get('bank_id', 0)) == approved['bank_id']:
                    approved['promotora_priority'] = int(p.get('priority', 99))
                    break
        
        # Mantém todas as tabelas elegíveis de todos os bancos
        # Ordena por prioridade da promotora (se houver), depois prioridade global do banco, e por fim valor liberado
        bancos_aprovados.sort(key=lambda x: (x.get("promotora_priority", 99), x.get("priority", 99), x["valor_liberado"]))
        resultado_final = bancos_aprovados
                
        # 6. Salva a simulação no Banco de Dados
        best_res = resultado_final[0] if resultado_final else None
        
        simulation_data = {
            "user_id": user_id,
            "client_name": str(cliente_input.nome_cliente or "Cliente"),
            "client_cpf": str(getattr(cliente_input, "cpf_cliente", "") or "")[:14],
            "client_age": int(cliente_input.idade or 0),
            "agreement": str(cliente_input.convenio or ""),
            "benefit_species": str(getattr(cliente_input, "especie_beneficio", "") or ""),
            "current_bank": str(cliente_input.banco or ""),
            "debt_balance": float(saldo_devedor),
            "installment_value": float(parcela_atual),
            "current_rate": float(getattr(cliente_input, "taxa_juros", 0.0) or taxa_port_calc),
            "total_term": int(prazo_total),
            "remaining_term": int(prazo_restante),
            "is_60_plus": bool(getattr(cliente_input, "is_60_plus", False)),
            "agreement_rate": float(best_res["taxa_convenio"]) if best_res else 0.0,
            "portability_rate_calculated": float(taxa_port_calc),
            "portability_adjustment": float(best_res["port_adj"]) if best_res else 0.0,
            "new_portability_rate": float(best_res["taxa_portabilidade_atual"]) if best_res else 0.0,
            "weighted_refin_rate": float(best_res.get("weighted_refin", 0.0)) if best_res else 0.0,
            "refin_adjustment": float(best_res.get("refin_adj", 0.0)) if best_res else 0.0,
            "final_refin_rate": float(best_res["taxa_refin"]) if best_res else 0.0,
            "created_at": datetime.utcnow()
        }
        
        try:
            await AdminService.save_simulation(db, simulation_data, resultado_final)
        except Exception as e:
            print(f"ERRO AO SALVAR SIMULAÇÃO: {str(e)}")
            traceback.print_exc()
            # Still return results to the user even if saving failed
            
        return {
            "ofertas": resultado_final,
            "rejeitados": rejeitados,
            "total_bancos_analisados": len(todos_os_bancos),
            "total_aprovados": len(resultado_final),
            "total_rejeitados": len(rejeitados),
            "cliente": {
                "nome": getattr(cliente_input, "nome_cliente", ""),
                "cpf": getattr(cliente_input, "cpf_cliente", ""),
                "idade": int(getattr(cliente_input, "idade", 0)),
                "convenio": getattr(cliente_input, "convenio", ""),
                "banco_originador": getattr(cliente_input, "banco", ""),
                "saldo_devedor": float(saldo_devedor),
                "valor_parcela": float(parcela_atual),
                "prazo_total": int(prazo_total),
                "prazo_restante": int(prazo_restante),
                "taxa_calculada": float(taxa_port_calc)
            }
        }
    except Exception as e:
        print(f"CRITICAL ENGINE ERROR: {str(e)}")
        traceback.print_exc()
        raise e
