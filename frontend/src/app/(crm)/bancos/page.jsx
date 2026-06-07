"use client";

import { useEffect, useState, useRef } from "react";
import PageHeader from "@/components/PageHeader";
import { api, getStaticUrl } from "@/utils/api";
import { inssBanks } from "@/utils/constants";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

const Icons = {
  Search: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
  ),
  Download: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
  ),
  Landmark: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="22" y2="22" /><line x1="6" x2="6" y1="18" y2="11" /><line x1="10" x2="10" y1="18" y2="11" /><line x1="14" x2="14" y1="18" y2="11" /><line x1="18" x2="18" y1="18" y2="11" /><polygon points="12 2 20 7 4 7 12 2" /></svg>
  ),
  X: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
  ),
  CheckCircle: ({ size = 20, color = "#10b981" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
  ),
  XCircle: ({ size = 20, color = "#ef4444" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" x2="9" y1="9" y2="15" /><line x1="9" x2="15" y1="9" y2="15" /></svg>
  ),
  Info: ({ size = 20, color = "#3b82f6" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
  ),
  AlertTriangle: ({ size = 20, color = "#f59e0b" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
  )
};

export default function BancosPage() {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConvenio, setSelectedConvenio] = useState("INSS");
  const [selectedBank, setSelectedBank] = useState(null);
  const [selectedRuleId, setSelectedRuleId] = useState(null);
  const [bankTables, setBankTables] = useState([]);
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const pdfRef = useRef();

  useEffect(() => {
    setMounted(true);
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    
    loadBanks();
  }, []);

  const loadBanks = async () => {
    try {
      setLoading(true);
      const data = await api.get("/admin/banks");
      setBanks(data.filter(b => b.active));
    } catch (error) {
      console.error("Erro ao carregar bancos:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBanks = banks.filter(bank => {
    const matchesSearch = bank.name.toLowerCase().includes(searchTerm.toLowerCase());
    const hasRulesForConvenio = bank.rules?.some(r => r.agreement === selectedConvenio && r.active);
    return matchesSearch && hasRulesForConvenio;
  });

  const handleBankClick = async (bank) => {
    setSelectedBank(bank);
    const rule = bank.rules?.find(r => r.agreement === selectedConvenio && r.active);
    if (rule) setSelectedRuleId(rule.id);
    
    // Fetch tables for this bank to get accurate prazos
    try {
       const tables = await api.get(`/admin/banks/${bank.id}/tables`);
       setBankTables(tables || []);
    } catch (e) {
       setBankTables([]);
    }
  };

  const getSelectedRule = () => {
    if (!selectedBank) return null;
    return selectedBank.rules?.find(r => r.id === selectedRuleId) || selectedBank.rules?.[0];
  };

  const exportPDF = async () => {
    if (typeof window !== "undefined") {
      try {
        const html2pdf = (await import('html2pdf.js')).default;
        const element = pdfRef.current;
        
        // Temporarily remove max-height and overflow to prevent cutoff/crashing
        const originalMaxHeight = element.style.maxHeight;
        const originalOverflow = element.style.overflow;
        element.style.maxHeight = 'none';
        element.style.overflow = 'visible';

        const opt = {
          margin:       10,
          filename:     `Regras_${selectedBank.name}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 1.5, useCORS: true, logging: false },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        await html2pdf().set(opt).from(element).save();
        
        // Restore
        element.style.maxHeight = originalMaxHeight;
        element.style.overflow = originalOverflow;
      } catch (e) {
        console.error("Erro ao gerar PDF:", e);
        alert("Ocorreu um erro ao gerar o PDF. Tente novamente.");
      }
    }
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return "Não informado";
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 bg-slate-50 min-h-screen">
      <PageHeader
        title="Bancos e"
        highlight="Regras"
        subtitle="Consulte os bancos cadastrados e as regras específicas por convênio."
      />

      {/* Filters */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Icons.Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Buscar banco por nome..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none font-bold text-sm bg-slate-50"
          />
        </div>
        <div className="w-full md:w-64">
          <select 
            value={selectedConvenio}
            onChange={(e) => setSelectedConvenio(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 outline-none font-black text-sm bg-slate-50 uppercase tracking-widest text-slate-700"
          >
            <option value="INSS">INSS</option>
            <option value="SIAPE">SIAPE</option>
            <option value="EXERCITO">EXÉRCITO</option>
            <option value="MARINHA">MARINHA</option>
            <option value="AERONAUTICA">AERONÁUTICA</option>
            <option value="FGTS">FGTS</option>
          </select>
        </div>
      </div>

      {/* Banks Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 font-bold uppercase tracking-widest text-sm animate-pulse">Carregando bancos...</div>
      ) : filteredBanks.length === 0 ? (
        <div className="text-center py-12 text-slate-400 font-bold uppercase tracking-widest text-sm">Nenhum banco encontrado com regras ativas para este convênio.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredBanks.map(bank => (
              <motion.div
                key={bank.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => handleBankClick(bank)}
                className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer group flex flex-col items-center text-center gap-4 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden relative z-10 p-0">
                  {bank.logo_url ? (
                    <img src={getStaticUrl(bank.logo_url)} alt={bank.name} className="w-full h-full object-cover" />
                  ) : (
                    <Icons.Landmark size={32} />
                  )}
                </div>
                
                <div className="relative z-10 w-full">
                  <h3 className="font-black text-slate-800 text-lg truncate w-full" title={bank.name}>{bank.name}</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mt-1">Ver Regras</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal - Bank Rules via Portal to break z-index context */}
      {mounted && createPortal(
        <AnimatePresence>
          {selectedBank && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6" style={{ isolation: 'isolate' }}>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={() => setSelectedBank(null)}
              ></motion.div>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-slate-50 w-full max-w-3xl max-h-[90vh] rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col overflow-hidden"
              >
                {/* Header */}
                <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 p-0 flex items-center justify-center shrink-0 overflow-hidden">
                       {selectedBank.logo_url ? (
                          <img src={getStaticUrl(selectedBank.logo_url)} alt={selectedBank.name} className="w-full h-full object-cover" />
                        ) : (
                          <Icons.Landmark size={24} />
                        )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 leading-none">{selectedBank.name}</h2>
                      <div className="flex items-center gap-2 mt-2">
                        <select 
                          value={selectedRuleId || ""}
                          onChange={(e) => setSelectedRuleId(Number(e.target.value))}
                          className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-black uppercase tracking-widest outline-none cursor-pointer"
                        >
                          {selectedBank.rules?.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.agreement} {r.sub_agreement ? `- ${r.sub_agreement}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                <div className="flex items-center gap-2">
                  <button onClick={exportPDF} className="w-10 h-10 sm:w-auto sm:px-4 rounded-xl bg-blue-600 text-white flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                    <Icons.Download size={18} />
                    <span className="hidden sm:inline text-[11px] font-black uppercase tracking-widest">Baixar PDF</span>
                  </button>
                  <button onClick={() => setSelectedBank(null)} className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors">
                    <Icons.X size={18} />
                  </button>
                </div>
              </div>

              {/* Content area to be captured by PDF */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                <div ref={pdfRef} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
                  {/* PDF Only Header (Visible only when generating PDF, or just nice to have at top) */}
                  <div className="flex flex-col items-center mb-8 pb-8 border-b border-slate-100">
                    {(user?.logo_url || user?.avatar_url) && (
                      <img src={getStaticUrl(user.logo_url || user.avatar_url)} alt="Logo Promotora" className="h-16 object-contain mb-4" />
                    )}
                    <h1 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      🏛️ {selectedBank.name}
                    </h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Regras para {(() => {
                        const r = getSelectedRule();
                        return r ? `${r.agreement} ${r.sub_agreement ? '- ' + r.sub_agreement : ''}` : selectedConvenio;
                      })()}
                    </p>
                  </div>

                  {(() => {
                    const rule = getSelectedRule();
                    if (!rule) return <p className="text-center text-slate-400 font-bold">Regras não cadastradas.</p>;

                    // Calcular Prazos baseados nas tabelas retornadas
                    let prazosAtivos = bankTables
                      .filter(t => t.active && (!t.agreement || t.agreement === rule.agreement) && (!t.sub_agreement || t.sub_agreement === rule.sub_agreement))
                      .map(t => t.term)
                      .filter(Boolean);
                    
                    prazosAtivos = [...new Set(prazosAtivos)].sort((a,b)=>a-b);
                    const prazosText = prazosAtivos.length > 0 
                      ? prazosAtivos.map(p => `${p}X`).join(' e ') 
                      : `Até ${rule.max_term || 'N/A'}X`;

                    // Calcular LOAS
                    let excluidos = rule.excluded_benefit_types || "";
                    if (rule.accepts_loas === false) {
                      excluidos = excluidos ? `${excluidos}, 87 e 88 (LOAS)` : "87 e 88 (LOAS)";
                    }

                    return (
                      <div className="space-y-4">
                        <RuleItem icon="👵" label="Idade" value={`De ${rule.min_age || 'N/A'} a ${rule.max_age || 'N/A'} anos`} />
                        <RuleItem icon="📅" label="Prazos" value={prazosText} />
                        
                        <RuleItem 
                          icon="♿" 
                          label="Aceita Invalidez" 
                          value={rule.accepts_disability ? `SIM (Idade: >=${rule.disability_min_age || 0} anos e <${rule.disability_max_age || 0} anos, Tempo de Benefício: ${rule.disability_min_benefit_years || 0} anos)` : "NÃO"}
                          status={rule.accepts_disability ? "success" : "error"}
                        />
                        
                        <RuleItem 
                          icon="🚫" 
                          label="Benefício não atendido" 
                          value={excluidos || "Nenhum restrito"} 
                          status="warning"
                        />
                        
                        <RuleItem icon="✍️" label="Aceita Analfabeto" value={rule.accepts_illiterate ? "SIM" : "NÃO"} status={rule.accepts_illiterate ? "success" : "error"} />
                        <RuleItem icon="🕒" label="Aceita 60+" value={rule.accepts_60_plus ? "SIM" : "NÃO"} status={rule.accepts_60_plus ? "success" : "error"} />
                        
                        <RuleItem icon="💵" label="Parcela Mínima" value={formatCurrency(rule.min_installment_value)} />
                        <RuleItem icon="💰" label="Troco Mínimo" value={formatCurrency(rule.min_release_amount)} />
                        <RuleItem icon="🏦" label="Saldo Mínimo" value={formatCurrency(rule.min_debt_balance)} />
                        
                        <RuleItem icon="📉" label="Taxa Mínima Portabilidade" value={rule.portability_rate_threshold ? `${rule.portability_rate_threshold}%` : "Não informado"} />
                        <RuleItem icon="🔄" label="Taxa Mínima Refin/Port" value={rule.refin_portability_rate_threshold ? `${rule.refin_portability_rate_threshold}%` : "Não informado"} />
                        
                        {rule.excluded_origin_banks && (
                          <div className="mt-6 pt-4 border-t border-slate-100">
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-3">
                              <Icons.XCircle size={16} /> Bancos Não Portados (Origem)
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {rule.excluded_origin_banks.split(',').map(b => (
                                <span key={b} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[11px] font-black tracking-widest uppercase border border-red-100">{b.trim()}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {rule.origin_banks_min_paid && (
                          <div className="mt-6 pt-4 border-t border-slate-100">
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-3">
                              <Icons.AlertTriangle size={16} /> Bancos com Regras Específicas
                            </h4>
                            <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                               <ul className="text-sm text-orange-800 font-bold space-y-1">
                                 {rule.origin_banks_min_paid.split(/,|\n/).map(item => item.trim()).filter(Boolean).map((item, idx) => (
                                    <li key={idx} className="list-disc ml-4">{item}</li>
                                 ))}
                               </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          </div>
        )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}

function RuleItem({ icon, label, value, status = "info" }) {
  const getStatusColor = () => {
    if (status === "success") return "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (status === "error") return "text-red-600 bg-red-50 border-red-100";
    if (status === "warning") return "text-orange-600 bg-orange-50 border-orange-100";
    return "text-slate-700 bg-slate-50 border-slate-100";
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-slate-50 gap-2">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-black text-slate-600 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`px-4 py-1.5 rounded-xl text-sm font-bold border ${getStatusColor()} text-left sm:text-right w-full sm:w-auto`}>
        {value}
      </div>
    </div>
  );
}
