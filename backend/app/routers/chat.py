import google.generativeai as genai
import asyncio
import httpx
import os
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db, AsyncSessionLocal
from app.services.admin_service import AdminService
from app.services.simulador_service import SimuladorService
from app.services.margem_service import calcular_valor_liberado_margem
from app.models.models import SimulacaoInput
from app.models.sqlalchemy_models import Bank, User, WhatsappChatLog
from datetime import datetime, timezone, timedelta
import os
import aiohttp
from app.routers.pdf_extractor import PdfExtractorService
from app.routers.deps import verify_n8n_internal_key
from pydantic import BaseModel
from typing import Optional
import re
import json

router = APIRouter()

# In-memory storage for chat sessions
# Key: sender (e.g. WhatsApp number), Value: Dict of state/data
CHAT_SESSIONS = {}
SENDER_LOCKS = {}

# Mapeamento oficial de códigos de bancos de origem
BANCOS_ORIGEM_MAP = {
    "001": "BANCO DO BRASIL",
    "003": "BANCO DA AMAZÔNIA",
    "004": "BANCO DO NORDESTE",
    "012": "BANCO INBURSA",
    "021": "BANESTES",
    "024": "BANCO BANDEPE",
    "025": "BANCO ALFA",
    "027": "BESC",
    "029": "ITAÚ CONSIGNADO",
    "033": "SANTANDER",
    "036": "BRADESCO BBI",
    "037": "BANPARÁ",
    "041": "BANRISUL",
    "047": "BANESE",
    "062": "HIPERCARD",
    "063": "BANCO IBI",
    "065": "LEMON BANK",
    "066": "BANCO MORGAN STANLEY",
    "069": "BANCO CREFISA",
    "070": "BRB",
    "074": "BANCO SAFRA",
    "075": "BANCO ABN AMRO",
    "077": "BANCO INTER",
    "078": "BES",
    "079": "JBS BANCO",
    "082": "TOPAZIO",
    "083": "BANCO DA CHINA",
    "084": "UNIPRIME",
    "085": "CECRED",
    "088": "BANCO RANDON",
    "094": "BANCO FINAXIS",
    "095": "TRAVELEX BANCO",
    "096": "BANCO BMF",
    "097": "CREDISIS",
    "099": "UNIPRIME CENTRAL",
    "104": "CAIXA ECONÔMICA FEDERAL",
    "107": "BBM",
    "119": "WESTERN UNION",
    "120": "BANCO RODOBENS",
    "121": "BANCO AGIBANK",
    "125": "BANCO GENIAL",
    "132": "ICBC DO BRASIL",
    "136": "UNICRED",
    "149": "FACTA FINANCEIRA",
    "163": "COMMERZBANK BRASIL",
    "173": "BRL TRUST",
    "184": "BANCO ITAÚ BBA",
    "197": "STONE PAGAMENTOS",
    "208": "BANCO BTG PACTUAL",
    "212": "BANCO ORIGINAL",
    "213": "BANCO ARBI",
    "217": "BANCO JOHN DEERE",
    "218": "BANCO BS2",
    "222": "BANCO CRÉDIT AGRICOLE",
    "224": "BANCO FIBRA",
    "230": "UNICARD",
    "233": "BANCO CIFRA",
    "237": "BRADESCO",
    "241": "BANCO CLÁSSICO",
    "243": "BANCO MÁXIMA",
    "246": "BANCO ABC BRASIL",
    "249": "BANCO INVESTCRED UNIBANCO",
    "250": "BANCO SCHAHIN",
    "254": "PARANÁ BANCO",
    "263": "BANCO CACIQUE",
    "265": "BANCO FATOR",
    "266": "BANCO CÉDULA",
    "290": "PAGBANK (PAGSEGURO)",
    "318": "BANCO BMG",
    "320": "BANCO CCB BRASIL",
    "341": "ITAÚ UNIBANCO",
    "356": "BANCO REAL",
    "366": "BANCO SOCIÉTÉ GÉNÉRALE",
    "370": "BANCO MIZUHO",
    "376": "BANCO JP MORGAN",
    "389": "BANCO MERCANTIL DO BRASIL",
    "394": "BANCO BMC",
    "399": "HSBC BANK BRASIL",
    "409": "UNIBANCO",
    "412": "BANCO CAPITAL",
    "422": "BANCO SAFRA",
    "453": "BANCO RURAL",
    "456": "BANCO TOKYO-MITSUBISHI",
    "464": "BANCO SUMITOMO",
    "473": "BANCO CAIXA GERAL",
    "477": "CITIBANK",
    "479": "BANCO ITAÚ BBA",
    "487": "DEUTSCHE BANK",
    "488": "JPMORGAN CHASE",
    "492": "ING BANK",
    "505": "BANCO CREDIT SUISSE",
    "600": "BANCO LUSO BRASILEIRO",
    "604": "BANCO INDUSTRIAL DO BRASIL",
    "610": "BANCO VR",
    "611": "BANCO PAULISTA",
    "612": "BANCO GUANABARA",
    "613": "BANCO PECÚNIA",
    "623": "BANCO PAN",
    "626": "BANCO C6 CONSIG",
    "630": "BANCO INTERCAP",
    "633": "BANCO RENDIMENTO",
    "634": "BANCO TRIÂNGULO",
    "637": "BANCO SOFISA",
    "638": "BANCO PROSPER",
    "641": "BANCO ALVORADA",
    "643": "BANCO PINE",
    "652": "ITAÚ UNIBANCO HOLDING",
    "653": "BANCO INDUSVAL",
    "654": "BANCO A.J. RENNER",
    "655": "BANCO VOTORANTIM",
    "707": "BANCO DAYCOVAL",
    "739": "BANCO CETELEM",
    "741": "BANCO RIBEIRÃO PRETO",
    "743": "BANCO SEMEAR",
    "745": "BANCO CITIBANK",
    "746": "BANCO MODAL",
    "747": "BANCO RABOBANK",
    "748": "SICREDI",
    "751": "SCOTIABANK BRASIL",
    "752": "BANCO BNP PARIBAS",
    "755": "BANK OF AMERICA MERRILL LYNCH",
    "756": "SICOOB",
    "757": "BANCO KEB HANA"
}

class ChatMessageInput(BaseModel):
    sender: str
    message: Optional[str] = ""
    pdf_url: Optional[str] = None

class GarantirProtocoloInput(BaseModel):
    sender: str
    pushName: Optional[str] = None
    
class SalvarContextoInput(BaseModel):
    sender: str
    protocolo: Optional[str] = None
    contexto_simulacao: dict

def normalize_phone(phone_str: str) -> str:
    if not phone_str:
        return ""
    # If there is a '@s.whatsapp.net' or companion device suffix like ':76', strip them first
    # e.g. "558191283133:76@s.whatsapp.net" -> "558191283133"
    cleaned = phone_str.split("@")[0].split(":")[0]
    # keep only digits
    digits = "".join(c for c in cleaned if c.isdigit())
    # remove leading 0 if present (e.g. 081991283133 -> 81991283133)
    if digits.startswith("0") and len(digits) >= 10:
        digits = digits[1:]
    # remove leading 55 if present and length is 10 or more
    if digits.startswith("55") and len(digits) >= 10:
        digits = digits[2:]
    return digits

def normalize_sender(sender: str) -> str:
    if not sender:
        return ""
    # Split by @ first to remove domain, then split by : to remove device suffix
    part = sender.split('@')[0].split(':')[0]
    return re.sub(r'[^\d]', '', part)

def normalize_convenio(text: str) -> Optional[str]:
    if not text:
        return None
    t = text.lower().replace("convênio", "").replace("convenio", "").strip()
    if t in ["1", "inss"]:
        return "INSS"
    if t in ["2", "siape"]:
        return "SIAPE"
    if t in ["3", "governo", "gov", "gov est", "gov_est"]:
        return "GOVERNO"
    if t in ["4", "forças armadas", "forcas armadas", "forças", "forcas"]:
        return "FORÇAS ARMADAS"
    if t in ["5", "clt privado", "clt_privado", "clt", "privado"]:
        return "CLT PRIVADO"
    return None

def phones_match(phone1: str, phone2: str) -> bool:
    norm1 = normalize_phone(phone1)
    norm2 = normalize_phone(phone2)
    if not norm1 or not norm2:
        return False
    if norm1 == norm2:
        return True
    # Brazilian number match logic: check last 8 digits and the 2 digits of DDD before them
    if len(norm1) >= 10 and len(norm2) >= 10:
        ddd1 = norm1[:2]
        ddd2 = norm2[:2]
        last8_1 = norm1[-8:]
        last8_2 = norm2[-8:]
        return ddd1 == ddd2 and last8_1 == last8_2
    return False

def parse_float(msg: str) -> Optional[float]:
    clean = msg.replace("R$", "").replace("r$", "").strip()
    if "," in clean and "." in clean:
        if clean.find(".") < clean.find(","):
            clean = clean.replace(".", "")
    clean = clean.replace(",", ".")
    match = re.search(r'\d+(?:\.\d+)?', clean)
    if match:
        return float(match.group())
    return None

def parse_integer(msg: str) -> Optional[int]:
    match = re.search(r'\d+', msg)
    if match:
        return int(match.group())
    return None

