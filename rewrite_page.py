import re

with open('frontend/src/app/admin/promotora-rules/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import for inssBanks
content = content.replace('import { api } from "@/utils/api";', 'import { api } from "@/utils/api";\nimport { inssBanks } from "@/utils/constants";')

# State for new rules
new_state = """  // Origin Bank State
  const [originRules, setOriginRules] = useState<any[]>([]);
  const [newOriginRule, setNewOriginRule] = useState({ origin_bank: "", min_paid: "" });

  // Origin Bank Blocklist
  const [blockedOriginBanks, setBlockedOriginBanks] = useState<any[]>([]);
  const [newBlockedOriginBank, setNewBlockedOriginBank] = useState("");

  // Simulation Bank Blocklist
  const [visibleBanks, setVisibleBanks] = useState<Bank[]>([]);
  const [newBlockedSimBank, setNewBlockedSimBank] = useState("");"""
content = content.replace('  // Origin Bank State\n  const [originRules, setOriginRules] = useState<any[]>([]);\n  const [newOriginRule, setNewOriginRule] = useState({ origin_bank: "", min_paid: "" });', new_state)

# Load rules
load_rules_replacement = """        api.get("/admin/sub-logos"),
        api.get(`/admin/users/${userId}/rules`),
        api.get(`/admin/users/${userId}/visible-banks`)
      ]);

      setBanks(banksData);
      setSubLogos(subLogosData);
      setVisibleBanks(visibleBanksData);

      // Parse rules
      const priorityRule = rulesData.find((r: any) => r.rule_key === "priority_config");
      if (priorityRule) setPriorities(JSON.parse(priorityRule.rule_value));

      const originRule = rulesData.find((r: any) => r.rule_key === "origin_bank_config");
      if (originRule) setOriginRules(JSON.parse(originRule.rule_value));

      const blockedOriginRule = rulesData.find((r: any) => r.rule_key === "origin_bank_blocklist");
      if (blockedOriginRule) setBlockedOriginBanks(JSON.parse(blockedOriginRule.rule_value));"""
content = re.sub(r'api\.get\("/admin/sub-logos"\),\n\s*api\.get\(`/admin/users/\$\{userId\}/rules`\)\n\s*\]\);\n\n\s*setBanks\(banksData\);\n\s*setSubLogos\(subLogosData\);\n\n\s*// Parse rules\n\s*const priorityRule = rulesData\.find\(\(r: any\) => r\.rule_key === "priority_config"\);\n\s*if \(priorityRule\) setPriorities\(JSON\.parse\(priorityRule\.rule_value\)\);\n\n\s*const originRule = rulesData\.find\(\(r: any\) => r\.rule_key === "origin_bank_config"\);\n\s*if \(originRule\) setOriginRules\(JSON\.parse\(originRule\.rule_value\)\);', load_rules_replacement, content)

# Save functions (fixing url to body)
save_func = """  const savePriorities = async (updated: any[]) => {
    if (!loggedUser) return;
    try {
      await api.post(`/admin/users/${loggedUser.id}/rules`, { rule_key: "priority_config", rule_value: JSON.stringify(updated) });
      setPriorities(updated);
    } catch (error) {
      alert("Erro ao salvar prioridades");
    }
  };

  const saveOriginRules = async (updated: any[]) => {
    if (!loggedUser) return;
    try {
      await api.post(`/admin/users/${loggedUser.id}/rules`, { rule_key: "origin_bank_config", rule_value: JSON.stringify(updated) });
      setOriginRules(updated);
    } catch (error) {
      alert("Erro ao salvar regras de origem");
    }
  };

  const saveBlockedOriginBanks = async (updated: any[]) => {
    if (!loggedUser) return;
    try {
      await api.post(`/admin/users/${loggedUser.id}/rules`, { rule_key: "origin_bank_blocklist", rule_value: JSON.stringify(updated) });
      setBlockedOriginBanks(updated);
    } catch (error) {
      alert("Erro ao salvar bloqueio de origem");
    }
  };

  const toggleSimBankBlock = async (bank_name: string, is_visible: boolean) => {
    if (!loggedUser) return;
    try {
      await api.post(`/admin/users/${loggedUser.id}/visible-banks`, { bank_name, is_visible });
      // Reload visible banks
      const visibleBanksData = await api.get(`/admin/users/${loggedUser.id}/visible-banks`);
      setVisibleBanks(visibleBanksData);
    } catch (error) {
      alert("Erro ao bloquear banco para simulação");
    }
  };"""

content = re.sub(r'const savePriorities = async.*?alert\("Erro ao salvar regras de origem"\);\n\s*\}\n\s*\};', save_func, content, flags=re.DOTALL)

# Add new blocked origin / sim bank functions
add_func = """  const addBlockedOriginBank = () => {
    if (!newBlockedOriginBank) return;
    const bankItem = inssBanks.find(b => b.value === newBlockedOriginBank);
    if (!bankItem) return;
    const updated = [...blockedOriginBanks, { origin_bank: bankItem.label, id: Date.now() }];
    saveBlockedOriginBanks(updated);
    setNewBlockedOriginBank("");
  };

  const removeBlockedOriginBank = (id: number) => {
    const updated = blockedOriginBanks.filter(p => p.id !== id);
    saveBlockedOriginBanks(updated);
  };

  const blockSimBank = () => {
    if (!newBlockedSimBank) return;
    const bank = banks.find(b => b.id === Number(newBlockedSimBank));
    if (bank) {
      toggleSimBankBlock(bank.name, false);
      setNewBlockedSimBank("");
    }
  };

  const unblockSimBank = (bank_name: string) => {
    toggleSimBankBlock(bank_name, true);
  };"""
content = content.replace('  const removeOriginRule = (id: number) => {\n    const updated = originRules.filter(p => p.id !== id);\n    saveOriginRules(updated);\n  };', '  const removeOriginRule = (id: number) => {\n    const updated = originRules.filter(p => p.id !== id);\n    saveOriginRules(updated);\n  };\n\n' + add_func)

# Fix addOriginRule to use inssBanks
add_origin = """  const addOriginRule = () => {
    if (!newOriginRule.origin_bank || !newOriginRule.min_paid) return;
    const bankItem = inssBanks.find(b => b.value === newOriginRule.origin_bank);
    if (!bankItem) return;
    const updated = [...originRules, { 
      ...newOriginRule, 
      origin_bank: bankItem.label,
      id: Date.now() 
    }];
    saveOriginRules(updated);
    setNewOriginRule({ origin_bank: "", min_paid: "" });
  };"""
content = re.sub(r'const addOriginRule = \(\) => \{.*?setNewOriginRule\(\{ origin_bank: "", min_paid: "" \}\);\n\s*\};', add_origin, content, flags=re.DOTALL)

# Fix origin banks select dropdowns
origin_select = """              <select 
                value={newOriginRule.origin_bank}
                onChange={e => setNewOriginRule({...newOriginRule, origin_bank: e.target.value})}
                className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 outline-none font-bold text-sm bg-white"
              >
                <option value="">Selecione...</option>
                {inssBanks.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>"""
content = re.sub(r'<select \n\s*value=\{newOriginRule\.origin_bank\}.*?</select>', origin_select, content, flags=re.DOTALL, count=1)


# We need to add the new sections to the UI
# 1. Sim Bank Block next to Priorities
new_sim_block = """        {/* BLOQUEIO DE BANCOS PARA SIMULAÇÃO */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-red-200">🚫</div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Bloqueio para Simulação</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Selecione bancos que não podem receber simulação</p>
            </div>
          </div>

          <div className="flex gap-4 mb-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <div className="flex-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Banco Destino</label>
              <select 
                value={newBlockedSimBank}
                onChange={e => setNewBlockedSimBank(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 focus:border-red-500 outline-none font-bold text-sm bg-white"
              >
                <option value="">Selecione para bloquear...</option>
                {banks.filter(b => visibleBanks.some(vb => vb.name === b.name)).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button 
                onClick={blockSimBank}
                className="w-16 h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl flex items-center justify-center text-xl shadow-lg shadow-red-200 transition-all active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence>
              {banks.filter(b => !visibleBanks.some(vb => vb.name === b.name)).map((b) => (
                <motion.div 
                  key={b.id}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group"
                >
                  <div className="flex items-center gap-4">
                    <span className="w-10 h-10 bg-red-600 text-white text-xs font-black rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-red-100">🚫</span>
                    <div>
                      <p className="text-sm font-black text-slate-900">{b.name}</p>
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-[0.2em]">Bloqueado para toda equipe</p>
                    </div>
                  </div>
                  <button onClick={() => unblockSimBank(b.name)} className="text-slate-300 hover:text-emerald-500 p-2 transition-colors" title="Desbloquear">🔄</button>
                </motion.div>
              ))}
              {banks.filter(b => !visibleBanks.some(vb => vb.name === b.name)).length === 0 && <p className="text-center py-8 text-slate-400 font-bold uppercase text-xs tracking-widest italic">Nenhum banco bloqueado</p>}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* REGRAS DE ORIGEM */}"""
content = content.replace('{/* REGRAS DE ORIGEM */}', new_sim_block)

# 2. Blocked Origin Bank next to Regras de Origem
new_origin_block = """        {/* BLOQUEIO DE BANCOS ORIGEM */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-orange-200">🛑</div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Bloqueio de Banco Origem</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Impeça a portabilidade de bancos específicos</p>
            </div>
          </div>

          <div className="flex gap-4 mb-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <div className="flex-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Instituição de Origem</label>
              <select 
                value={newBlockedOriginBank}
                onChange={e => setNewBlockedOriginBank(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 focus:border-orange-500 outline-none font-bold text-sm bg-white"
              >
                <option value="">Selecione para bloquear...</option>
                {inssBanks.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button 
                onClick={addBlockedOriginBank}
                className="w-16 h-12 bg-orange-600 hover:bg-orange-700 text-white rounded-xl flex items-center justify-center text-xl shadow-lg shadow-orange-200 transition-all active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence>
              {blockedOriginBanks.map((r) => (
                <motion.div 
                  key={r.id}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group"
                >
                  <div className="flex items-center gap-4">
                    <span className="w-10 h-10 bg-orange-600 text-white text-xs font-black rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-orange-100">🛑</span>
                    <div>
                      <p className="text-sm font-black text-slate-900">{r.origin_bank}</p>
                      <p className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em]">Não permite portabilidade</p>
                    </div>
                  </div>
                  <button onClick={() => removeBlockedOriginBank(r.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors">🗑️</button>
                </motion.div>
              ))}
              {blockedOriginBanks.length === 0 && <p className="text-center py-8 text-slate-400 font-bold uppercase text-xs tracking-widest italic">Nenhum banco bloqueado</p>}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>"""
content = content.replace('      </div>\n    </div>\n  );\n}', new_origin_block + '\n    </div>\n  );\n}')

with open('frontend/src/app/admin/promotora-rules/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
