"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { api } from "@/utils/api";
import { motion, AnimatePresence } from "framer-motion";

interface PromotoraRule {
  id: number;
  rule_key: string;
  rule_value: string;
}

interface Bank {
  id: number;
  name: string;
}

interface SubLogo {
  id: number;
  name: string;
}

export default function PromotoraRulesPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [subLogos, setSubLogos] = useState<SubLogo[]>([]);
  const [loggedUser, setLoggedUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Priority State
  const [priorities, setPriorities] = useState<any[]>([]);
  const [newPriority, setNewPriority] = useState({ convenio: "INSS", bank_id: "", priority: "" });

  // Origin Bank State
  const [originRules, setOriginRules] = useState<any[]>([]);
  const [newOriginRule, setNewOriginRule] = useState({ origin_bank: "", min_paid: "" });

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      const parsed = JSON.parse(u);
      setLoggedUser(parsed);
      loadAll(parsed.id);
    }
  }, []);

  const loadAll = async (userId: number) => {
    try {
      setLoading(true);
      const [banksData, subLogosData, rulesData] = await Promise.all([
        api.get("/admin/banks"),
        api.get("/admin/sub-logos"),
        api.get(`/admin/users/${userId}/rules`)
      ]);

      setBanks(banksData);
      setSubLogos(subLogosData);

      // Parse rules
      const priorityRule = rulesData.find((r: any) => r.rule_key === "priority_config");
      if (priorityRule) setPriorities(JSON.parse(priorityRule.rule_value));

      const originRule = rulesData.find((r: any) => r.rule_key === "origin_bank_config");
      if (originRule) setOriginRules(JSON.parse(originRule.rule_value));

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const savePriorities = async (updated: any[]) => {
    if (!loggedUser) return;
    try {
      await api.post(`/admin/users/${loggedUser.id}/rules?rule_key=priority_config&rule_value=${encodeURIComponent(JSON.stringify(updated))}`, {});
      setPriorities(updated);
    } catch (error) {
      alert("Erro ao salvar prioridades");
    }
  };

  const saveOriginRules = async (updated: any[]) => {
    if (!loggedUser) return;
    try {
      await api.post(`/admin/users/${loggedUser.id}/rules?rule_key=origin_bank_config&rule_value=${encodeURIComponent(JSON.stringify(updated))}`, {});
      setOriginRules(updated);
    } catch (error) {
      alert("Erro ao salvar regras de origem");
    }
  };

  const addPriority = () => {
    if (!newPriority.bank_id || !newPriority.priority) return;
    const bank = banks.find(b => b.id === Number(newPriority.bank_id));
    const updated = [...priorities, { 
      ...newPriority, 
      bank_name: bank?.name || "", 
      logo_url: (bank as any)?.logo_url,
      id: Date.now() 
    }];
    savePriorities(updated);
    setNewPriority({ convenio: "INSS", bank_id: "", priority: "" });
  };

  const removePriority = (id: number) => {
    const updated = priorities.filter(p => p.id !== id);
    savePriorities(updated);
  };

  const addOriginRule = () => {
    if (!newOriginRule.origin_bank || !newOriginRule.min_paid) return;
    const subLogo = subLogos.find(l => l.name === newOriginRule.origin_bank);
    const bank = banks.find(b => b.name === newOriginRule.origin_bank);
    const updated = [...originRules, { 
      ...newOriginRule, 
      logo_url: (subLogo as any)?.logo_url || (bank as any)?.logo_url,
      id: Date.now() 
    }];
    saveOriginRules(updated);
    setNewOriginRule({ origin_bank: "", min_paid: "" });
  };

  const removeOriginRule = (id: number) => {
    const updated = originRules.filter(p => p.id !== id);
    saveOriginRules(updated);
  };

  const getStaticUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `http://localhost:8000${path.startsWith('/') ? '' : '/'}${path}`;
  };

  if (loading) return <div className="p-8 text-center font-bold text-slate-500">Carregando...</div>;

  return (
    <div className="p-4 lg:p-8 space-y-8 bg-slate-50 min-h-screen">
      <PageHeader
        title="Configurações de Regras da"
        highlight="Promotora"
        subtitle="Personalize prioridades de bancos e restrições de instituições de origem."
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* PRIORIDADE DE BANCOS */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-blue-200">🏆</div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Prioridade de Bancos</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Defina quais bancos aparecem primeiro por convênio</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <div className="md:col-span-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Convênio</label>
              <select 
                value={newPriority.convenio}
                onChange={e => setNewPriority({...newPriority, convenio: e.target.value})}
                className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-sm bg-white"
              >
                <option value="INSS">INSS</option>
                <option value="SIAPE">SIAPE</option>
                <option value="EXERCITO">EXÉRCITO</option>
                <option value="MARINHA">MARINHA</option>
                <option value="AERONAUTICA">AERONÁUTICA</option>
              </select>
            </div>
            <div className="md:col-span-5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Banco</label>
              <select 
                value={newPriority.bank_id}
                onChange={e => setNewPriority({...newPriority, bank_id: e.target.value})}
                className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-sm bg-white"
              >
                <option value="">Selecione...</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Prioridade</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={newPriority.priority}
                  onChange={e => setNewPriority({...newPriority, priority: e.target.value})}
                  placeholder="Nº"
                  className="w-20 h-12 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-sm bg-white text-center"
                />
                <button 
                  onClick={addPriority}
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center text-xl shadow-lg shadow-blue-200 transition-all active:scale-95"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence>
              {priorities.map((p) => (
                <motion.div 
                  key={p.id}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group"
                >
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 bg-blue-600 text-white text-xs font-black rounded-lg flex items-center justify-center shrink-0 shadow-md shadow-blue-100">#{p.priority}</span>
                    {p.logo_url && (
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-100 shadow-sm shrink-0">
                        <img src={getStaticUrl(p.logo_url) || ""} className="w-full h-full object-contain" alt="" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-black text-slate-900">{p.bank_name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{p.convenio}</p>
                    </div>
                  </div>
                  <button onClick={() => removePriority(p.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors">🗑️</button>
                </motion.div>
              ))}
              {priorities.length === 0 && <p className="text-center py-8 text-slate-400 font-bold uppercase text-xs tracking-widest italic">Nenhuma prioridade definida</p>}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* REGRAS DE ORIGEM */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-emerald-200">🏛️</div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Regras por Banco de Origem</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Defina parcelas pagas mínimas por banco portado</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <div className="md:col-span-7">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Instituição de Origem</label>
              <select 
                value={newOriginRule.origin_bank}
                onChange={e => setNewOriginRule({...newOriginRule, origin_bank: e.target.value})}
                className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 outline-none font-bold text-sm bg-white"
              >
                <option value="">Selecione...</option>
                {subLogos.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                {banks.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Mín. Parc. Pagas</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={newOriginRule.min_paid}
                  onChange={e => setNewOriginRule({...newOriginRule, min_paid: e.target.value})}
                  placeholder="Ex: 12"
                  className="w-20 h-12 px-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 outline-none font-bold text-sm bg-white text-center"
                />
                <button 
                  onClick={addOriginRule}
                  className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center text-xl shadow-lg shadow-emerald-200 transition-all active:scale-95"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence>
              {originRules.map((r) => (
                <motion.div 
                  key={r.id}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group"
                >
                  <div className="flex items-center gap-4">
                    {r.logo_url ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-100 shadow-sm shrink-0">
                        <img src={getStaticUrl(r.logo_url) || ""} className="w-full h-full object-contain" alt="" />
                      </div>
                    ) : (
                      <span className="w-10 h-10 bg-emerald-600 text-white text-xs font-black rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-emerald-100">🏛️</span>
                    )}
                    <div>
                      <p className="text-sm font-black text-slate-900">{r.origin_bank}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Mínimo {r.min_paid} parcelas pagas</p>
                    </div>
                  </div>
                  <button onClick={() => removeOriginRule(r.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors">🗑️</button>
                </motion.div>
              ))}
              {originRules.length === 0 && <p className="text-center py-8 text-slate-400 font-bold uppercase text-xs tracking-widest italic">Nenhuma regra de origem definida</p>}
            </AnimatePresence>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