async def query_rules(message: str, db: AsyncSession, user_id: int = None) -> Optional[str]:
    # Fetch all banks
    banks = await AdminService.get_all_banks(db)
    msg = message.lower().strip()
    
    if "analfabeto" in msg or "analfabetos" in msg:
        accepting = []
        for b in banks:
            for r in b.rules:
                if r.accepts_illiterate:
                    accepting.append(b.name)
                    break
        return "🏦 *Bancos que aceitam clientes analfabetos:*\n" + "\n".join(f"• {name}" for name in list(set(accepting)))
        
    elif "invalidez" in msg:
        rules_text = []
        for b in banks:
            for r in b.rules:
                if r.accepts_disability:
                    rules_text.append(f"• *{b.name}*: Aceita Invalidez (Idade Mín: {r.disability_min_age or 'N/A'}, Máx: {r.disability_max_age or 'N/A'}, Isenção DIB: {r.disability_grace_age or 'N/A'})")
                    break
        return "♿ *Regras para Invalidez por Banco:*\n" + "\n".join(rules_text)
        
    elif "loas" in msg:
        rules_text = []
        for b in banks:
            for r in b.rules:
                if r.accepts_loas:
                    rules_text.append(f"• *{b.name}*: Aceita LOAS")
                    break
        return "👵 *Bancos que aceitam LOAS:*\n" + "\n".join(rules_text)
        
    elif "idade" in msg:
        rules_text = []
        for b in banks:
            for r in b.rules:
                rules_text.append(f"• *{b.name}* ({r.agreement}): De {r.min_age or 0} a {r.max_age or 100} anos (Prazo Máx: {r.max_term or 'N/A'} m)")
        return "📅 *Regras de Idade por Banco/Convênio (Amostra):*\n" + "\n".join(rules_text[:12])

    # Check specific bank rule matching
    search_msg = msg.replace("regras do ", "").replace("regra do ", "").replace("regras da ", "").replace("banco ", "").strip()
    matched_bank = None
    for b in banks:
        b_name = b.name.lower()
        if search_msg in b_name or b_name in search_msg:
            matched_bank = b
            break
            
    if matched_bank:
        from app.models.sqlalchemy_models import BankTable, User, PromotoraRule
        
        # Obter os prazos das tabelas para o banco
        tables_res = await db.execute(select(BankTable).where(BankTable.bank_id == matched_bank.id, BankTable.active == True))
        tables = tables_res.scalars().all()
        
        # Obter Regras da Promotora se user_id estiver disponível
        promotora_min_paid = {}
        if user_id:
            user_res = await db.execute(select(User).where(User.id == user_id))
            user_obj = user_res.scalar_one_or_none()
            promotora_id = user_obj.broker_id if (user_obj and user_obj.role != 'promotora' and user_obj.broker_id) else user_id

            rules_res = await db.execute(select(PromotoraRule).where(PromotoraRule.promotora_id == promotora_id))
            for p_rule in rules_res.scalars().all():
                if p_rule.rule_key == 'origin_bank_config':
                    try:
                        cfg_list = json.loads(p_rule.rule_value)
                        for cfg in cfg_list:
                            if int(cfg.get('bank_id', 0)) == matched_bank.id:
                                promotora_min_paid[cfg.get('convenio', 'ALL')] = cfg.get('min_installments_paid', 0)
                    except:
                        pass
        
        rules_text = []
        for r in matched_bank.rules:
            # Filtrar prazos específicos deste convênio
            prazos = sorted(list(set(
                t.term for t in tables 
                if t.term and (
                    not t.agreement 
                    or r.agreement.upper() in t.agreement.upper() 
                    or t.agreement.upper() in r.agreement.upper()
                )
            )))
            prazos_str = " e ".join([f"{p}X" for p in prazos]) if prazos else "Não informados"
            
            invalidez_str = "NÃO"
            if r.accepts_disability:
                inv_parts = []
                if r.disability_min_age:
                    inv_parts.append(f"Idade Mínima: {r.disability_min_age} anos")
                if r.disability_max_age:
                    inv_parts.append(f"até {r.disability_max_age}")
                if r.disability_min_benefit_years or r.disability_min_benefit_months:
                    y = r.disability_min_benefit_years or 0
                    m = r.disability_min_benefit_months or 0
                    inv_parts.append(f"Tempo de Benefício {y} Anos e {m} Meses")
                invalidez_str = "SIM (" + ", ".join(inv_parts) + ")" if inv_parts else "SIM"
                
            bancos_nao_aceitos_str = "Nenhum"
            if r.excluded_origin_banks:
                try:
                    from app.routers.chat import BANCOS_ORIGEM_MAP
                    blocked_codes = [c.strip() for c in r.excluded_origin_banks.split(",") if c.strip()]
                    blocked_parts = []
                    for code in blocked_codes:
                        name = BANCOS_ORIGEM_MAP.get(code.zfill(3), BANCOS_ORIGEM_MAP.get(code, code))
                        blocked_parts.append(name)
                    if blocked_parts:
                        bancos_nao_aceitos_str = ", ".join(blocked_parts)
                except:
                    bancos_nao_aceitos_str = r.excluded_origin_banks
                
            bancos_min_pagas_str = "Nenhuma"
            if r.origin_banks_min_paid:
                try:
                    min_paid_data = json.loads(r.origin_banks_min_paid)
                    parts = []
                    from app.routers.chat import BANCOS_ORIGEM_MAP
                    if isinstance(min_paid_data, dict):
                        for k, v in min_paid_data.items():
                            parts.append(f"\n- {k} ({v} pagas);")
                    else:
                        for rule in min_paid_data:
                            ob_id = str(rule.get('origin_bank_id'))
                            ob_name = BANCOS_ORIGEM_MAP.get(ob_id.zfill(3), BANCOS_ORIGEM_MAP.get(ob_id, f"Banco {ob_id}"))
                            parts.append(f"\n- {ob_name} ({rule.get('min_paid')} pagas);")
                    if parts:
                        bancos_min_pagas_str = "".join(parts)
                except:
                    pass
                    
            p_val = promotora_min_paid.get(r.agreement, promotora_min_paid.get('ALL'))
            promotora_str = f"{p_val} pagas" if p_val else "Sem regra específica"

            invalidez_e_loas = ""
            if r.agreement and "INSS" in r.agreement.upper():
                invalidez_e_loas = (
                    f"♿ Aceita Invalidez: {invalidez_str}\n"
                    f"🚫 Benefício não atendido: {r.excluded_benefit_types or 'Nenhum'}\n"
                )

            rules_text.append(
                f"🔹 *Regras para {r.agreement}*\n\n"
                f"👤 Idade: De {r.min_age or 0} a {r.max_age or 100} anos\n"
                f"📆 Prazos: {prazos_str}\n"
                f"{invalidez_e_loas}"
                f"✍️ Aceita Analfabeto: {'SIM' if r.accepts_illiterate else 'NÃO'}\n"
                f"👴 Aceita 60+: {'SIM' if r.accepts_60_plus else 'NÃO'}\n"
                f"💵 Parcela Mínima: R$ {r.min_installment_value or '0.00'}\n"
                f"💰 Troco Mínimo: R$ {r.min_release_amount or '0.00'}\n"
                f"🏦 Saldo Mínimo: R$ {r.min_debt_balance or '0.00'}\n"
                f"📉 Taxa Mínima Portabilidade: {r.portability_rate_threshold or '0.00'}%\n"
                f"📉 Taxa Mínima Refin/Port: {r.refin_portability_rate_threshold or '0.00'}%\n"
                f"❌ Bancos Não Portados: {bancos_nao_aceitos_str}\n"
                f"📑 Bancos com Regras Específicas: {bancos_min_pagas_str}\n"
                f"🏢 Regra da Promotora: {promotora_str}"
            )
        if rules_text:
            return f"🏛️ *{matched_bank.name}*\n\n" + "\n\n━━━━━━━━━━━━━━━\n\n".join(rules_text)
        else:
            return f"O banco {matched_bank.name} está cadastrado, mas não possui regras configuradas."

    return None

async def run_simulation_and_respond(session: dict, db: AsyncSession, user_id: int, compact: bool = False, b_idx: int = 1, c_idx: int = 1, is_manual: bool = False) -> str:
    try:
        # Convert and construct inputs
        input_data = SimulacaoInput(
            banco=session.get("banco_origem", ""),
            convenio=session.get("convenio", ""),
            idade=max(parse_integer(str(session.get("idade", 50))) or 50, 18),
            parcela=max(parse_float(str(session.get("parcela", 0))) or 1.0, 1.0),
            saldo_devedor=max(parse_float(str(session.get("saldo_devedor", 0))) or 1.0, 1.0),
            total_term=max(parse_integer(str(session.get("total_term", 84))) or 84, 1),
            remaining_term=max(parse_integer(str(session.get("remaining_term", 60))) or 60, 1),
            analfabeto=session.get("analfabeto", "não") == "sim",
            especie_beneficio=session.get("benefit_species"),
            valor_margem_negativa=max(parse_float(str(session.get("valor_margem_negativa", "0"))) or 0.0, 0.0),
            nome_cliente="Cliente WhatsApp"
        )
        
        res = await SimuladorService.executar(input_data, db, user_id=user_id)
        session["last_result"] = res
        
        if is_manual or "simulations" not in session:
            session["simulations"] = []
            
        session["simulations"].append({
            "b_idx": b_idx,
            "c_idx": c_idx,
            "input_data": input_data.dict(),
            "ofertas": res.get("ofertas", []),
            "rejeitados": res.get("rejeitados", [])
        })
        
        ofertas = res.get("ofertas", [])
        
        if not ofertas:
            rejeitados = res.get("rejeitados", [])
            motivos = "\n".join(f"• *{r['banco']}*: {r['motivo']}" for r in rejeitados[:3])
            session["state"] = "idle"
            return (
                "❌ *Nenhuma oferta aprovada para este contrato.*\n"
                f"Motivos principais:\n{motivos}\n"
            )
            
        # Lógica para "Melhor Tabela" pedida pelo cliente:
        # Priorizar tabelas com prazo 108, mas SEMPRE respeitando a prioridade da promotora/banco (que já vem do motor).
        # O motor já envia 'ofertas' ordenadas por: admin_priority -> promotora_priority -> priority -> -valor_liberado
        first_tables_by_bank = []
        banks_seen = set()
        for o in ofertas:
            if o["banco"] not in banks_seen:
                banks_seen.add(o["banco"])
                first_tables_by_bank.append(o)
                
        # Ordena apenas para jogar prazos 108 para cima, MAS preservando a ordem relativa original do motor
        # Python 'sort' is stable, so sorting by a boolean keeps the original priority order for ties.
        first_tables_by_bank.sort(key=lambda x: x.get("prazo") != 108)
        best_offer = first_tables_by_bank[0]
        
        session["active_bank"] = best_offer["banco"]
        
        qty_tabelas = len([o for o in ofertas if o["banco"].lower() == best_offer["banco"].lower() and o.get("prazo") == best_offer.get("prazo")])
        
        other_banks = list(set(o["banco"] for o in ofertas if o["banco"].lower() != best_offer["banco"].lower()))
        other_banks_str = ", ".join(other_banks) if other_banks else "Nenhum"
        
        if compact:
            reply = (
                f"⭐ *MELHOR OFERTA: {best_offer['banco']}*\n"
                f"📊 {qty_tabelas} tabela(s) de {best_offer['prazo']} meses da {best_offer['banco']} disponível(is)\n\n"
                f"• 🏷️ *Tabela:* {best_offer['tabela']}\n"
                f"• 💵 *Parcela:* R$ {best_offer['valor_parcela']:.2f}\n"
                f"• 📅 *Prazo:* {best_offer['prazo']} meses\n"
                f"• ✍️ *Novo Contrato:* R$ {best_offer['valor_total_contrato']:.2f}\n"
                f"• 🏦 *Saldo Devedor:* R$ {float(session['saldo_devedor']):.2f}\n"
                f"• 📈 *Taxa:* {best_offer['taxa_juros']}% a.m.\n\n"
                f"💰 *TROCO LIBERADO: R$ {best_offer['valor_liberado']:.2f}* 🤑\n\n"
                f"🏛️ *Outros bancos:* {other_banks_str}\n"
            )
        else:
            reply = (
                "🎉 *Excelente notícia! Simulação concluída com sucesso!* 🚀\n\n"
                f"⭐ *MELHOR OFERTA (Maior Rentabilidade): {best_offer['banco']}*\n"
                f"📊 {qty_tabelas} tabela(s) de {best_offer['prazo']} meses da {best_offer['banco']} disponível(is)\n\n"
                "📋 *DETALHES DA OPERAÇÃO:*\n"
                f"• 🏷️ *Tabela:* {best_offer['tabela']}\n"
                f"• 💵 *Valor da Parcela:* R$ {best_offer['valor_parcela']:.2f}\n"
                f"• 📅 *Prazo:* {best_offer['prazo']} meses\n"
                f"• ✍️ *Novo Contrato:* R$ {best_offer['valor_total_contrato']:.2f}\n"
                f"• 🏦 *Saldo Devedor:* R$ {float(session['saldo_devedor']):.2f}\n"
                f"• 📈 *Taxa do Refin:* {best_offer['taxa_juros']}% a.m.\n\n"
                f"💰 *VALOR DO TROCO ESTIMADO LIBERADO: R$ {best_offer['valor_liberado']:.2f}* 🤑💵\n\n"
                f"🏛️ *Outros bancos também elegíveis:* {other_banks_str}\n\n"
                "Posso te ajudar com mais alguma dúvida sobre essa simulação, ou você gostaria de ver outra tabela?\n"
                "Se o atendimento já estiver concluído, basta digitar *'obrigado'* ou *'encerrar'* para finalizar! 🙏"
            )
        
        session["state"] = "waiting_additional_questions"
        return reply
    except Exception as e:
        import traceback
        traceback.print_exc()
        return f"Erro ao processar simulação: {str(e)}"

