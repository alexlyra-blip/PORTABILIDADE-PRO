from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.services.admin_service import AdminService
from app.services.simulador_service import SimuladorService
from app.models.models import SimulacaoInput
from app.models.sqlalchemy_models import Bank, User
from app.routers.external import verify_n8n_key
from pydantic import BaseModel
from typing import Optional
import re
import json

router = APIRouter()

# In-memory storage for chat sessions
# Key: sender (e.g. WhatsApp number), Value: Dict of state/data
CHAT_SESSIONS = {}

class ChatMessageInput(BaseModel):
    sender: str
    message: str

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

async def query_rules(message: str, db: AsyncSession) -> Optional[str]:
    # Fetch all banks
    banks = await AdminService.get_all_banks(db)
    msg = message.lower()
    
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
    matched_bank = None
    for b in banks:
        if b.name.lower() in msg:
            matched_bank = b
            break
            
    if matched_bank:
        rules_text = []
        for r in matched_bank.rules:
            rules_text.append(
                f"🔹 *Convênio {r.agreement}*:\n"
                f"  - Idade: {r.min_age or 0} a {r.max_age or 100} anos\n"
                f"  - Prazo Máx: {r.max_term or 'N/A'} meses\n"
                f"  - Troco Mín: R$ {r.min_release_amount or '0.00'}\n"
                f"  - Parcela Mín: R$ {r.min_installment_value or '0.00'}\n"
                f"  - Aceita Analfabeto: {'SIM' if r.accepts_illiterate else 'NÃO'}\n"
                f"  - Aceita Invalidez: {'SIM' if r.accepts_disability else 'NÃO'}\n"
                f"  - Aceita LOAS: {'SIM' if r.accepts_loas else 'NÃO'}"
            )
        if rules_text:
            return f"🏛️ *Regras de Aceitação do {matched_bank.name}:*\n\n" + "\n\n".join(rules_text)
        else:
            return f"O banco {matched_bank.name} está cadastrado, mas não possui regras configuradas."

    return None

async def run_simulation_and_respond(session: dict, db: AsyncSession, user_id: int) -> str:
    try:
        # Convert and construct inputs
        input_data = SimulacaoInput(
            banco=session["banco_origem"],
            convenio=session["convenio"],
            idade=int(session["idade"]),
            parcela=float(session["parcela"]),
            saldo_devedor=float(session["saldo_devedor"]),
            total_term=int(session["total_term"]),
            remaining_term=int(session["remaining_term"]),
            analfabeto=session.get("analfabeto", False),
            especie_beneficio=session.get("benefit_species"),
            nome_cliente="Cliente WhatsApp"
        )
        
        res = await SimuladorService.executar(input_data, db, user_id=user_id)
        session["last_result"] = res
        
        ofertas = res.get("ofertas", [])
        
        if not ofertas:
            rejeitados = res.get("rejeitados", [])
            motivos = "\n".join(f"• *{r['banco']}*: {r['motivo']}" for r in rejeitados[:5])
            session["state"] = "idle"
            return (
                "❌ *Infelizmente nenhuma oferta foi aprovada para este perfil.*\n\n"
                f"Principais motivos de recusa:\n{motivos}\n\n"
                "Para iniciar uma nova simulação, digite *simular*."
            )
            
        best_offer = ofertas[0]
        session["active_bank"] = best_offer["banco"]
        
        qty_tabelas = len([o for o in ofertas if o["banco"] == best_offer["banco"]])
        
        other_banks = list(set(o["banco"] for o in ofertas if o["banco"] != best_offer["banco"]))
        other_banks_str = ", ".join(other_banks) if other_banks else "Nenhum"
        
        reply = (
            "🎉 *Excelente notícia! Simulação concluída com sucesso!* 🚀\n\n"
            f"⭐ *MELHOR OFERTA ENCONTRADA: {best_offer['banco']}*\n"
            f"📊 {qty_tabelas} tabela(s) de Refin da Portabilidade disponível(is)\n\n"
            "📋 *DETALHES DA OPERAÇÃO:*\n"
            f"• 🏷️ *Tabela:* {best_offer['tabela']}\n"
            f"• 💵 *Valor da Parcela:* R$ {best_offer['valor_parcela']:.2f}\n"
            f"• 📅 *Prazo:* {best_offer['prazo']} meses\n"
            f"• ✍️ *Novo Contrato:* R$ {best_offer['valor_total_contrato']:.2f}\n"
            f"• 🏦 *Saldo Devedor:* R$ {float(session['saldo_devedor']):.2f}\n"
            f"• 📈 *Taxa do Refin:* {best_offer['taxa_juros']}% a.m.\n\n"
            f"💰 *VALOR DO TROCO ESTIMADO LIBERADO: R$ {best_offer['valor_liberado']:.2f}* 🤑💵\n\n"
            f"🏛️ *Outros bancos também elegíveis:* {other_banks_str}\n\n"
            "💡 _Deseja ver a oferta de outro banco elegível acima? Basta digitar o nome dele (Ex: \"Itau\", \"Pan\")!_\n\n"
            f"✨ *Dica de Ouro:* Encontramos *{qty_tabelas}* tabelas com ofertas elegíveis para o *{best_offer['banco']}*. "
            "Para conhecer e comparar todas as opções deste banco ordenadas pelo menor troco, basta digitar *tabelas*! 📊"
        )
        session["state"] = "simulated"
        return reply
    except Exception as e:
        import traceback
        traceback.print_exc()
        return f"Erro ao processar simulação: {str(e)}"

