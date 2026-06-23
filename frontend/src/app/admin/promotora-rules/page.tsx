"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { api, getStaticUrl } from "@/utils/api";
import { inssBanks } from "@/utils/constants";
import { motion, AnimatePresence } from "framer-motion";

import { Icons } from "@/components/Icons";


interface PromotoraRule {
  id: number;
  rule_key: string;
  rule_value: string;
}

interface Bank {
  id: number;
  name: string;
  logo_url?: string;
}

interface SubLogo {
  id: number;
  name: string;
  logo_url?: string;
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

  const getBankLogo = (bankName: string, savedLogoUrl?: string | null) => {
    if (savedLogoUrl) return savedLogoUrl;
    if (!bankName) return null;
    
    const norm = (s: string) => {
      if (!s) return "";
      return s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]/g, '').trim();
    };
    
    const searchName = bankName.includes('-') ? bankName.split('-')[1].trim() : bankName;
    const searchNorm = norm(searchName);
    
    // 1. Try to find in subLogos (secondary logos)
    const matchedSub = subLogos.find(l => {
      const lN = norm(l.name);
      return lN === searchNorm || lN.includes(searchNorm) || searchNorm.includes(lN);
    });
    if (matchedSub?.logo_url) return matchedSub.logo_url;
    
    // 2. Try to find in main banks
    const matchedBank = banks.find(b => {
      const bN = norm(b.name);
      return bN === searchNorm || bN.includes(searchNorm) || searchNorm.includes(bN);
    });
    if (matchedBank?.logo_url) return matchedBank.logo_url;
    
    return null;
  };

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      const parsed = JSON.parse(u);
      setLoggedUser(parsed);
      loadAll(parsed.id);
      if (parsed.brand_color) {
        setButtonColor(parsed.brand_color);
      }
    }
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
    
    // Find matching logo if possible using the getBankLogo helper
    const matchedLogo = getBankLogo(bankItem.label);
    
    const updated = [...originRules, { 
      ...newOriginRule, 
      origin_bank: bankItem.label,
      logo_url: matchedLogo,
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

    // Find matching logo if possible using the getBankLogo helper
    const matchedLogo = getBankLogo(bankItem.label);

    const updated = [...blockedOriginBanks, { 
      origin_bank: bankItem.label, 
      logo_url: matchedLogo,
      id: Date.now() 
    }];
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



  if (loading) return <div className="p-8 text-center font-bold text-slate-500">Carregando...</div>;

  return (
    <div className="p-4 lg:p-8 space-y-8 bg-slate-50 min-h-screen">
      <PageHeader
        title={loggedUser?.role === 'admin' ? "Configurações de Regras do" : "Configurações de Regras da"}
        highlight={loggedUser?.role === 'admin' ? "Administrador" : "Promotora"}
        subtitle={loggedUser?.role === 'admin' ? "Personalize as regras gerais e bloqueios globais que afetarão todas as equipes." : "Personalize prioridades de bancos e restrições de instituições de origem."}
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
                  <button onClick={() => removePriority(p.id)} className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"><Icons.Trash size={16} /></button>
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
                      <p className="text-[10px] font-bold text-red-500 uppercase tracking-[0.2em]">{loggedUser?.role === 'admin' ? "Bloqueado Globalmente" : "Bloqueado para toda equipe"}</p>
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
                    {(() => {
                      const computedLogo = getBankLogo(r.origin_bank, r.logo_url);
                      return computedLogo ? (
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-100 shadow-sm shrink-0">
                          <img src={getStaticUrl(computedLogo) || ""} className="w-full h-full object-contain" alt="" />
                        </div>
                      ) : (
                        <span className="w-10 h-10 bg-emerald-600 text-white text-xs font-black rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-emerald-100"><Icons.Landmark size={16} /></span>
                      );
                    })()}
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
                    {(() => {
                      const computedLogo = getBankLogo(r.origin_bank, r.logo_url);
                      return computedLogo ? (
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-100 shadow-sm shrink-0">
                          <img src={getStaticUrl(computedLogo) || ""} className="w-full h-full object-contain" alt="" />
                        </div>
                      ) : (
                        <span className="w-10 h-10 bg-orange-600 text-white text-xs font-black rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-orange-100"><Icons.ShieldBan size={16} /></span>
                      );
                    })()}
                    <div>
                      <p className="text-sm font-black text-slate-900">{r.origin_bank}</p>
                      <p className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em]">Bloqueado para Simulação</p>
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