import random
import string

def generate_protocol(user_name: str = None) -> str:
    if user_name:
        parts = user_name.strip().split()
        if len(parts) >= 2:
            if any(char.isdigit() for char in parts[0]):
                initials = parts[0][:2].upper()
            else:
                initials = (parts[0][0] + parts[1][0]).upper()
        elif len(parts) == 1:
            initials = parts[0][:2].upper()
        else:
            initials = os.getenv("PROMOTORA_INITIALS", "J2")
    else:
        initials = os.getenv("PROMOTORA_INITIALS", "J2")
    date_str = datetime.now().strftime("%d%m%Y")
    random_str1 = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    random_str2 = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"{initials} - {date_str}-{random_str1}-{random_str2}"

def get_welcome_menu(first_name: str, protocol: str) -> str:
    return (
        f"👋 Olá, *{first_name}*! Eu sou a *Clara*, a sua Assistente de Atendimento especialista em portabilidade de crédito consignado. 🤖✨\n\n"
        f"📝 Protocolo do Atendimento: *{protocol}*\n\n"
        "Como posso ajudar você hoje? Digite o *número* ou a *palavra-chave* da opção desejada: 👇\n\n"
        "1️⃣ *Simular* (para fazer uma simulação rápida do *convênio INSS*, informe apenas o *CPF*)\n"
        "2️⃣ *Regras* _(consultar as regras de aceitação de um banco)_\n"
        "3️⃣ *Perguntar* _(tirar uma dúvida, ex: \"Qual banco aceita analfabeto?\")_"
    )


