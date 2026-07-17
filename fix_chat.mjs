import fs from 'fs';

let code = fs.readFileSync('backend/app/routers/chat.py', 'utf-8');

// Fix emoji formatting (use regex to ensure multiple spaces aren't an issue, but string replace should work if exact)
code = code.replace(
    'return "Escolha o seu convênio:\\n👉 INSS\\n👉 SIAPE\\n👉 GOVERNO\\n👉 FORÇAS ARMADAS\\n👉 CLT PRIVADO"',
    'return "Escolha o seu convênio:\\n1️⃣ INSS\\n2️⃣ SIAPE\\n3️⃣ GOVERNO\\n4️⃣ FORÇAS ARMADAS\\n5️⃣ CLT PRIVADO"'
);

code = code.replace(
    '"👉 *INSS*\\n"\\\n                    "👉 *SIAPE*\\n"\\\n                    "👉 *GOVERNO*\\n"\\\n                    "👉 *FORÇAS ARMADAS*\\n"\\\n                    "👉 *CLT PRIVADO*"',
    '"1️⃣ *INSS*\\n"\\\n                    "2️⃣ *SIAPE*\\n"\\\n                    "3️⃣ *GOVERNO*\\n"\\\n                    "4️⃣ *FORÇAS ARMADAS*\\n"\\\n                    "5️⃣ *CLT PRIVADO*"'
);
code = code.replace(
    '"👉 *INSS*\\r\\n"\\\r\n                    "👉 *SIAPE*\\r\\n"\\\r\n                    "👉 *GOVERNO*\\r\\n"\\\r\n                    "👉 *FORÇAS ARMADAS*\\r\\n"\\\r\n                    "👉 *CLT PRIVADO*"',
    '"1️⃣ *INSS*\\n"\\\n                    "2️⃣ *SIAPE*\\n"\\\n                    "3️⃣ *GOVERNO*\\n"\\\n                    "4️⃣ *FORÇAS ARMADAS*\\n"\\\n                    "5️⃣ *CLT PRIVADO*"'
);


// Fix indentation for the INSS check in waiting_prazo_restante
let buggyInssBlock = `        if session["convenio"] == "INSS":
            session["state"] = "waiting_especie"
            reply_text = f"✅ *Parcelas restantes:* **{val} meses**"
            session["messages"].append({"role": "bot", "text": reply_text, "timestamp": datetime.now().isoformat()})
            await save_chat_log(db, session, sender, False)
            return {
                "status": "success",
                "reply": reply_text
            }
            # Skip directly to simulation
            reply = await run_simulation_and_respond(session, db, user_id=user_id)
            reply_text = f"✅ *Parcelas restantes:* **{val} meses**"
            session["messages"].append({"role": "bot", "text": reply_text, "timestamp": datetime.now().isoformat()})
            await save_chat_log(db, session, sender, False)
            return {
                "status": "success",
                "reply": reply_text
            }`;
            
// If file uses \r\n, fix it
buggyInssBlock = buggyInssBlock.replace(/\n/g, '\r\n');

let correctInssBlock = `        if session["convenio"] == "INSS":
            session["state"] = "waiting_especie"
            reply_text = f"✅ *Parcelas restantes:* **{val} meses**"
            session["messages"].append({"role": "bot", "text": reply_text, "timestamp": datetime.now().isoformat()})
            await save_chat_log(db, session, sender, False)
            return {
                "status": "success",
                "reply": reply_text
            }
        else:
            # Skip directly to simulation
            reply = await run_simulation_and_respond(session, db, user_id=user_id)
            reply_text = f"✅ *Parcelas restantes:* **{val} meses**"
            session["messages"].append({"role": "bot", "text": reply_text, "timestamp": datetime.now().isoformat()})
            await save_chat_log(db, session, sender, False)
            return {
                "status": "success",
                "reply": reply_text
            }`.replace(/\n/g, '\r\n');

if (code.includes(buggyInssBlock)) {
    code = code.replace(buggyInssBlock, correctInssBlock);
} else {
    console.log("Buggy INSS block not found, trying with \n instead of \r\n");
    let b2 = buggyInssBlock.replace(/\r\n/g, '\n');
    let c2 = correctInssBlock.replace(/\r\n/g, '\n');
    if (code.includes(b2)) {
        code = code.replace(b2, c2);
    }
}

const lines = code.split(/\r?\n/);
let modified = 0;

for(let i=0; i<lines.length; i++) {
    if (lines[i].includes('reply_text = f"✅') && !lines[i].includes('get_current_step_instruction') && !lines[i].includes('{reply}')) {
        if (lines[i].includes('Cliente analfabeto') || (i > 0 && lines[i-1].includes('run_simulation_and_respond'))) {
            lines[i] = lines[i] + ' + f"\\n\\n{reply}"';
        } else {
            lines[i] = lines[i] + ' + f"\\n\\n{get_current_step_instruction(session)}"';
        }
        modified++;
    }
}

fs.writeFileSync('backend/app/routers/chat.py', lines.join('\r\n'));
console.log('Modified', modified, 'lines with next step appending');
