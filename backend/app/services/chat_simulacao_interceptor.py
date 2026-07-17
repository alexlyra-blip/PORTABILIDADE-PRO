import re
import json

def _normalize_bank(b_name):
    if not b_name: return ""
    return re.sub(r'[^a-zA-Z0-9]', '', str(b_name).lower())

def first_value(data, *keys, default=None):
    if not isinstance(data, dict):
        return default
    for key in keys:
        value = data.get(key)
        if value is not None and str(value).strip() != "":
            return value
    return default

def safe_float(value, default=0.0):
    if value is None or str(value).strip() == "":
        return default
    if isinstance(value, (int, float)):
        return float(value)
    
    val_str = str(value).upper().replace("R$", "").strip()
    
    if "." in val_str and "," in val_str:
        val_str = val_str.replace(".", "").replace(",", ".")
    elif "," in val_str:
        val_str = val_str.replace(",", ".")
        
    try:
        return float(val_str)
    except:
        return default

def get_banco(o):
    return str(first_value(o, "banco", "banco_normalizado", "nome_banco", default=""))

def get_tabela(o):
    return str(first_value(o, "tabela", "tabela_normalizada", "nome_tabela", default=""))

def get_parcela(o):
    return safe_float(first_value(o, "parcela", "parcela_normalizada", "nova_parcela", "valor_parcela"))

def get_prazo(o):
    v = first_value(o, "prazo", "prazo_normalizado", "prazo_novo")
    if v is None: return None
    try: return int(v)
    except: return None

def get_novo_contrato(o):
    return safe_float(first_value(o, "novo_contrato", "novo_contrato_normalizado", "valor_novo_contrato", "valor_contrato", "valor_total_contrato"))

def get_saldo_devedor(o, c_obj=None):
    val = first_value(o, "saldo_devedor", "quitacao", "saldo")
    if val is not None and str(val).strip() != "":
        return safe_float(val)
    if c_obj:
        val_c = first_value(c_obj, "saldo_devedor", "quitacao", "saldo")
        if val_c is not None and str(val_c).strip() != "":
            return safe_float(val_c)
    return 0.0

def get_taxa(o):
    return safe_float(first_value(o, "taxa", "taxa_normalizada", "taxa_refin", "taxa_refinanciamento", "taxa_juros"))

def get_troco(o):
    return safe_float(first_value(o, "troco", "troco_normalizado", "valor_troco", "valor_liberado"))