async def send_whatsapp_message(to_phone: str, text: str):
    evo_url = os.getenv("EVOLUTION_API_URL")
    evo_key = os.getenv("EVOLUTION_API_KEY")
    if not evo_url or not evo_key:
        print("[WARNING] EVOLUTION_API_URL or EVOLUTION_API_KEY not configured. Cannot send message.")
        return False
    
    payload = {
        "number": to_phone,
        "options": {"delay": 1200},
        "textMessage": {"text": text}
    }
    headers = {
        "apikey": evo_key,
        "Content-Type": "application/json"
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(evo_url, json=payload, headers=headers, timeout=10.0)
            if resp.status_code in [200, 201]:
                return True
            else:
                print(f"[ERROR] Failed to send WhatsApp message: status={resp.status_code}, response={resp.text}")
    except Exception as e:
        print(f"[ERROR] Exception sending WhatsApp message: {e}")
    return False

async def close_inactive_sessions():
    now = datetime.now(timezone.utc)
    threshold = now - timedelta(minutes=15)
    
    async with AsyncSessionLocal() as db:
        try:
            stmt = select(WhatsappChatLog).where(
                WhatsappChatLog.status == "active",
                WhatsappChatLog.last_activity_at <= threshold
            )
            result = await db.execute(stmt)
            inactive_logs = result.scalars().all()
            
            for log in inactive_logs:
                lock_stmt = select(WhatsappChatLog).where(
                    WhatsappChatLog.id == log.id,
                    WhatsappChatLog.status == "active",
                    WhatsappChatLog.last_activity_at <= threshold
                ).with_for_update()
                
                lock_result = await db.execute(lock_stmt)
                locked_log = lock_result.scalar_one_or_none()
                
                if locked_log:
                    sender = normalize_sender(locked_log.sender_phone)
                    protocol = locked_log.protocol
                    
                    reply_text = (
                        "⏳ *Atendimento encerrado por inatividade.*\n\n"
                        "Como não recebemos novas mensagens nos últimos 15 minutos, este atendimento foi finalizado automaticamente.\n\n"
                        f"📝 *Protocolo de Atendimento:* {protocol}\n\n"
                        "Para iniciar um novo atendimento, basta enviar uma mensagem ou informar um novo *CPF*. 👩🏻💻✨"
                    )
                    
                    def parse_messages(val):
                        if not val:
                            return []
                        if isinstance(val, list):
                            return val
                        if isinstance(val, str):
                            try:
                                parsed = json.loads(val)
                                if isinstance(parsed, list):
                                    return parsed
                                if isinstance(parsed, str):
                                    parsed2 = json.loads(parsed)
                                    if isinstance(parsed2, list):
                                        return parsed2
                            except:
                                pass
                        return []

                    messages_list = parse_messages(locked_log.messages)
                    messages_list.append({
                        "role": "bot",
                        "text": reply_text,
                        "timestamp": datetime.now().isoformat()
                    })
                    
                    locked_log.status = "closed"
                    locked_log.closed_at = func.now()
                    locked_log.close_reason = "inactivity"
                    locked_log.messages = json.dumps(messages_list)
                    
                    await send_whatsapp_message(sender, reply_text)
                    
                    if sender in CHAT_SESSIONS:
                        del CHAT_SESSIONS[sender]
                        
                    await db.commit()
                    print(f"[INACTIVITY] Closed inactive session {protocol} for sender {sender}")
        except Exception as e:
            await db.rollback()
            print(f"[INACTIVITY] Error closing inactive sessions: {e}")

async def check_inactive_sessions_loop():
    while True:
        try:
            await asyncio.sleep(60)
            await close_inactive_sessions()
        except Exception as e:
            print(f"[INACTIVITY_LOOP] Error: {e}")

_inactivity_loop_started = False

def start_inactivity_check_loop():
    global _inactivity_loop_started
    if _inactivity_loop_started:
        return
    import sys
    if "pytest" in sys.modules or os.getenv("TESTING") == "True":
        return
    _inactivity_loop_started = True
    asyncio.create_task(check_inactive_sessions_loop())

async def save_chat_log(db: AsyncSession, session_data: dict, sender: str, is_finished: bool = False):
    protocol = session_data.get("protocol")
    if not protocol:
        return
    
    # Check if exists
    result = await db.execute(select(WhatsappChatLog).where(WhatsappChatLog.protocol == protocol))
    log = result.scalars().first()
    
    status = "finished" if is_finished else "active"
    messages = json.dumps(session_data.get("messages", []))
    
    if log:
        log.messages = messages
        log.status = status
        log.last_activity_at = func.now()
    else:
        new_log = WhatsappChatLog(
            protocol=protocol,
            sender_phone=sender,
            client_name=session_data.get("client_name", "Cliente"),
            user_id=session_data.get("user_id"),
            status=status,
            messages=messages,
            last_activity_at=func.now()
        )
        db.add(new_log)
    await db.commit()

def get_current_step_instruction(session: dict) -> str:
    state = session.get("state")
    if state == "waiting_initial_choice":
        return "Escolha uma das opções: 1️⃣ Simular | 2️⃣ Regras | 3️⃣ Perguntar"
    elif state == "waiting_rules_bank":
        return "Digite o nome do banco que deseja consultar (Ex: C6, Pan, Bradesco):"
    elif state == "waiting_convenio":
        return "🚀 Iniciando Simulação de Portabilidade!\n\nPara começarmos, por favor me informe qual é o seu *Convênio*? 👇\n\n1️⃣ *INSS*\n2️⃣ *SIAPE*\n3️⃣ *GOVERNO*\n4️⃣ *FORÇAS ARMADAS*\n5️⃣ *CLT PRIVADO*"
    elif state == "waiting_banco_origem":
        return "🏦 Agora, por favor, informe o nome do *Banco de Origem* (atual):"
    elif state == "waiting_idade":
        return "Perfeito! Qual é a *idade* do cliente? 🎂"
    elif state == "waiting_parcela":
        return "💰 Qual é o *valor da parcela* atual do contrato (R$)? (Ex: 150,00)"
    elif state == "waiting_saldo":
        return "💳 Qual é o *saldo devedor estimado* (R$)? (Ex: 5.000,00)"
    elif state == "waiting_prazo_total":
        return "📆 Qual é o *prazo total* do contrato original (meses)? (Ex: 84 ou 120)"
    elif state == "waiting_prazo_restante":
        return "⏳ Quantas *parcelas restantes* (a pagar) faltam? (Ex: 68)"
    elif state == "waiting_especie":
        return "📄 Informe o número da *espécie* do benefício (ou digite 'não sei' para pular):"
    elif state == "waiting_analfabeto":
        return "O cliente é analfabeto? (Digite SIM ou NÃO):"
    return "Como posso te ajudar? Digite *simular* ou *menu* para ver as opções."

@router.get("/external/check-timeout/{sender}")
async def check_timeout(sender: str, db: AsyncSession = Depends(get_db)):
    sender = normalize_sender(sender)
    
    session = CHAT_SESSIONS.get(sender)
    if not session:
        return {"timeout": False, "reason": "No active session"}
        
    if session.get("state") == "finished":
        return {"timeout": False, "reason": "Session already finished"}
        
    last_time = session.get("last_request_time", 0.0)
    current_time = datetime.now().timestamp()
    
    # 10 minutes = 600 seconds
    if (current_time - last_time) >= 600:
        session["state"] = "finished"
        protocol = session.get("protocol", "N/A")

        reply_text = (
            "⏳ *Atendimento encerrado por inatividade.*\n\n"
            f"O atendimento do protocolo *{protocol}* foi encerrado por falta de comunicação ou interação após 10 minutos de inatividade.\n\n"
            "Agradecemos o seu contato!"
        )
        session["messages"].append({"role": "bot", "text": reply_text, "timestamp": datetime.now().isoformat()})
        await save_chat_log(db, session, sender, True)

        return {"timeout": True, "reply": reply_text,
                "sender": sender}
    
    return {"timeout": False, "reason": "Active recently"}


async def background_timeout_task(sender: str, session: dict, db: AsyncSession):
    await asyncio.sleep(600)  # Wait 10 minutes
    
    current_time = datetime.now().timestamp()
    last_time = session.get("last_request_time", 0.0)
    
    if (current_time - last_time) >= 590:
        if session.get("state") != "finished":
            session["state"] = "finished"
            protocol = session.get("protocol", "N/A")
            
            reply_text = (
                "⏳ *Atendimento encerrado por inatividade.*\n\n"
                f"O atendimento do protocolo *{protocol}* foi encerrado por falta de comunicação ou interação após 10 minutos de inatividade.\n\n"
                "Agradecemos o seu contato!"
            )
            session["messages"].append({"role": "bot", "text": reply_text, "timestamp": datetime.now().isoformat()})
            await save_chat_log(db, session, sender, True)
            
            evo_url = os.getenv("EVOLUTION_API_URL")
            evo_key = os.getenv("EVOLUTION_API_KEY")
            if evo_url and evo_key:
                payload = {
                    "number": sender,
                    "options": {"delay": 1200},
                    "textMessage": {"text": reply_text}
                }
                headers = {
                    "apikey": evo_key,
                    "Content-Type": "application/json"
                }
                try:
                    async with httpx.AsyncClient() as client:
                        await client.post(evo_url, json=payload, headers=headers)
                except Exception as e:
                    print(f"Error sending timeout msg: {e}")

def get_gemini_response(session: dict, message: str) -> str:
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        return "⚠️ Chave do Gemini não configurada."
        
    genai.configure(api_key=gemini_api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")
    
    system_prompt = """Você é a Clara, Assistente Especialista em Portabilidade de Crédito Consignado.
Sua missão é extrair as informações para simular uma portabilidade.
Colete obrigatoriamente (nesta exata ordem, se possível):
1. convenio (INSS, SIAPE, GOV_EST, FORCAS, CLT_PRIVADO)
2. banco_origem (ex: C6, Pan, Bradesco). IMPORTANTE: Quando o cliente informar um CÓDIGO NUMÉRICO (ex: 029, 033, 237), você DEVE consultar EXCLUSIVAMENTE a lista de bancos abaixo para identificar o nome. NUNCA use seu próprio conhecimento para identificar bancos. Se o código não estiver na lista, peça para o cliente digitar o nome do banco.

LISTA OFICIAL DE BANCOS DE ORIGEM (código -> nome):
001 = BANCO DO BRASIL | 003 = BANCO DA AMAZÔNIA | 004 = BANCO DO NORDESTE | 012 = BANCO INBURSA | 021 = BANESTES | 024 = BANCO BANDEPE | 025 = BANCO ALFA | 027 = BESC | 029 = ITAÚ CONSIGNADO | 033 = SANTANDER | 036 = BRADESCO BBI | 037 = BANPARÁ | 041 = BANRISUL | 047 = BANESE | 062 = HIPERCARD | 063 = BANCO IBI | 065 = LEMON BANK | 066 = BANCO MORGAN STANLEY | 069 = BANCO CREFISA | 070 = BRB | 074 = BANCO SAFRA | 075 = BANCO ABN AMRO | 077 = BANCO INTER | 078 = BES | 079 = JBS BANCO | 082 = TOPAZIO | 083 = BANCO DA CHINA | 084 = UNIPRIME | 085 = CECRED | 088 = BANCO RANDON | 094 = BANCO FINAXIS | 095 = TRAVELEX BANCO | 096 = BANCO BMF | 097 = CREDISIS | 099 = UNIPRIME CENTRAL | 104 = CAIXA ECONÔMICA FEDERAL | 107 = BBM | 119 = WESTERN UNION | 120 = BANCO RODOBENS | 121 = BANCO AGIBANK | 125 = BANCO GENIAL | 132 = ICBC DO BRASIL | 136 = UNICRED | 149 = FACTA FINANCEIRA | 163 = COMMERZBANK BRASIL | 173 = BRL TRUST | 184 = BANCO ITAÚ BBA | 197 = STONE PAGAMENTOS | 208 = BANCO BTG PACTUAL | 212 = BANCO ORIGINAL | 213 = BANCO ARBI | 217 = BANCO JOHN DEERE | 218 = BANCO BS2 | 222 = BANCO CRÉDIT AGRICOLE | 224 = BANCO FIBRA | 230 = UNICARD | 233 = BANCO CIFRA | 237 = BRADESCO | 241 = BANCO CLÁSSICO | 243 = BANCO MÁXIMA | 246 = BANCO ABC BRASIL | 249 = BANCO INVESTCRED UNIBANCO | 250 = BANCO SCHAHIN | 254 = PARANÁ BANCO | 263 = BANCO CACIQUE | 265 = BANCO FATOR | 266 = BANCO CÉDULA | 290 = PAGBANK (PAGSEGURO) | 318 = BANCO BMG | 320 = BANCO CCB BRASIL | 341 = ITAÚ UNIBANCO | 356 = BANCO REAL | 366 = BANCO SOCIÉTÉ GÉNÉRALE | 370 = BANCO MIZUHO | 376 = BANCO JP MORGAN | 389 = BANCO MERCANTIL DO BRASIL | 394 = BANCO BMC | 399 = HSBC BANK BRASIL | 409 = UNIBANCO | 412 = BANCO CAPITAL | 422 = BANCO SAFRA | 453 = BANCO RURAL | 456 = BANCO TOKYO-MITSUBISHI | 464 = BANCO SUMITOMO | 473 = BANCO CAIXA GERAL | 477 = CITIBANK | 479 = BANCO ITAÚ BBA | 487 = DEUTSCHE BANK | 488 = JPMORGAN CHASE | 492 = ING BANK | 505 = BANCO CREDIT SUISSE | 600 = BANCO LUSO BRASILEIRO | 604 = BANCO INDUSTRIAL DO BRASIL | 610 = BANCO VR | 611 = BANCO PAULISTA | 612 = BANCO GUANABARA | 613 = BANCO PECÚNIA | 623 = BANCO PAN | 626 = BANCO C6 CONSIG | 630 = BANCO INTERCAP | 633 = BANCO RENDIMENTO | 634 = BANCO TRIÂNGULO | 637 = BANCO SOFISA | 638 = BANCO PROSPER | 641 = BANCO ALVORADA | 643 = BANCO PINE | 652 = ITAÚ UNIBANCO HOLDING | 653 = BANCO INDUSVAL | 654 = BANCO A.J. RENNER | 655 = BANCO VOTORANTIM | 707 = BANCO DAYCOVAL | 739 = BANCO CETELEM | 741 = BANCO RIBEIRÃO PRETO | 743 = BANCO SEMEAR | 745 = BANCO CITIBANK | 746 = BANCO MODAL | 747 = BANCO RABOBANK | 748 = SICREDI | 751 = SCOTIABANK BRASIL | 752 = BANCO BNP PARIBAS | 755 = BANK OF AMERICA MERRILL LYNCH | 756 = SICOOB | 757 = BANCO KEB HANA
LISTA OFICIAL DE ESPÉCIES DO INSS (código -> nome):
01 = Pensão por morte do trabalhador rural | 04 = Aposentadoria por invalidez do trabalhador rural | 07 = Aposentadoria por idade do trabalhador rural | 21 = Pensão por morte previdenciária | 25 = Auxílio-reclusão do trabalhador rural | 31 = Auxílio-doença previdenciário | 32 = Aposentadoria por invalidez previdenciária | 41 = Aposentadoria por idade previdenciária | 42 = Aposentadoria por tempo de contribuição previdenciária | 88 = Amparo social ao idoso (LOAS) | 91 = Auxílio-doença por acidente do trabalho | 92 = Aposentadoria por invalidez por acidente do trabalho | 93 = Pensão por morte por acidente do trabalho

3. idade
4. parcela
5. saldo_devedor
6. total_term (prazo total)
7. remaining_term (parcelas restantes)
8. benefit_species (só INSS, ou 'ignorar'). IMPORTANTE: Use a lista acima para traduzir códigos numéricos para o nome do benefício ao confirmar.
9. data_concessao_beneficio (SOMENTE se benefit_species for de INVALIDEZ, ou seja, códigos 04, 32 ou 92. Caso contrário, 'ignorar')
10. margem_extrapolada (valor em reais se SIM, ou 'nao' se NÃO)
11. analfabeto (sim/nao)

MUITO IMPORTANTE: Ao fazer uma pergunta pedindo um dado, você DEVE OBRIGATORIAMENTE usar EXATAMENTE um dos textos abaixo, com os mesmos emojis e formatação originais do nosso sistema.

🚨 ANTES de fazer a próxima pergunta, você DEVE SEMPRE confirmar o dado que o cliente acabou de fornecer de forma simpática (EXCETO no último dado que é analfabeto). Toda confirmação deve ser mostrada em NEGRITO e ITÁLICO (_*texto*_).
- Se ele acabou de informar o banco, comece a sua resposta EXATAMENTE com: "_*✅ Banco identificado: [NÚMERO] - [NOME DO BANCO]*_\n\n" seguido da próxima pergunta.
- Se ele acabou de informar a espécie do benefício, consulte a lista de Espécies acima. Se for um código válido, retorne o nome. Comece sua resposta EXATAMENTE com: "_*✅ Benefício identificado: [NÚMERO] - [NOME DO BENEFÍCIO]*_\n\n" seguido da próxima pergunta.
- Se ele acabou de informar o valor da margem extrapolada (e foi MAIOR QUE ZERO), sua confirmação DEVE OBRIGATORIAMENTE exibir o valor com o sinal de negativo na frente, formatado como moeda. Exemplo: "_*✅ Margem extrapolada confirmada: -R$ 50,00.*_\n\n". Se for NÃO ou 0, confirme com "_*✅ Cliente não possui margem extrapolada.*_\n\n".
- Para TODOS os outros dados, confirme amigavelmente REPETINDO a informação exata que o cliente forneceu na mensagem anterior SEMPRE EM NEGRITO E ITÁLICO. (Exemplo: "_*✅ Idade confirmada: 50 anos.*_\n\n", "_*✅ Parcela confirmada: R$ 133,00.*_\n\n", "_*✅ Saldo devedor confirmado: R$ 5.000,00.*_\n\n", "_*✅ Prazo total confirmado: 84 meses.*_\n\n", "_*✅ Parcelas restantes confirmadas: 60 parcelas.*_\n\n", "_*✅ Data de concessão confirmada: 01/01/2026.*_\n\n"). É PROIBIDO confirmar dizendo apenas "Idade confirmada", você deve SEMPRE mostrar o valor. PARA PARCELA E SALDO DEVEDOR: SEMPRE formate como moeda brasileira com o prefixo R$ e vírgula para centavos (Ex: se o cliente digitar 133, confirme como R$ 133,00. Se digitar 5000, confirme como R$ 5.000,00).

Lista EXATA de perguntas que você deve usar (copie e cole, não mude nada):
- Para Convênio: "🚀 Iniciando Simulação de Portabilidade!\n\nPara começarmos, por favor me informe qual é o seu *Convênio*? 👇\n\n☑️ *INSS*\n\n☑️ *SIAPE*\n\n☑️ *GOVERNO*\n\n☑️ *FORÇAS ARMADAS*\n\n☑️ *CLT PRIVADO*\n\n_(Responda digitando o nome do convênio)_"
- Para Banco de Origem: "🏦 Agora, por favor, informe o nome do *Banco de Origem* (atual):"
- Para Idade: "Perfeito! Qual é a *idade* do cliente? 🎂"
- Para Parcela: "💰 Qual é o *valor da parcela* atual do contrato (R$)? (Ex: 150,00)"
- Para Saldo: "💳 Qual é o *saldo devedor estimado* (R$)? (Ex: 5.000,00)"
- Para Prazo Total: "📆 Qual é o *prazo total* do contrato original (meses)? (Ex: 84 ou 120)"
- Para Parcelas Restantes: "⏳ Quantas *parcelas restantes* (a pagar) faltam? (Ex: 68)"
- Para Espécie (só se INSS): "📄 Informe o número da *espécie* do benefício (ou digite 'não sei' para pular):"
- Para Data de Concessão (só se INVALIDEZ): "📅 Informe a **Data de Concessão** do seu benefício, ex: _01/01/2026_"
- Para Margem Extrapolada: "Seu cliente está com a margem consignável **extrapolada**? Se **SIM** 📉, informa o valor do negativo, caso contrário é só informar **NÃO** ✅ para prosseguirmos."
- Para Analfabeto: "✍️ O cliente é *analfabeto*? (Digite *SIM* ou *NÃO*):"

REGRA MÁXIMA PARA FINALIZAR DADOS: Quando tiver TODOS esses 11 dados coletados (incluindo os condicionais se aplicável), e SOMENTE quando tiver todos (o último é o analfabeto), VOCÊ ESTÁ PROIBIDA DE CONFIRMAR O ÚLTIMO DADO E PROIBIDA DE GERAR TEXTO! Sua resposta DEVE ser ÚNICA E EXCLUSIVAMENTE um JSON exato:
```json
{
  "action": "simulate",
  "data": { "convenio": "INSS", "banco_origem": "C6", "idade": 50, "parcela": 150.00, "saldo_devedor": 5000.00, "total_term": 84, "remaining_term": 68, "benefit_species": "32", "data_concessao_beneficio": "01/01/2026", "margem_extrapolada": "50.00", "analfabeto": "nao" }
}
```
Senão, peça o próximo dado faltante usando o texto EXATO correspondente da lista acima."""

    history = system_prompt + "\n\n--- HISTÓRICO ---\n"
    for msg in session.get("messages", [])[-15:]:
        role = "Cliente" if msg["role"] == "user" else "Clara"
        history += f"{role}: {msg['text']}\n"
        
    history += f"Cliente: {message}\nClara:"
    
    try:
        response = model.generate_content(history)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini error: {e}")
        try:
            available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
            models_list = ", ".join(available_models)
            return f"⚠️ Erro no modelo Gemini. Modelos disponíveis na sua API: {models_list}. (Erro original: {type(e).__name__} - {e})"
        except Exception as list_e:
            return f"⚠️ Erro ao acessar a inteligência (e falha ao listar modelos). Erro: {type(e).__name__} - {e}"


async def simulate_for_cpf(cpf: str, is_illiterate: bool, db: AsyncSession, user_id: int, session: dict = None) -> str:
    from app.models.sqlalchemy_models import ConsultaCpfCache
    from app.routers.consultas import get_provider
    import json
    from datetime import datetime, timedelta, timezone
    
    clean_cpf = "".join(filter(str.isdigit, cpf))
    if not clean_cpf:
        return "❌ *CPF inválido.*"
        
    masked_cpf = f"{clean_cpf[:3]}******{clean_cpf[-2:]}" if len(clean_cpf) >= 5 else "***"
    
    # 1. Check cache first
    dados_json = None
    cache_entry = None
    try:
        stmt = select(ConsultaCpfCache).where(ConsultaCpfCache.cpf == clean_cpf)
        result = await db.execute(stmt)
        cache_entry = result.scalar_one_or_none()
        
        if cache_entry:
            now_utc = datetime.now(timezone.utc)
            created_at = cache_entry.updated_at or cache_entry.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
                
            if (now_utc - created_at) <= timedelta(days=30):
                try:
                    dados_json = json.loads(cache_entry.dados_json)
                    print(f"[CACHE] Usando cache para o CPF {masked_cpf} no Chat")
                except Exception as e:
                    print(f"[WARNING] Erro ao ler JSON do cache para CPF {masked_cpf}: {e}")
    except Exception as cache_err:
        print(f"[WARNING] Erro ao ler cache no chat para CPF {masked_cpf}: {cache_err}")

    # 2. Query Promosys if cache is missing or expired
    if not dados_json:
        try:
            provider = get_provider()
            beneficios_info = await provider.consultar_beneficios(clean_cpf)
            beneficios_list = beneficios_info.get("beneficios", [])
            
            if not beneficios_list:
                return f"❌ *CPF {masked_cpf}:* Nenhum benefício ativo encontrado na Promosys."
                
            # Query each benefit
            detailed_beneficios = []
            for nb in beneficios_list:
                try:
                    res = await provider.consultar_por_beneficio(nb)
                    if "telefones" in res and isinstance(res["telefones"], list):
                        res["telefones"] = [t for t in res["telefones"] if t]
                    detailed_beneficios.append(res)
                except Exception as e:
                    print(f"[WARNING] Erro ao consultar benefício {nb} no chat: {e}")
                    
            if not detailed_beneficios:
                return f"❌ *CPF {masked_cpf}:* Não foi possível carregar os detalhes do benefício."
                
            # Construct standard response payload to cache
            beneficio_principal = detailed_beneficios[0]
            dados_json = {
                "success": True,
                "cpf": clean_cpf,
                "total_beneficios": len(detailed_beneficios),
                "beneficio_principal": beneficio_principal,
                "beneficios": detailed_beneficios
            }
            
            # Save or update cache
            try:
                if cache_entry:
                    cache_entry.dados_json = json.dumps(dados_json)
                    cache_entry.updated_at = datetime.now(timezone.utc)
                else:
                    new_entry = ConsultaCpfCache(
                        cpf=clean_cpf,
                        dados_json=json.dumps(dados_json),
                        created_at=datetime.now(timezone.utc),
                        updated_at=datetime.now(timezone.utc)
                    )
                    db.add(new_entry)
                await db.commit()
            except Exception as save_err:
                print(f"[WARNING] Erro ao salvar cache no chat para CPF {masked_cpf}: {save_err}")
                
        except Exception as e:
            print(f"[WARNING] Erro ao consultar Promosys no chat: {e}")
            return f"❌ *Erro de Integração:* Não conseguimos consultar o CPF {masked_cpf} na Promosys no momento. Tente novamente mais tarde."

    # 3. Process simulations for each benefit
    beneficios = dados_json.get("beneficios", [])
    if not beneficios:
        # Fallback to beneficio_principal
        bp = dados_json.get("beneficio_principal")
        if bp:
            beneficios = [bp]
            
    if not beneficios:
        return f"❌ *CPF {masked_cpf}:* Nenhum dado de benefício estruturado foi retornado."
        
    client_name = beneficios[0].get("cliente", {}).get("nome", "Cliente")
    client_age = beneficios[0].get("cliente", {}).get("idade", 50)
    client_address = beneficios[0].get("cliente", {}).get("endereco", "")
    
    reply = (
        f"👤 *DADOS DO CLIENTE*\n"
        f"• *Nome:* {client_name.upper()}\n"
        f"• *CPF:* {masked_cpf}\n"
        f"• *Idade:* {client_age} anos\n"
    )
    if client_address:
        reply += f"• *Endereço:* {client_address.upper()}\n"
        
    if is_illiterate:
        reply += f"• *Analfabeto:* _*SIM*_ ✍️\n"
    else:
        reply += f"• *Analfabeto:* _*NÃO*_\n"
        
    reply += "\n"
    
    # Format BRL helper
    def fmt_brl(val):
        if val is None or val == "":
            return "R$ 0,00"
        try:
            return f"R$ {float(val):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        except:
            return f"R$ {val}"

    for idx_b, b in enumerate(beneficios):
        nb = b.get("cliente", {}).get("beneficio") or b.get("numero", "N/A")
        especie = b.get("cliente", {}).get("especie") or "N/A"
        uf = b.get("beneficio", {}).get("uf") or "PE"
        ddb = b.get("beneficio", {}).get("ddb") or "N/A"
        situacao = b.get("beneficio", {}).get("situacao") or "ATIVO"
        bloqueio = b.get("beneficio", {}).get("bloqueio_emprestimo") or "NÃO"
        
        # Margins
        salario = b.get("margens", {}).get("salario", 0.0)
        margem_livre = b.get("margens", {}).get("margem_livre", 0.0)
        liberado_aprox = await calcular_valor_liberado_margem(margem_livre)
        margem_aprox_txt = f"_(Libera aprox. {fmt_brl(liberado_aprox)})_" if liberado_aprox > 0 else ""
        
        benefit_header = (
            f"➖➖➖➖➖➖➖➖➖➖\n\n"
            f"📋 *BENEFÍCIO {idx_b + 1}: NB {nb}*\n"
            f"• *Situação:* {situacao}\n"
            f"• *Espécie:* {especie}\n"
            f"• *UF:* {uf} | *DDB:* {ddb}\n"
            f"• *Bloqueado Empréstimo:* {bloqueio.upper()}\n"
            f"• *Salário:* {fmt_brl(salario)}\n"
            f"• *Margem Livre:* {fmt_brl(margem_livre)} "
        )
        if margem_livre > 0:
            benefit_header += f"_(Libera aprox. {fmt_brl(liberado_aprox)})_"
        benefit_header += "\n\n"
        
        loans = b.get("emprestimos", [])
        benefit_loans_replies = []
        
        # Run simulation for each loan
        for idx_l, c in enumerate(loans):
            # Parse species digits
            spec_digits = "".join(filter(str.isdigit, especie))
            
            # Setup session dict for simulation running
            sim_session = {
                "convenio": "INSS",
                "banco_origem": c.get("banco", ""),
                "idade": str(client_age),
                "parcela": str(c.get("parcela", 0.0)),
                "saldo_devedor": str(c.get("quitacao", 0.0)),
                "total_term": str(c.get("prazo", 84)),
                "remaining_term": str(c.get("prazo_restante", 68)),
                "analfabeto": "sim" if is_illiterate else "não",
                "benefit_species": spec_digits or None,
                "valor_margem_negativa": "0"
            }
            
            try:
                # Na simulação de benefício CPF, idx_b e idx_l vêm do loop (0-indexed)
                sim_reply = await run_simulation_and_respond(
                    sim_session, db, user_id=user_id, compact=True, 
                    b_idx=idx_b + 1, c_idx=idx_l + 1, is_manual=False
                )
                loan_detail = (
                    f"📌 *CONTRATO {idx_l + 1} ({c.get('banco')} - Contrato {c.get('contrato')}):*\n"
                    f"• *Parcela:* {fmt_brl(c.get('parcela'))} | *Taxa Atual:* {c.get('taxa')}% a.m.\n"
                    f"• *Saldo Devedor:* {fmt_brl(c.get('quitacao'))} | *Prazo:* {c.get('prazo_restante')} de {c.get('prazo')} meses\n\n"
                    f"{sim_reply}"
                )
                
                # Merge into global session context
                if session is not None and "simulations" in sim_session:
                    if "simulations" not in session:
                        session["simulations"] = []
                    session["simulations"].extend(sim_session["simulations"])
                    
                benefit_loans_replies.append(loan_detail)
            except Exception as sim_err:
                print(f"[WARNING] Erro ao simular contrato {c.get('contrato')}: {sim_err}")
                benefit_loans_replies.append(f"📌 *CONTRATO {idx_l + 1} ({c.get('banco')}):* Erro ao calcular portabilidade.")
                
        if not loans:
            benefit_loans_replies.append("ℹ️ *Nenhum empréstimo ativo encontrado neste benefício.*")
            
        reply += benefit_header + "\n\n".join(benefit_loans_replies)

    reply += (
        "\n\nPosso te ajudar com mais alguma dúvida sobre essas simulações, ou você gostaria de ver as opções de outro banco?\n"
        "Se o atendimento já estiver concluído, basta digitar *'obrigado'* ou *'encerrar'* para finalizar! 🙏"
    )
    return reply


@router.post("/external/chat")
async def chat_interaction(
    input_data: ChatMessageInput,
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(verify_n8n_internal_key)
):
    sender = normalize_sender(input_data.sender)
    if sender not in SENDER_LOCKS:
        SENDER_LOCKS[sender] = asyncio.Lock()
        
    async with SENDER_LOCKS[sender]:
        # PDF Processing Helper
        async def process_pdf(pdf_url: str):
            try:
                async with aiohttp.ClientSession() as client:
                    async with client.get(pdf_url) as response:
                        if response.status == 200:
                            pdf_bytes = await response.read()
                            res = await PdfExtractorService.extract_pdf(pdf_bytes)
                            if res.get("status") == "success":
                                return res.get("data")
            except Exception as e:
                print(f"Error extracting PDF: {e}")
            return None

        message = input_data.message.strip()
        msg_lower = message.lower()
        
        # Normalize message to perform a robust substring check (strip punctuation but keep word characters)
        clean_msg = re.sub(r'[^\w\s]', '', msg_lower).strip()
        
        # Substrings that identify outgoing bot messages or external warning messages
        ignore_substrings = [
            "sou a clara",
            "como posso ajudar voce hoje",
            "como posso ajudar você hoje",
            "simular fazer uma simulacao",
            "simular fazer uma simulação",
            "atendimento encerrado por inatividade",
            "sessão expirada por inatividade",
            "sinto muito",
            "por favor, informe os dados",
            "tente novamente"
        ]
        
        if any(sub in clean_msg for sub in ignore_substrings):
            return {"status": "ignored", "reason": "Self loop/system message ignored"}
            
        # Get active user
        result = await db.execute(select(User).where(User.active == True))
        active_users = result.scalars().all()
        matched_user = None
        for u in active_users:
            if u.phone and phones_match(sender, u.phone):
                matched_user = u
                break
                
        if not matched_user:
            return {
                "status": "ignored",
                "reply": "Número de WhatsApp não cadastrado no sistema."
            }
            
        user_id = matched_user.id
        first_name = matched_user.name.split()[0] if matched_user.name else "Corretor"
        
        # Initialize session if not exists
        if sender not in CHAT_SESSIONS:
            query = select(WhatsappChatLog).where(
                WhatsappChatLog.sender_phone == sender,
                WhatsappChatLog.status == "active"
            ).order_by(WhatsappChatLog.created_at.desc())
            res_db = await db.execute(query)
            active_log = res_db.scalars().first()
            
            if active_log:
                try:
                    msgs = json.loads(active_log.messages) if active_log.messages else []
                except:
                    msgs = []
                if isinstance(msgs, str):
                    try:
                        msgs = json.loads(msgs)
                    except:
                        msgs = []
                if not isinstance(msgs, list):
                    msgs = []

                CHAT_SESSIONS[sender] = {
                    "state": "waiting_additional_questions",
                    "protocol": active_log.protocol,
                    "last_request_time": 0.0,
                    "last_message": "",
                    "messages": msgs,
                    "user_id": matched_user.id,
                    "client_name": first_name
                }
                if hasattr(active_log, "context_data") and active_log.context_data:
                    CHAT_SESSIONS[sender]["ultima_simulacao"] = active_log.context_data
            else:
                CHAT_SESSIONS[sender] = {
                    "state": "idle",
                    "protocol": generate_protocol(matched_user.name),
                    "last_request_time": 0.0,
                    "last_message": "",
                    "messages": [],
                    "user_id": matched_user.id,
                    "client_name": first_name
                }
            
        session = CHAT_SESSIONS[sender]
        if "messages" not in session:
            session["messages"] = []

        # Time-lock and duplicate request protection (rate limit)
        import time
        current_time = time.time()
        last_time = session.get("last_request_time", 0.0)
        last_msg = session.get("last_message", "")
        if (current_time - last_time < 1.5) and (message == last_msg):
            return {
                "status": "ignored",
                "reply": "",
                "sender": sender
            }
        session["last_request_time"] = current_time
        session["last_message"] = message
        
        # 10 minute timeout check (10 * 60 = 600 seconds)
        if last_time > 0 and (current_time - last_time > 600) and session.get("state") != "idle":
            protocol = session.get('protocol', 'N/A')
            reply_text = (
                "⏳ *Atendimento encerrado por inatividade.*\n\n"
                f"O atendimento do protocolo *{protocol}* foi encerrado por falta de comunicação ou interação após 10 minutos de inatividade.\n\n"
                "Agradecemos o seu contato!"
            )
            session["messages"].append({"role": "bot", "text": reply_text, "timestamp": datetime.now().isoformat()})
            await save_chat_log(db, session, sender, True)
            if sender in CHAT_SESSIONS:
                del CHAT_SESSIONS[sender]
            return {"status": "success", "reply": reply_text, "sender": sender}

        # N8N payload check / PDF file processing (extrato input)
        if "[DADOS_PDF_N8N]" in message:
            try:
                json_str = message.split("[DADOS_PDF_N8N]")[1].strip()
                data = json.loads(json_str)
                
                if not session.get("protocol"):
                    session["protocol"] = generate_protocol(matched_user.name)
                    session["user_id"] = matched_user.id
                    session["client_name"] = first_name
                
                session["convenio"] = data.get("convenio", "INSS")
                session["idade"] = str(data.get("idade", 50))
                session["analfabeto"] = "sim" if data.get("analfabeto", False) else "não"
                
                contratos = data.get("contratos", [])
                if not contratos:
                    reply_text = "⚠️ *Não encontramos contratos ativos neste extrato.*"
                    session["messages"].append({"role": "bot", "text": reply_text, "timestamp": datetime.now().isoformat()})
                    await save_chat_log(db, session, sender, False)
                    return {"status": "success", "reply": reply_text, "sender": sender}
                
                all_replies = []
                for idx, c in enumerate(contratos[:5]):
                    session["banco_origem"] = c.get("banco", "")
                    session["parcela"] = str(c.get("parcela", 0))
                    session["saldo_devedor"] = str(c.get("saldo", 0))
                    session["total_term"] = str(c.get("prazo_total", 84))
                    session["remaining_term"] = str(c.get("prazo_restante", 68))
                    session["benefit_species"] = str(c.get("especie", ""))
                    
                    reply = await run_simulation_and_respond(
                        session, db, user_id=matched_user.id, compact=True,
                        b_idx=1, c_idx=idx+1, is_manual=False
                    )
                    all_replies.append(f"📌 *CONTRATO {idx+1} ({session['banco_origem']} - Parcela R$ {session['parcela']}):*\n\n" + reply)
                
                final_reply = (
                    "🎉 *Excelente notícia! Simulamos os contratos do seu extrato com sucesso!* 🚀\n\n"
                    "Abaixo estão as melhores ofertas encontradas para cada um deles:\n\n"
                    + "\n\n➖➖➖➖➖➖➖➖➖➖\n\n".join(all_replies) +
                    "\n\nPosso te ajudar com mais alguma dúvida sobre essas simulações, ou você gostaria de ver as opções de outro banco?\n"
                    "Se o atendimento já estiver concluído, basta digitar *'obrigado'* ou *'encerrar'* para finalizar! 🙏"
                )
                
                session["messages"].append({"role": "user", "text": "[Dados do Extrato PDF recebidos via N8N e simulados com sucesso]", "timestamp": datetime.now().isoformat()})
                session["messages"].append({"role": "bot", "text": final_reply, "timestamp": datetime.now().isoformat()})
                await save_chat_log(db, session, sender, False)
                return {
                    "status": "success",
                    "reply": final_reply,
                    "sender": sender
                }
            except Exception as e:
                import traceback
                traceback.print_exc()
                return {"status": "error", "reply": "Erro ao processar dados estruturados do PDF.", "sender": sender}

        elif input_data.pdf_url:
            pdf_data = await process_pdf(input_data.pdf_url)
            if pdf_data:
                if not session.get("protocol"):
                    session["protocol"] = generate_protocol(matched_user.name)
                    session["user_id"] = matched_user.id
                    session["client_name"] = first_name
                session["convenio"] = "INSS"
                if pdf_data.get("beneficio"):
                    session["benefit_species"] = str(pdf_data["beneficio"])
                session["messages"].append({"role": "bot", "text": "📄 PDF Recebido e processado! Vamos continuar...", "timestamp": datetime.now().isoformat()})
                if "waiting_initial_choice" in session.get("state", "") or session.get("state") == "idle":
                    session["state"] = "waiting_banco_origem"
                    reply_text = "📄 *Extrato INSS Recebido!*\nIdentificamos o seu convênio como INSS.\n\nQual é o nome do *Banco de Origem* (atual) que deseja portar?"
                    session["messages"].append({"role": "bot", "text": reply_text, "timestamp": datetime.now().isoformat()})
                    await save_chat_log(db, session, sender, False)
                    return {
                        "status": "success",
                        "reply": reply_text,
                        "sender": sender
                    }

        # ----------------------------------------------------------------------
        # ORDER OF PRIORITY PROCESSING
        # ----------------------------------------------------------------------

        # Priority 1: Encerramento
        if msg_lower in ["encerrar", "obrigado", "obrigada", "valeu", "tchau", "agradeço", "obg"]:
            protocol = session.get('protocol', 'N/A')
            reply_text = (
                "🙏 *Muito obrigada pelo seu contato!*\n"
                "Foi um prazer te ajudar hoje. Se precisar realizar uma nova simulação, estarei por aqui!\n\n"
                f"📝 *Protocolo de Atendimento:* {protocol}\n\n"
                "_Atendimento encerrado com sucesso. Tenha um ótimo dia!_"
            )
            session["messages"].append({"role": "user", "text": message, "timestamp": datetime.now().isoformat()})
            session["messages"].append({"role": "bot", "text": reply_text, "timestamp": datetime.now().isoformat()})
            await save_chat_log(db, session, sender, True)
            if sender in CHAT_SESSIONS:
                del CHAT_SESSIONS[sender]
            return {"status": "success", "reply": reply_text, "sender": sender}

        # Priority 2: Respostas de estados pendentes
        # Case A: aguardando_convenio
        if session.get("state") == "aguardando_convenio":
            conv = normalize_convenio(msg_lower)
            if conv:
                session["convenio"] = conv
                session["state"] = "waiting_data_collection"
                
                # Avança para pedir o Banco de Origem
                reply_text = (
                    f"✅ *Convênio {conv} selecionado.*\n\n"
                    "🏦 Agora, por favor, informe o nome do *Banco de Origem* (atual):"
                )
                session["messages"].append({"role": "user", "text": message, "timestamp": datetime.now().isoformat()})
                session["messages"].append({"role": "bot", "text": reply_text, "timestamp": datetime.now().isoformat()})
                await save_chat_log(db, session, sender, False)
                return {"status": "success", "reply": reply_text, "sender": sender}
            else:
                # Repete a pergunta do convênio
                reply_text = (
                    "⚠️ *Opção inválida.*\n\n"
                    "Por favor, me informe qual é o seu *Convênio*? 👇\n\n"
                    "*1️⃣ INSS*\n"
                    "*2️⃣ SIAPE*\n"
                    "*3️⃣ GOVERNO*\n"
                    "*4️⃣ FORÇAS ARMADAS*\n"
                    "*5️⃣ CLT PRIVADO*"
                )
                session["messages"].append({"role": "user", "text": message, "timestamp": datetime.now().isoformat()})
                session["messages"].append({"role": "bot", "text": reply_text, "timestamp": datetime.now().isoformat()})
                await save_chat_log(db, session, sender, False)
                return {"status": "success", "reply": reply_text, "sender": sender}

        # Case B: waiting_rules_bank
        if session.get("state") == "waiting_rules_bank":
            rules_reply = await query_rules(message, db, user_id)
            if rules_reply:
                session["state"] = "waiting_initial_choice"
                reply_text = (
                    f"{rules_reply}\n\n"
                    "💡 *Dica:* Para fazer outra consulta ou iniciar uma simulação, escolha uma opção do menu:\n\n"
                    "1️⃣ **Simular** | 2️⃣ **Ver Regras** | 3️⃣ **Perguntar**"
                )
            else:
                if msg_lower in ["cancelar", "sair", "voltar", "menu"]:
                    session["state"] = "waiting_initial_choice"
                    reply_text = get_welcome_menu(first_name, session.get("protocol"))
                else:
                    reply_text = (
                        "⚠️ *Banco não reconhecido.*\n\n"
                        "Por favor, digite o nome de um banco cadastrado (Ex: *C6*, *Pan*, *Itaú*, *Bradesco*) ou digite *cancelar* para voltar ao menu:"
                    )
            session["messages"].append({"role": "user", "text": message, "timestamp": datetime.now().isoformat()})
            session["messages"].append({"role": "bot", "text": reply_text, "timestamp": datetime.now().isoformat()})
            await save_chat_log(db, session, sender, False)
            return {"status": "success", "reply": reply_text, "sender": sender}

        # Priority 3: CPF directo
        cpf_matches = re.findall(r'\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b', message)
        if not cpf_matches:
            cpf_matches = re.findall(r'\b\d{11}\b', message)
            
        if cpf_matches:
            clean_cpf = re.sub(r'\D', '', cpf_matches[0])
            is_illiterate = "analfabeto" in msg_lower or "analfabetos" in msg_lower or session.get("analfabeto") == "sim"
            if is_illiterate:
                session["analfabeto"] = "sim"
                
            reply = await simulate_for_cpf(clean_cpf, is_illiterate, db, user_id=matched_user.id, session=session)
            session["messages"].append({"role": "user", "text": message, "timestamp": datetime.now().isoformat()})
            session["messages"].append({"role": "bot", "text": reply, "timestamp": datetime.now().isoformat()})
            await save_chat_log(db, session, sender, False)
            return {
                "status": "success",
                "reply": reply,
                "sender": sender
            }

        # Priority 4: Interceptor de simulação ativa (tabelas, regras, etc.)
        from app.services.chat_simulacao_interceptor import processar_comando_simulacao
        intercepted_reply = processar_comando_simulacao(session, msg_lower, message)
        if intercepted_reply:
            session["messages"].append({"role": "user", "text": message, "timestamp": datetime.now().isoformat()})
            session["messages"].append({"role": "bot", "text": intercepted_reply, "timestamp": datetime.now().isoformat()})
            await save_chat_log(db, session, sender, False)
            return {
                "status": "success",
                "reply": intercepted_reply,
                "sender": sender
            }

        # Priority 5: Comandos gerais
        # Intercept Rules Queries at any time
        if "regra" in msg_lower or "aceita" in msg_lower or "analfabeto" in msg_lower or "invalidez" in msg_lower or "loas" in msg_lower:
            rules_reply = await query_rules(message, db, user_id)
            if rules_reply:
                session["messages"].append({"role": "user", "text": message, "timestamp": datetime.now().isoformat()})
                if session.get("state") not in ["idle", "waiting_initial_choice", "simulated", "finished", None]:
                    current_step_msg = get_current_step_instruction(session)
                    reply_text = f"{rules_reply}\n\n🔄 *Retomando a simulação:* {current_step_msg}"
                else:
                    reply_text = rules_reply
                session["messages"].append({"role": "bot", "text": reply_text, "timestamp": datetime.now().isoformat()})
                await save_chat_log(db, session, sender, False)
                return {
                    "status": "success",
                    "reply": reply_text,
                    "sender": sender
                }

        # Início de simulação
        if msg_lower in ["1", "simular", "simula", "simulacao", "simulação"]:
            session["state"] = "aguardando_convenio"
            reply_text = (
                "🚀 Iniciando Simulação de Portabilidade!\n\n"
                "Para começarmos, por favor me informe qual é o seu *Convênio*? 👇\n\n"
                "*1️⃣ INSS*\n"
                "*2️⃣ SIAPE*\n"
                "*3️⃣ GOVERNO*\n"
                "*4️⃣ FORÇAS ARMADAS*\n"
                "*5️⃣ CLT PRIVADO*"
            )
            session["messages"].append({"role": "user", "text": message, "timestamp": datetime.now().isoformat()})
            session["messages"].append({"role": "bot", "text": reply_text, "timestamp": datetime.now().isoformat()})
            await save_chat_log(db, session, sender, False)
            return {"status": "success", "reply": reply_text, "sender": sender}

        # Consulta de regras por menu
        if session.get("state") in ["idle", "waiting_initial_choice", None]:
            # Reconhece saudações comuns e apresenta o menu inicial
            if msg_lower in [
                "oi",
                "olá",
                "ola",
                "bom dia",
                "boa tarde",
                "boa noite",
                "e aí",
                "e ai",
                "olá clara",
                "ola clara"
            ]:
                session["state"] = "waiting_initial_choice"

                reply_text = get_welcome_menu(
                    first_name,
                    session.get("protocol")
                )

                session["messages"].append({
                    "role": "user",
                    "text": message,
                    "timestamp": datetime.now().isoformat()
                })

                session["messages"].append({
                    "role": "bot",
                    "text": reply_text,
                    "timestamp": datetime.now().isoformat()
                })

                await save_chat_log(db, session, sender, False)

                return {
                    "status": "success",
                    "reply": reply_text,
                    "sender": sender
                }

            if msg_lower in ["2", "regras", "regra", "banco", "bancos"]:
                session["state"] = "waiting_rules_bank"
                reply_text = (
                    "🏛️ *Consultar Regras de Bancos*\n\n"
                    "Por favor, digite o nome do banco que deseja consultar (Ex: *C6*, *Pan*, *Bradesco*):"
                )
                session["messages"].append({"role": "user", "text": message, "timestamp": datetime.now().isoformat()})
                session["messages"].append({"role": "bot", "text": reply_text, "timestamp": datetime.now().isoformat()})
                await save_chat_log(db, session, sender, False)
                return {"status": "success", "reply": reply_text, "sender": sender}
            elif msg_lower in ["3", "perguntar", "pergunta", "duvida", "dúvida"]:
                session["state"] = "waiting_rules_bank"
                reply_text = (
                    "❓ *Tirar Dúvida sobre Regras*\n\n"
                    "Você pode fazer perguntas diretas sobre as regras dos bancos!\n"
                    "Exemplos:\n"
                    "• _Qual banco aceita analfabeto?_\n"
                    "• _Quem aceita LOAS?_\n"
                    "• _Regras do C6_\n\n"
                    "Pode digitar a sua pergunta agora: 👇"
                )
                return {
                    "status": "success",
                    "reply": reply_text,
                    "sender": sender
                }
            
        reply_text = (
            "Entendido! Se quiser realizar uma nova simulação, digite *simular*.\n"
            "Caso queira ver detalhes de outro banco, digite o nome dele. Para ver as tabelas do banco atual, digite *tabelas*.\n"
            "Se não tiver mais dúvidas, basta me dizer *'obrigado'* ou *'encerrar'* para finalizarmos o atendimento. 😉"
        )
        session["messages"].append({"role": "bot", "text": reply_text, "timestamp": datetime.now().isoformat()})
        await save_chat_log(db, session, sender, False)
        return {
            "status": "success",
            "reply": reply_text,
            "sender": sender
        }

    # Default fallback
    session["messages"].append({"role": "bot", "text": "💡 *Dica:* Para realizar uma nova simulação de portabilidade a qualquer momento, basta digitar **simular** ou **reset**! 🚀", "timestamp": datetime.now().isoformat()})
    await save_chat_log(db, session, sender, False)
    return {
        "status": "success",
        "reply": "💡 *Dica:* Para realizar uma nova simulação de portabilidade a qualquer momento, basta digitar **simular** ou **reset**! 🚀"
    }



@router.post("/atendimento/garantir-protocolo")
async def garantir_protocolo(
    input_data: GarantirProtocoloInput,
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(verify_n8n_internal_key)
):
    sender = normalize_sender(input_data.sender)
    pushName = input_data.pushName
    
    if not sender:
        raise HTTPException(status_code=400, detail="Sender não informado.")
        
    if sender not in SENDER_LOCKS:
        SENDER_LOCKS[sender] = asyncio.Lock()
        
    async with SENDER_LOCKS[sender]:
        try:
            # 1. Obter usuário correspondente ao telefone
            result_users = await db.execute(select(User).where(User.active == True))
            active_users = result_users.scalars().all()
            
            matched_user = None
            for u in active_users:
                if u.phone and phones_match(sender, u.phone):
                    matched_user = u
                    break
                    
            if not matched_user:
                raise HTTPException(status_code=404, detail="Número de WhatsApp não cadastrado no sistema.")
                
            first_name = pushName or (matched_user.name.split()[0] if matched_user.name else "Cliente")
            
            # 2. Verificar se já existe atendimento ativo usando transação (row lock)
            stmt = select(WhatsappChatLog).where(
                WhatsappChatLog.sender_phone == sender,
                WhatsappChatLog.status == "active"
            ).order_by(WhatsappChatLog.created_at.desc()).with_for_update()
            
            res = await db.execute(stmt)
            active_logs = res.scalars().all()
            
            # Se existirem duplicados, marcar os anteriores como closed com close_reason = "duplicate_active_session"
            if len(active_logs) > 1:
                for old_active in active_logs[1:]:
                    old_active.status = "closed"
                    old_active.closed_at = func.now()
                    old_active.close_reason = "duplicate_active_session"
                await db.commit()
                # Refaz a query para lockar o único restante
                res = await db.execute(stmt)
                active_logs = res.scalars().all()
                
            last_log = active_logs[0] if active_logs else None
            
            # Se tivermos um log e o status for active, reutilizamos
            if last_log and last_log.status == "active":
                # Sincroniza em memória se não estiver ou se o protocolo diferir
                try:
                    msgs = json.loads(last_log.messages) if last_log.messages else []
                except:
                    msgs = []
                if isinstance(msgs, str):
                    try:
                        msgs = json.loads(msgs)
                    except:
                        msgs = []
                if not isinstance(msgs, list):
                    msgs = []

                session_data = {
                    "state": "idle",
                    "protocol": last_log.protocol.strip(),
                    "last_request_time": datetime.now().timestamp(),
                    "last_message": "",
                    "messages": msgs,
                    "user_id": last_log.user_id,
                    "client_name": last_log.client_name,
                    "ultima_simulacao": last_log.context_data
                }
                CHAT_SESSIONS[sender] = session_data
                
                return {
                    "success": True,
                    "novo_atendimento": False,
                    "protocolo": last_log.protocol.strip(),
                    "pushName": first_name,
                    "sender": sender
                }
                
            # 4. Criar novo atendimento (se não houver log ativo)
            novo_protocolo = generate_protocol(matched_user.name).strip()
            
            session_data = {
                "state": "idle",
                "protocol": novo_protocolo,
                "last_request_time": datetime.now().timestamp(),
                "last_message": "",
                "messages": [],
                "user_id": matched_user.id,
                "client_name": first_name,
                "ultima_simulacao": None
            }
            CHAT_SESSIONS[sender] = session_data
            
            new_log = WhatsappChatLog(
                protocol=novo_protocolo,
                sender_phone=sender,
                client_name=first_name,
                user_id=matched_user.id,
                status="active",
                messages=json.dumps([])
            )
            db.add(new_log)
            await db.commit()
            
            return {
                "success": True,
                "novo_atendimento": True,
                "protocolo": novo_protocolo,
                "pushName": first_name,
                "sender": sender
            }
        except HTTPException:
            raise
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Erro inesperado no servidor: {str(e)}")


@router.post("/atendimento/salvar-contexto-simulacao")
async def salvar_contexto_simulacao(
    input_data: SalvarContextoInput,
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(verify_n8n_internal_key)
):
    sender = normalize_sender(input_data.sender)
    if not sender:
        raise HTTPException(status_code=400, detail="Sender não informado.")

    if sender not in SENDER_LOCKS:
        SENDER_LOCKS[sender] = asyncio.Lock()
        
    async with SENDER_LOCKS[sender]:
        # Buscar no banco o atendimento active mais recente usando SELECT FOR UPDATE
        stmt = select(WhatsappChatLog).where(
            WhatsappChatLog.sender_phone == sender,
            WhatsappChatLog.status == "active"
        ).order_by(WhatsappChatLog.created_at.desc()).with_for_update()
        
        result = await db.execute(stmt)
        active_logs = result.scalars().all()
        
        # Prevenção/Resolução de duplicados ativos
        if len(active_logs) > 1:
            for old_active in active_logs[1:]:
                old_active.status = "closed"
                old_active.closed_at = func.now()
                old_active.close_reason = "duplicate_active_session"
            await db.commit()
            # Refazemos a query para obter o único active restante
            result = await db.execute(stmt)
            active_logs = result.scalars().all()
            
        chat_log = active_logs[0] if active_logs else None
        
        if not chat_log:
            raise HTTPException(status_code=404, detail="Atendimento ativo não encontrado para este sender")
            
        protocolo_do_banco = chat_log.protocol.strip()
        protocolo_recebido = input_data.protocolo.strip() if input_data.protocolo else ""
        
        # Se CHAT_SESSIONS contiver outro protocolo ou estiver vazia, substitui os dados da memória pelos do banco
        session = CHAT_SESSIONS.get(sender)
        if not session or session.get("protocol", "").strip() != protocolo_do_banco:
            try:
                msgs = json.loads(chat_log.messages) if chat_log.messages else []
            except:
                msgs = []
            if isinstance(msgs, str):
                try:
                    msgs = json.loads(msgs)
                except:
                    msgs = []
            if not isinstance(msgs, list):
                msgs = []
                
            session = {
                "state": "idle",
                "protocol": protocolo_do_banco,
                "last_request_time": datetime.now().timestamp(),
                "last_message": "",
                "messages": msgs,
                "user_id": chat_log.user_id,
                "client_name": chat_log.client_name,
                "ultima_simulacao": chat_log.context_data
            }
            CHAT_SESSIONS[sender] = session
            
        # Comparar novamente (e validar protocolo recebido)
        if protocolo_recebido != protocolo_do_banco:
            # Diagnóstico seguro sem vazar o protocolo ativo completo
            mascarado = sender
            if len(sender) > 6:
                mascarado = sender[:4] + "***" + sender[-4:]
            
            raise HTTPException(
                status_code=400,
                detail={
                    "detail": "Protocolo informado não corresponde ao atendimento ativo.",
                    "sender_normalizado": mascarado,
                    "protocolo_recebido_presente": bool(protocolo_recebido),
                    "atendimento_ativo_encontrado": True
                }
            )
            
        # Salvar contexto_simulacao no mesmo registro ativo
        chat_log.context_data = input_data.contexto_simulacao
        await db.commit()
        
        # Atualiza na memória também
        session["ultima_simulacao"] = input_data.contexto_simulacao
        
        return {
            "success": True,
            "contexto_salvo": True,
            "sender": sender,
            "protocolo": protocolo_do_banco
        }
