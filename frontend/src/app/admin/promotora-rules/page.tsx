"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { api } from "@/utils/api";
import { inssBanks } from "@/utils/constants";
import { motion, AnimatePresence } from "framer-motion";

const Icons = {
  Trophy: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
  ),
  Landmark: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="22" y2="22" /><line x1="6" x2="6" y1="18" y2="11" /><line x1="10" x2="10" y1="18" y2="11" /><line x1="14" x2="14" y1="18" y2="11" /><line x1="18" x2="18" y1="18" y2="11" /><polygon points="12 2 20 7 4 7 12 2" /></svg>
  ),
  ShieldBan: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2-1 4-2 7-2 2.82 1 5.3 1.98 7 2a1 1 0 0 1 1 1z" /><path d="m4.73 4.73 14.54 14.54" /></svg>
  ),
  Ban: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></svg>
  ),
  Trash: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
  ),
  Unlock: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
  ),
  RefreshCw: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
  )
};

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
  const [buttonColor, setButtonColor] = useState('#2563eb');

  // Priority State
  const [priorities, setPriorities] = useState<any[]>([]);
  const [newPriority, setNewPriority] = useState({ convenio: "INSS", bank_id: "", priority: "" });

  // Origin Bank State
  const [originRules, setOriginRules] = useState<any[]>([]);
  const [newOriginRule, setNewOriginRule] = useState({ origin_bank: "", min_paid: "" });

  // Origin Bank Blocklist
  const [blockedOriginBanks, setBlockedOriginBanks] = useState<any[]>([]);
  const [newBlockedOriginBank, setNewBlockedOriginBank] = useState("");

  // Simulation Bank Blocklist
  const [visibleBanks, setVisibleBanks] = useState<Bank[]>([]);
  const [newBlockedSimBank, setNewBlockedSimBank] = useState("");

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      const parsed = JSON.parse(u);
      setLoggedUser(parsed);
      loadAll(parsed.id);
    }
    const uc = localStorage.getItem('userColor');
    if (uc) setButtonColor(uc);
  }, []);

  const loadAll = async (userId: number) => {
    try {
      setLoading(true);
      const [banksData, subLogosData, rulesData, visibleBanksData] = await Promise.all([
        api.get("/admin/banks"),
        api.get("/admin/sub-logos"),
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
      if (blockedOriginRule) setBlockedOriginBanks(JSON.parse(blockedOriginRule.rule_value));

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

    const savePriorities = async (updated: any[]) => {
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
    const bankItem = inssBanks.find(b => b.value === newOriginRule.origin_bank);
    if (!bankItem) return;
    const updated = [...originRules, { 
      ...newOriginRule, 
      origin_bank: bankItem.label,
      id: Date.now() 
    }];
    saveOriginRules(updated);
    setNewOriginRule({ origin_bank: "", min_paid: "" });
  };

  const removeOriginRule = (id: number) => {
    const updated = originRules.filter(p => p.id !== id);
    saveOriginRules(updated);
  };

  const addBlockedOriginBank = () => {
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
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-blue-200">
              <Icons.Trophy size={24} />
            </div>
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
                  className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-sm bg-white text-center"
                />
              </div>
            </div>
            <div className="md:col-span-12 flex justify-end">
                <button 
                  onClick={addPriority}
                  className="px-8 h-12 text-white rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl hover:brightness-110"
                  style={{ backgroundColor: buttonColor, boxShadow: `0 10px 20px -5px ${buttonColor}60` }}
                >
                  Adicionar Prioridade
                </button>
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

                {/* BLOQUEIO DE BANCOS PARA SIMULAÇÃO */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-red-200">
              <Icons.Ban size={24} />
            </div>
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
          </div>
          <div className="mb-6 flex justify-end">
              <button 
                onClick={blockSimBank}
                className="px-8 h-12 text-white rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl hover:brightness-110"
                style={{ backgroundColor: buttonColor, boxShadow: `0 10px 20px -5px ${buttonColor}60` }}
              >
                Bloquear Simulação
              </button>
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
                    <span className="w-10 h-10 bg-red-600 text-white text-xs font-black rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-red-100"><Icons.Ban size={16} /></span>
                    <div>
                      <p className="text-sm font-black text-slate-900">{b.name}</p>
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-[0.2em]">Bloqueado para toda equipe</p>
                    </div>
                  </div>
                  <button onClick={() => unblockSimBank(b.name)} className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors" title="Desbloquear"><Icons.RefreshCw size={16} /></button>
                </motion.div>
              ))}
              {banks.filter(b => !visibleBanks.some(vb => vb.name === b.name)).length === 0 && <p className="text-center py-8 text-slate-400 font-bold uppercase text-xs tracking-widest italic">Nenhum banco bloqueado</p>}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* REGRAS DE ORIGEM */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-emerald-200">
              <Icons.Landmark size={24} />
            </div>
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
                {inssBanks.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Mín. Parc. Pagas</label>
              <input 
                  type="number" 
                  value={newOriginRule.min_paid}
                  onChange={e => setNewOriginRule({...newOriginRule, min_paid: e.target.value})}
                  placeholder="Ex: 12"
                  className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 outline-none font-bold text-sm bg-white text-center"
                />
            </div>
            <div className="md:col-span-12 flex justify-end">
                <button 
                  onClick={addOriginRule}
                  className="px-8 h-12 text-white rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl hover:brightness-110"
                  style={{ backgroundColor: buttonColor, boxShadow: `0 10px 20px -5px ${buttonColor}60` }}
                >
                  Adicionar Regra
                </button>
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
                      <span className="w-10 h-10 bg-emerald-600 text-white text-xs font-black rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-emerald-100"><Icons.Landmark size={16} /></span>
                    )}
                    <div>
                      <p className="text-sm font-black text-slate-900">{r.origin_bank}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Mínimo {r.min_paid} parcelas pagas</p>
                    </div>
                  </div>
                  <button onClick={() => removeOriginRule(r.id)} className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"><Icons.Trash size={16} /></button>
                </motion.div>
              ))}
              {originRules.length === 0 && <p className="text-center py-8 text-slate-400 font-bold uppercase text-xs tracking-widest italic">Nenhuma regra de origem definida</p>}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* BLOQUEIO DE BANCOS ORIGEM */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-white text-xl shadow-lg shadow-slate-300">
              <Icons.ShieldBan size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Bloqueio de Banco Origem</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Impeça a portabilidade de bancos específicos</p>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <div className="mb-4">
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
            <div className="flex justify-end">
              <button 
                onClick={addBlockedOriginBank}
                className="px-8 h-12 text-white rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl hover:brightness-110"
                style={{ backgroundColor: buttonColor, boxShadow: `0 10px 20px -5px ${buttonColor}60` }}
              >
                Bloquear Banco Origem
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
                    <span className="w-10 h-10 bg-orange-600 text-white text-xs font-black rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-orange-100"><Icons.ShieldBan size={16} /></span>
                    <div>
                      <p className="text-sm font-black text-slate-900">{r.origin_bank}</p>
                      <p className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em]">Não permite portabilidade</p>
                    </div>
                  </div>
                  <button onClick={() => removeBlockedOriginBank(r.id)} className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"><Icons.Trash size={16} /></button>
                </motion.div>
              ))}
              {blockedOriginBanks.length === 0 && <p className="text-center py-8 text-slate-400 font-bold uppercase text-xs tracking-widest italic">Nenhum banco bloqueado</p>}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