def get_current_step_instruction(session: dict) -> str:
    state = session.get("state")
    if state == "waiting_convenio":
        return "Escolha o seu convênio:\n👉 INSS\n👉 SIAPE\n👉 GOVERNO\n👉 FORÇAS ARMADAS\n👉 CLT PRIVADO"
    elif state == "waiting_banco_origem":
        return "Informe o nome do Banco de Origem (atual):"
    elif state == "waiting_idade":
        return "Qual é a idade do cliente?"
    elif state == "waiting_parcela":
        return "Qual é o valor da parcela atual (R$)?"
    elif state == "waiting_saldo":
        return "Qual é o saldo devedor estimado (R$)?"
    elif state == "waiting_prazo_total":
        return "Qual é o prazo total do contrato original (meses)?"
    elif state == "waiting_prazo_restante":
        return "Quantas parcelas restantes (a pagar) faltam?"
    elif state == "waiting_especie":
        return "Informe o número da espécie do benefício (ou digite 'não sei' para continuar):"
    elif state == "waiting_analfabeto":
        return "O cliente é analfabeto? (Digite SIM ou NÃO):"
    return "Como posso te ajudar? Digite *simular* para iniciar uma nova simulação."

@router.post("/external/chat")
async def chat_interaction(
    input_data: ChatMessageInput,
    db: AsyncSession = Depends(get_db),
    api_key: str = Depends(verify_n8n_key)
):
    sender = input_data.sender
    message = input_data.message.strip()
    msg_lower = message.lower()
    
    # 1. Phone number validation
    result_users = await db.execute(select(User).where(User.active == True))
    active_users = result_users.scalars().all()
    
    matched_user = None
    for u in active_users:
        if u.phone and phones_match(sender, u.phone):
            matched_user = u
            break
            
    if not matched_user:
        return {
            "status": "success",
            "reply": "❌ *Número não cadastrado.*\n\nFavor entrar em contato com a sua promotora para cadastrar seu número de WhatsApp no sistema."
        }
        
    user_id = matched_user.id
    
    # Initialize session if not exists
    if sender not in CHAT_SESSIONS:
        CHAT_SESSIONS[sender] = {
            "state": "idle",
            "last_request_time": 0.0,
            "last_message": ""
        }
        
    session = CHAT_SESSIONS[sender]

    # Time-lock and duplicate request protection (rate limit)
    import time
    current_time = time.time()
    last_time = session.get("last_request_time", 0.0)
    last_msg = session.get("last_message", "")
    if (current_time - last_time < 1.5) and (message == last_msg):
        return {
            "status": "ignored",
            "reply": ""
        }
    session["last_request_time"] = current_time
    session["last_message"] = message
    
    # Intercept Reset or Simular request
    if msg_lower in ["reset", "sair", "cancelar", "/start", "simular", "novo", "nova simulação"]:
        last_time = session.get("last_request_time", 0.0)
        last_msg = session.get("last_message", "")
        CHAT_SESSIONS[sender] = {
            "state": "waiting_convenio",
            "convenio": None,
            "banco_origem": None,
            "idade": None,
            "parcela": None,
            "saldo_devedor": None,
            "total_term": None,
            "remaining_term": None,
            "analfabeto": False,
            "benefit_species": None,
            "last_request_time": last_time,
            "last_message": last_msg
        }
        session = CHAT_SESSIONS[sender]
        return {
            "status": "success",
            "reply": (
                f"👋 Olá! Eu sou o Gutto, o seu assistente virtual especialista em portabilidade de crédito consignado. 🤖✨\n\n"
                f"Para iniciarmos a sua simulação personalizada e rápida, por favor, me informe qual é o seu convênio? 👇\n\n"
                "👉 *INSS*\n"
                "👉 *SIAPE*\n"
                "👉 *GOVERNO*\n"
                "👉 *FORÇAS ARMADAS*\n"
                "👉 *CLT PRIVADO*"
            )
        }

    # Intercept Rules Queries at any time
    if "regra" in msg_lower or "aceita" in msg_lower or "idade" in msg_lower or "analfabeto" in msg_lower or "invalidez" in msg_lower or "loas" in msg_lower:
        rules_reply = await query_rules(message, db)
        if rules_reply:
            if session.get("state") != "idle" and session.get("state") != "simulated":
                current_step_msg = get_current_step_instruction(session)
                return {
                    "status": "success",
                    "reply": f"{rules_reply}\n\n🔄 *Retomando a simulação:* {current_step_msg}"
                }
            return {"status": "success", "reply": rules_reply}

    # Commands for simulated state
    if session.get("state") == "simulated" and "last_result" in session:
        ofertas = session["last_result"].get("ofertas", [])
        
        # 1. Tabelas request
        if msg_lower in ["tabela", "tabelas"]:
            active_bank = session.get("active_bank")
            bank_offers = [o for o in ofertas if o["banco"].upper() == active_bank.upper()]
            bank_offers.sort(key=lambda x: -x["valor_liberado"])
            
            if not bank_offers:
                return {"status": "success", "reply": f"Nenhuma tabela encontrada para o banco {active_bank}."}
                
            lines = []
            for idx, o in enumerate(bank_offers, 1):
                lines.append(
                    f"{idx}. *Tabela:* {o['tabela']}\n"
                    f"   • Taxa: {o['taxa_juros']}% a.m.\n"
                    f"   • Troco Estimado: R$ {o['valor_liberado']:.2f}\n"
                    f"   • Prazo: {o['prazo']} parcelas"
                )
            
            reply = f"📊 *Tabelas com Ofertas Elegíveis para o {active_bank}:*\n\n" + "\n\n".join(lines)
            return {"status": "success", "reply": reply}
            
        # 2. Check if user typed another bank name from other eligible banks list
        matched_offer = None
        for o in ofertas:
            # normalize names to compare
            bank_norm = re.sub(r'[^A-Z0-9]', '', o["banco"].upper())
            msg_norm = re.sub(r'[^A-Z0-9]', '', msg_lower.upper())
            if bank_norm in msg_norm or msg_norm in bank_norm:
                matched_offer = o
                break
                
        if matched_offer:
            session["active_bank"] = matched_offer["banco"]
            qty_tabelas = len([o for o in ofertas if o["banco"] == matched_offer["banco"]])
            reply = (
                f"⭐ *OFERTA ENCONTRADA: {matched_offer['banco']}*\n"
                f"📊 {qty_tabelas} tabela(s) de Refin da Portabilidade disponível(is)\n\n"
                "📋 *DETALHES DA OPERAÇÃO:*\n"
                f"• 🏷️ *Tabela:* {matched_offer['tabela']}\n"
                f"• 💵 *Valor da Parcela:* R$ {matched_offer['valor_parcela']:.2f}\n"
                f"• 📅 *Prazo:* {matched_offer['prazo']} meses\n"
                f"• ✍️ *Novo Contrato:* R$ {matched_offer['valor_total_contrato']:.2f}\n"
                f"• 🏦 *Saldo Devedor:* R$ {float(session['saldo_devedor']):.2f}\n"
                f"• 📈 *Taxa do Refin:* {matched_offer['taxa_juros']}% a.m.\n\n"
                f"💰 *VALOR DO TROCO ESTIMADO LIBERADO: R$ {matched_offer['valor_liberado']:.2f}* 🤑💵\n\n"
                f"✨ *Dica de Ouro:* Encontramos *{qty_tabelas}* tabelas com ofertas elegíveis para o *{matched_offer['banco']}*. "
                "Para conhecer e comparar todas as opções deste banco, basta digitar *tabelas*! 📊"
            )
            return {"status": "success", "reply": reply}

    # State Machine Handling
    state = session.get("state")
    
    if state == "idle":
        session["state"] = "waiting_convenio"
        return {
            "status": "success",
            "reply": (
                "👋 Olá! Eu sou o *Gutto*, o seu assistente virtual especialista em portabilidade de crédito consignado. 🤖✨\n\n"
                "Para iniciarmos a sua simulação personalizada e rápida, por favor, me informe qual é o seu **Convênio**? 👇\n\n"
                "👉 *INSS*\n"
                "👉 *SIAPE*\n"
                "👉 *GOVERNO*\n"
                "👉 *FORÇAS ARMADAS*\n"
                "👉 *CLT PRIVADO*"
            )
        }
        
    elif state == "waiting_convenio":
        # Parse Convenio
        val = msg_lower
        if "inss" in val:
            session["convenio"] = "INSS"
        elif "siape" in val:
            session["convenio"] = "SIAPE"
        elif "governo" in val or "gov" in val:
            session["convenio"] = "GOV_EST"
        elif "força" in val or "armed" in val or "militar" in val:
            session["convenio"] = "FORCAS"
        elif "clt" in val or "privado" in val:
            session["convenio"] = "CLT_PRIVADO"
        else:
            return {
                "status": "success",
                "reply": (
                    "⚠️ *Opção inválida.* Por favor, escolha um dos convênios abaixo digitando ou clicando: 👇\n\n"
                    "👉 *INSS*\n"
                    "👉 *SIAPE*\n"
                    "👉 *GOVERNO*\n"
                    "👉 *FORÇAS ARMADAS*\n"
                    "👉 *CLT PRIVADO*"
                )
            }
        session["state"] = "waiting_banco_origem"
        return {"status": "success", "reply": f"✅ *Convênio selecionado:* **{session['convenio']}** 🤝\n\n🏢 Agora, por favor, informe o nome do **Banco de Origem** (atual):"}
        
    elif state == "waiting_banco_origem":
        session["banco_origem"] = message.upper()
        session["state"] = "waiting_idade"
        return {"status": "success", "reply": f"✅ *Banco de Origem:* **{session['banco_origem']}** 🏦\n\nPerfeito! Qual é a **idade** do cliente? 🎂"}
        
    elif state == "waiting_idade":
        val = parse_integer(message)
        if val is None or val < 18 or val > 100:
            return {"status": "success", "reply": "⚠️ *Idade inválida.* Por favor, informe uma idade válida entre **18 e 100 anos**:"}
        session["idade"] = val
        session["state"] = "waiting_parcela"
        return {"status": "success", "reply": f"✅ *Idade do cliente:* **{val} anos** 📅\n\n💰 Qual é o **valor da parcela** atual do contrato (R$)? (Ex: 150,00)"}
        
    elif state == "waiting_parcela":
        val = parse_float(message)
        if val is None or val <= 0:
            return {"status": "success", "reply": "⚠️ *Valor inválido.* Por favor, informe um valor de parcela válido (Ex: **150,00**):"}
        session["parcela"] = val
        session["state"] = "waiting_saldo"
        return {"status": "success", "reply": f"✅ *Valor da parcela:* **R$ {val:.2f}** 💵\n\n💳 Qual é o **saldo devedor estimado** (R$)? (Ex: 5.000,00)"}
        
    elif state == "waiting_saldo":
        val = parse_float(message)
        if val is None or val <= 0:
            return {"status": "success", "reply": "⚠️ *Valor inválido.* Por favor, informe um saldo devedor válido (Ex: **5.000,00**):"}
        session["saldo_devedor"] = val
        session["state"] = "waiting_prazo_total"
        return {"status": "success", "reply": f"✅ *Saldo devedor:* **R$ {val:.2f}** 📈\n\n📅 Qual é o **prazo total** do contrato original (meses)? (Ex: 84 ou 120)"}
        
    elif state == "waiting_prazo_total":
        val = parse_integer(message)
        if val is None or val <= 0:
            return {"status": "success", "reply": "⚠️ *Prazo inválido.* Por favor, informe um prazo total válido em meses (Ex: **84**):"}
        session["total_term"] = val
        session["state"] = "waiting_prazo_restante"
        return {"status": "success", "reply": f"✅ *Prazo total:* **{val} meses** ⏳\n\n🔢 Quantas **parcelas restantes** (a pagar) faltam?"}
        
    elif state == "waiting_prazo_restante":
        val = parse_integer(message)
        if val is None or val <= 0:
            return {"status": "success", "reply": "⚠️ *Quantidade inválida.* Por favor, informe uma quantidade válida de parcelas restantes (Ex: **68**):"}
        session["remaining_term"] = val
        
        # Check if INSS requires extra fields
        if session["convenio"] == "INSS":
            session["state"] = "waiting_especie"
            return {"status": "success", "reply": f"✅ *Parcelas restantes:* **{val}** 📅\n\n🔢 Como o convênio é INSS, informe o número da **espécie do benefício** (Ex: 41, ou digite **não sei** para continuar):"}
        else:
            # Skip directly to simulation
            reply = await run_simulation_and_respond(session, db, user_id=user_id)
            return {"status": "success", "reply": f"✅ *Parcelas restantes:* **{val}** ⚙️\n\n⏳ _Processando simulação..._\n\n{reply}"}
            
    elif state == "waiting_especie":
        if msg_lower in ["não sei", "nao sei", "ignorar", "pular", "não"]:
            session["benefit_species"] = None
            spec_str = "Não informada"
        else:
            session["benefit_species"] = message
            spec_str = message
        session["state"] = "waiting_analfabeto"
        return {"status": "success", "reply": f"✅ *Espécie do benefício:* **{spec_str}** 🔢\n\n✍️ O cliente é **analfabeto**? (Responda **SIM** ou **NÃO**):"}
        
    elif state == "waiting_analfabeto":
        if "sim" in msg_lower:
            session["analfabeto"] = True
            analf_str = "Sim"
        else:
            session["analfabeto"] = False
            analf_str = "Não"
            
        reply = await run_simulation_and_respond(session, db, user_id=user_id)
        return {"status": "success", "reply": f"✅ *Cliente analfabeto:* **{analf_str}** ✍️\n\n⏳ _Processando simulação..._\n\n{reply}"}

    # Default fallback
    return {
        "status": "success",
        "reply": "💡 *Dica:* Para realizar uma nova simulação de portabilidade a qualquer momento, basta digitar **simular** ou **reset**! 🚀"
    }