def processar_comando_simulacao(session, msg_lower, message):
    contexto = None
    if "ultima_simulacao" in session and isinstance(session["ultima_simulacao"], dict):
        contexto = session["ultima_simulacao"]
    elif "context_data" in session and isinstance(session["context_data"], dict):
        cd = session["context_data"]
        if "ultima_simulacao" in cd:
            contexto = cd["ultima_simulacao"]
        elif "contexto_simulacao" in cd:
            contexto = cd["contexto_simulacao"]
        else:
            contexto = cd
    
    if not contexto and "simulations" in session:
        return _processar_comando_simulacao_antigo(session["simulations"], msg_lower, message)
        
    if not contexto:
        return None
        
    if "possui_ofertas" in contexto and not contexto["possui_ofertas"]:
        wants_tables = "tabela" in msg_lower or "tabelas" in msg_lower
        if wants_tables:
            return "Nenhuma oferta disponível nesta simulação."
        return None

    if "regra" in msg_lower:
        return None

    beneficios = contexto.get("beneficios", [])
    all_contracts = []
    for b in beneficios:
        for c in b.get("contratos", []):
            if c.get("melhor_oferta") or c.get("tabelas_banco_recomendado") or c.get("tabelas_alternativas") or c.get("ofertas_por_banco"):
                all_contracts.append((b, c))
                
    if not all_contracts:
        wants_tables = "tabela" in msg_lower or "tabelas" in msg_lower
        if wants_tables:
            return "Nenhuma oferta disponível nesta simulação."
        return None

    structured_input = None
    if isinstance(message, str) and message.strip().startswith("{") and message.strip().endswith("}"):
        try:
            structured_input = json.loads(message)
        except Exception:
            pass

    requested_bank = None
    requested_term = None
    b_idx = None
    c_idx = None
    wants_tables = "tabela" in msg_lower or "tabelas" in msg_lower
    resolved_contract = None

    if structured_input:
        intent = structured_input.get("intent")
        requested_bank = structured_input.get("banco")
        requested_term = structured_input.get("prazo")
        b_idx = structured_input.get("beneficio")
        c_idx = structured_input.get("contrato")
        wants_tables = (intent == "consultar_tabelas")
        if intent == "consultar_regras" or "regra" in str(intent).lower():
            return None
    else:
        pending = session.get("pending_intent")
        if not pending and "context_data" in session and isinstance(session["context_data"], dict):
            pending = session["context_data"].get("pending_intent")

        if pending:
            clean_choice = msg_lower.strip()
            opcoes = pending.get("opcoes", [])
            
            if clean_choice.isdigit():
                idx = int(clean_choice) - 1
                if 0 <= idx < len(opcoes):
                    resolved_contract = opcoes[idx]
            else:
                match = re.search(r'b(\d+)\s*c(\d+)', clean_choice)
                if match:
                    b_val = int(match.group(1))
                    c_val = int(match.group(2))
                    for opt in opcoes:
                        if opt.get("b_idx") == b_val and opt.get("c_idx") == c_val:
                            resolved_contract = opt
                            break
            
            if resolved_contract:
                session.pop("pending_intent", None)
                if "context_data" in session and isinstance(session["context_data"], dict):
                    session["context_data"].pop("pending_intent", None)
                
                requested_bank = pending.get("banco")
                requested_term = pending.get("prazo")
                wants_tables = (pending.get("intent") == "consultar_tabelas")
                b_idx = resolved_contract.get("b_idx")
                c_idx = resolved_contract.get("c_idx")
            else:
                if not clean_choice.isdigit() and not re.search(r'b(\d+)\s*c(\d+)', clean_choice):
                    session.pop("pending_intent", None)
                    if "context_data" in session and isinstance(session["context_data"], dict):
                        session["context_data"].pop("pending_intent", None)

    if not resolved_contract and not structured_input:
        term_match = re.search(r'\b(84|96|108)\s*(?:x|meses?)?\b', msg_lower, flags=re.IGNORECASE)
        if term_match:
            requested_term = int(term_match.group(1))
            
        all_banks = set()
        for _, c in all_contracts:
            br = c.get("banco_recomendado")
            if br: all_banks.add(br)
            opb = c.get("ofertas_por_banco", {})
            if isinstance(opb, dict):
                for k in opb.keys():
                    all_banks.add(k)
                    
        sorted_all_banks = sorted(list(all_banks), key=len, reverse=True)
        for b in sorted_all_banks:
            if _normalize_bank(b) in _normalize_bank(msg_lower):
                requested_bank = b
                break

        b_match = re.search(r'b(\d+)', msg_lower)
        c_match = re.search(r'c(\d+)', msg_lower)
        if b_match and c_match:
            b_idx = int(b_match.group(1))
            c_idx = int(c_match.group(1))

    if not wants_tables and not requested_bank and not requested_term and not resolved_contract and not structured_input:
        return None

    target_contract_tuple = None
    if b_idx is not None and c_idx is not None:
        for b, c in all_contracts:
            if b.get("indice_beneficio") == b_idx and c.get("indice_contrato") == c_idx:
                target_contract_tuple = (b, c)
                break
    else:
        if len(all_contracts) == 1:
            target_contract_tuple = all_contracts[0]
        else:
            display_bank = requested_bank
            if not display_bank:
                display_bank = all_contracts[0][1].get("banco_recomendado")
                
            banco_display = str(display_bank or "banco").upper()
            
            opcoes = [
                {"b_idx": b.get("indice_beneficio"), "c_idx": c.get("indice_contrato"), "label": f"Benefício {b.get('indice_beneficio')} / Contrato {c.get('indice_contrato')}"}
                for b, c in all_contracts
            ]
            
            linhas_opcoes = []
            for indice, opcao in enumerate(opcoes, start=1):
                beneficio = (
                    opcao.get("beneficio")
                    or opcao.get("indice_beneficio")
                    or opcao.get("b_idx")
                    or "-"
                )
                contrato = (
                    opcao.get("contrato")
                    or opcao.get("indice_contrato")
                    or opcao.get("c_idx")
                    or "-"
                )
                linhas_opcoes.append(
                    f"*{indice} - Benefício {beneficio} / Contrato {contrato}*"
                )
            
            reply = (
                f"🏦 *Encontrei ofertas do {banco_display} para mais de um contrato.*\n\n"
                f"📋 *Qual opção deseja consultar?*\n\n"
                + "\n".join(linhas_opcoes)
                + "\n\n"
                + "Responda apenas com o número da opção desejada. 👩🏻💻"
            )
            
            intent_type = "consultar_tabelas" if wants_tables else "consultar_banco"
            pending_data = {
                "intent": intent_type,
                "banco": requested_bank or display_bank,
                "prazo": requested_term,
                "opcoes": opcoes
            }
            session["pending_intent"] = pending_data
            if "context_data" in session and isinstance(session["context_data"], dict):
                session["context_data"]["pending_intent"] = pending_data
                
            return reply

    if not target_contract_tuple:
        if wants_tables:
            return "Nenhuma oferta disponível nesta simulação."
        return None

    b_obj, c_obj = target_contract_tuple
    recommended_bank = c_obj.get("banco_recomendado")
    
    target_bank = requested_bank or recommended_bank
    if not target_bank:
        if wants_tables:
            return "Nenhuma oferta disponível nesta simulação."
        return None

    is_recommended = _normalize_bank(target_bank) == _normalize_bank(recommended_bank)
    
    ofertas_brutas = []
    if is_recommended:
        ofertas_brutas = c_obj.get("tabelas_banco_recomendado")
        if not ofertas_brutas:
            ofertas_brutas = c_obj.get("tabelas_alternativas", [])
    else:
        opb = c_obj.get("ofertas_por_banco", {})
        for k, v in opb.items():
            if _normalize_bank(k) == _normalize_bank(target_bank):
                ofertas_brutas = v
                break

    if not ofertas_brutas:
        return f"Nenhuma tabela encontrada para {target_bank} neste contrato."

    oferta_apresentada = c_obj.get("melhor_oferta")
    nome_apresentada = c_obj.get("tabela_apresentada")
    
    ofertas_validas = []
    for o in ofertas_brutas:
        if wants_tables and is_recommended and oferta_apresentada and nome_apresentada:
            same_tabela = get_tabela(o).lower() == str(nome_apresentada).lower()
            same_prazo = get_prazo(o) == get_prazo(oferta_apresentada)
            same_troco = abs(get_troco(o) - get_troco(oferta_apresentada)) < 0.01
            same_bank = _normalize_bank(get_banco(o)) == _normalize_bank(get_banco(oferta_apresentada))
            
            if same_tabela and same_prazo and same_troco and same_bank:
                continue 
        ofertas_validas.append(o)

    prazos_disponiveis = sorted(list(set([get_prazo(o) for o in ofertas_validas if get_prazo(o)])))

    if requested_term:
        filtradas_prazo = [o for o in ofertas_validas if get_prazo(o) == requested_term]
        if not filtradas_prazo:
            prazos_str = " e ".join([f"{p}X" for p in prazos_disponiveis]) if prazos_disponiveis else "nenhum"
            if not prazos_disponiveis:
                return f"Não existem outras tabelas para {target_bank} neste contrato."
            
            resposta_prazo_indisponivel = (
                f"Não encontrei outras tabelas de {requested_term} meses da {target_bank} para este contrato.\n\n"
                f"Prazos disponíveis: {prazos_str}.\n\n"
                f"Você pode digitar:\n"
            )
            for p in prazos_disponiveis:
                resposta_prazo_indisponivel += f"TABELAS {p}X {str(target_bank).upper()}\n"
            return resposta_prazo_indisponivel.strip()
        ofertas_validas = filtradas_prazo

    if not ofertas_validas:
        return f"Não existem outras tabelas disponíveis para {target_bank}."

    if wants_tables:
        ofertas_validas.sort(key=lambda x: (
            get_prazo(x) or 999,
            get_troco(x),
            get_taxa(x),
            get_parcela(x)
        ))
        
        qty_total = len(ofertas_validas)
        limite = 5
        ofertas_exibidas = ofertas_validas[:limite]
        
        reply = f"📊 *Outras Tabelas para {target_bank}:*\n\n"
        for idx, o in enumerate(ofertas_exibidas, 1):
            _banco = get_banco(o) or target_bank
            _tabela = get_tabela(o)
            _parcela = get_parcela(o)
            _prazo = get_prazo(o)
            _novo_contrato = get_novo_contrato(o)
            _saldo_devedor = get_saldo_devedor(o, c_obj)
            _taxa = get_taxa(o)
            _troco = get_troco(o)

            reply += (
                f"🏦 *Banco:* {_banco}\n"
                f"🏷️ *Tabela:* {_tabela}\n"
                f"💵 *Nova Parcela:* R$ {_parcela:.2f}\n"
                f"📅 *Prazo:* {_prazo}x\n"
                f"✍️ *Novo Contrato:* R$ {_novo_contrato:.2f}\n"
                f"🏦 *Saldo Devedor:* R$ {_saldo_devedor:.2f}\n"
                f"📈 *Taxa:* {_taxa}%\n"
                f"💰 *Troco:* R$ {_troco:.2f}\n\n"
            )
        if qty_total > limite:
            reply += f"Existem mais {qty_total - limite} tabela(s) disponíveis."
        return reply.strip()
    else:
        if is_recommended and c_obj.get("melhor_oferta"):
            best_offer = c_obj.get("melhor_oferta")
        else:
            ofertas_ordenadas_para_melhor = sorted(ofertas_validas, key=lambda x: (
                -get_troco(x),
                get_taxa(x),
                get_parcela(x)
            ))
            best_offer = ofertas_ordenadas_para_melhor[0]
            
        _banco = get_banco(best_offer) or target_bank
        _tabela = get_tabela(best_offer)
        _parcela = get_parcela(best_offer)
        _prazo = get_prazo(best_offer)
        _novo_contrato = get_novo_contrato(best_offer)
        _taxa = get_taxa(best_offer)
        _troco = get_troco(best_offer)

        reply = (
            f"⭐ *OFERTA SELECIONADA: {_banco}*\n\n"
            "📋 *DETALHES DA OPERAÇÃO:*\n"
            f"• 🏷️ *Tabela:* {_tabela}\n"
            f"• 💵 *Valor da Parcela:* R$ {_parcela:.2f}\n"
            f"• 📅 *Prazo:* {_prazo} meses\n"
            f"• ✍️ *Novo Contrato:* R$ {_novo_contrato:.2f}\n"
            f"• 📈 *Taxa do Refin:* {_taxa}% a.m.\n\n"
            f"💰 *VALOR DO TROCO ESTIMADO LIBERADO: R$ {_troco:.2f}* 🤑\n\n"
            "Deseja ver *outras tabelas* para este banco? Ou digite 'encerrar'."
        )
        return reply

def _processar_comando_simulacao_antigo(simulations, msg_lower, message):
    wants_tables = "tabela" in msg_lower or "tabelas" in msg_lower or "outras tabelas" in msg_lower
    if not simulations:
        if wants_tables:
            return "Não encontrei uma simulação ativa neste atendimento. Envie o CPF para realizar uma nova análise."
        return None
    if "regra" in msg_lower:
        return None
    b_match = re.search(r'b(\d+)', msg_lower)
    c_match = re.search(r'c(\d+)', msg_lower)
    target_sim = None
    if b_match and c_match:
        b_idx = int(b_match.group(1))
        c_idx = int(c_match.group(1))
        for sim in simulations:
            if sim.get("b_idx") == b_idx and sim.get("c_idx") == c_idx:
                target_sim = sim
                break
    elif len(simulations) == 1:
        target_sim = simulations[0]
        
    term_match = re.search(r'\b(84|96|108)\s*(?:x|meses?)?\b', msg_lower, flags=re.IGNORECASE)
    requested_term = int(term_match.group(1)) if term_match else None
    
    all_banks = set()
    for sim in simulations:
        for o in sim.get("ofertas", []):
            all_banks.add(o.get("banco", ""))
            
    requested_bank = None
    for b in all_banks:
        b_norm = re.sub(r'[^a-zA-Z0-9]', '', str(b).lower())
        m_norm = re.sub(r'[^a-zA-Z0-9]', '', msg_lower)
        if b_norm in m_norm:
            requested_bank = b
            break
            
    if not wants_tables and not requested_bank and not requested_term:
        return None
        
    if not target_sim:
        if len(simulations) > 1:
            return "Para qual benefício e contrato deseja consultar? Exemplo: B1 C1."
        else:
            return None
            
    ofertas = target_sim.get("ofertas", [])
    if not ofertas:
        return "Nenhuma oferta disponível nesta simulação."
        
    recommended_bank = str(ofertas[0].get("banco", "")).lower()
    
    target_bank = requested_bank or ofertas[0].get("banco", "")
    
    bank_offers = [o for o in ofertas if str(o.get("banco", "")).lower() == str(target_bank).lower()]
    
    if not bank_offers:
        return f"Nenhuma tabela encontrada para {target_bank} neste contrato."
        
    if wants_tables and str(target_bank).lower() == recommended_bank:
        if len(bank_offers) > 1:
            bank_offers = bank_offers[1:]
        elif requested_term and bank_offers[0].get("prazo") != requested_term:
            pass
        else:
            return f"Não existem outras tabelas disponíveis para {target_bank}."
            
    if requested_term:
        filtered_by_term = [o for o in bank_offers if o.get("prazo") == requested_term]
        if not filtered_by_term:
            return f"Não encontrei tabelas de {requested_term}X para {target_bank}."
        bank_offers = filtered_by_term
        
    # Sort for old simulation logic
    bank_offers_sorted = sorted(bank_offers, key=lambda x: (
        -float(x.get("valor_liberado", 0)),
        float(x.get("taxa_juros", 99)),
        float(x.get("valor_parcela", 9999))
    ))
    
    if wants_tables:
        reply = f"📊 *Outras Tabelas para {target_bank}:*\n\n"
        for idx, o in enumerate(bank_offers[:5], 1):
            reply += (
                f"{idx}️⃣ *{o.get('tabela')}*\n"
                f"• Prazo: {o.get('prazo')}x\n"
                f"• Parcela: R$ {o.get('valor_parcela', 0):.2f}\n"
                f"• Troco: R$ {o.get('valor_liberado', 0):.2f}\n"
                f"• Taxa: {o.get('taxa_juros', 0)}%\n\n"
            )
        if len(bank_offers) > 5:
            reply += f"Existem mais {len(bank_offers)-5} tabela(s) disponíveis."
        return reply.strip()
    else:
        best_offer = bank_offers_sorted[0]
        qty_tabelas = len([o for o in bank_offers if o.get("prazo") == best_offer.get("prazo")])
        
        reply = (
            f"⭐ *OFERTA SELECIONADA: {best_offer.get('banco')}*\n"
            f"📊 {qty_tabelas} tabela(s) de {best_offer.get('prazo')} meses da {best_offer.get('banco')} disponível(is)\n\n"
            "📋 *DETALHES DA OPERAÇÃO:*\n"
            f"• 🏷️ *Tabela:* {best_offer.get('tabela')}\n"
            f"• 💵 *Valor da Parcela:* R$ {best_offer.get('valor_parcela', 0):.2f}\n"
            f"• 📅 *Prazo:* {best_offer.get('prazo')} meses\n"
            f"• ✍️ *Novo Contrato:* R$ {best_offer.get('valor_total_contrato', 0):.2f}\n"
            f"• 📈 *Taxa do Refin:* {best_offer.get('taxa_juros', 0)}% a.m.\n\n"
            f"💰 *VALOR DO TROCO ESTIMADO LIBERADO: R$ {best_offer.get('valor_liberado', 0):.2f}* 🤑\n\n"
            "Deseja ver *outras tabelas* para este banco? Ou digite 'encerrar'."
        )
        return reply
