"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { api, getStaticUrl } from "@/utils/api";
import { Icons } from "@/components/Icons";
import { useToast } from "@/components/ToastProvider";

export default function RulesPage() {
  const { toast } = useToast();
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<any>({
    bank_id: "",
    agreement: "INSS",
    min_age: 18,
    max_age: 80,
    max_term: 84,
    min_release_amount: 0,
    allowed_benefit_types: "",
    literacy_required: false,
    accepts_disability: false,
    disability_min_age: 0,
    disability_max_age: 0,
    disability_grace_age: 0,
    disability_min_benefit_years: 0,
    disability_min_benefit_months: 0,
    min_paid_installments: 0,
    excluded_origin_banks: "",
    origin_banks_min_paid: "",
    accepts_60_plus: true,
    accepts_illiterate: true,
    accepts_loas: true,
    min_installment_value: 0,
    min_debt_balance: 0,
    portability_rate_threshold: 0,
    use_balance_plus_released: false,
    disable_weighted_rate_validation: false,
    sub_agreement: ""
  });

  const [selectedAgreement, setSelectedAgreement] = useState("");
  const [selectedSubAgreement, setSelectedSubAgreement] = useState("");

  const ESTADOS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];

  useEffect(() => {
    loadBanks();
  }, []);

  useEffect(() => {
    if (selectedBankId) {
      loadRules(selectedBankId);
      setSelectedAgreement("");
      setSelectedSubAgreement("");
    } else {
      setRules([]);
    }
  }, [selectedBankId]);

  const loadBanks = async () => {
    try {
      const data = await api.get("/admin/banks");
      setBanks(data);
      if (data.length > 0 && !selectedBankId) setSelectedBankId(data[0].id.toString());
    } catch (error) {
      console.error("Erro ao carregar bancos:", error);
    }
  };

  const loadRules = async (bankId: string) => {
    try {
      setLoading(true);
      const data = await api.get(`/admin/banks/${bankId}/rules`);
      setRules(data);
    } catch (error) {
      console.error("Erro ao carregar regras:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (rule: any = null) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        bank_id: rule.bank_id.toString(),
        agreement: rule.agreement || "INSS",
        min_age: rule.min_age || 18,
        max_age: rule.max_age || 80,
        max_term: rule.max_term || 84,
        min_release_amount: rule.min_release_amount || 0,
        allowed_benefit_types: rule.allowed_benefit_types || "",
        literacy_required: rule.literacy_required || false,
        accepts_disability: rule.accepts_disability || false,
        disability_min_age: rule.disability_min_age || 0,
        disability_max_age: rule.disability_max_age || 0,
        disability_grace_age: rule.disability_grace_age || 0,
        disability_min_benefit_years: rule.disability_min_benefit_years || 0,
        disability_min_benefit_months: rule.disability_min_benefit_months || 0,
        min_paid_installments: rule.min_paid_installments || 0,
        excluded_origin_banks: rule.excluded_origin_banks || "",
        origin_banks_min_paid: rule.origin_banks_min_paid || "",
        accepts_60_plus: rule.accepts_60_plus ?? true,
        accepts_illiterate: rule.accepts_illiterate ?? true,
        accepts_loas: rule.accepts_loas ?? true,
        min_installment_value: rule.min_installment_value || 0,
        min_debt_balance: rule.min_debt_balance || 0,
        portability_rate_threshold: rule.portability_rate_threshold || 0,
        use_balance_plus_released: rule.use_balance_plus_released || false,
        disable_weighted_rate_validation: rule.disable_weighted_rate_validation || false,
        sub_agreement: rule.sub_agreement || ""
      });
    } else {
      setEditingRule(null);
      setFormData({
        bank_id: selectedBankId,
        agreement: selectedAgreement === "GOVERNOS" ? "GOV_EST" : selectedAgreement === "FORÇAS ARMADAS" ? "FORCAS" : selectedAgreement === "CLT PRIVADO" ? "CLT_PRIVADO" : selectedAgreement || "INSS",
        min_age: 18,
        max_age: 80,
        max_term: 84,
        min_release_amount: 0,
        allowed_benefit_types: "",
        literacy_required: false,
        accepts_disability: false,
        disability_min_age: 0,
        disability_max_age: 0,
        disability_grace_age: 0,
        disability_min_benefit_years: 0,
        disability_min_benefit_months: 0,
        min_paid_installments: 0,
        excluded_origin_banks: "",
        origin_banks_min_paid: "",
        accepts_60_plus: true,
        accepts_illiterate: true,
        accepts_loas: true,
        min_installment_value: 0,
        min_debt_balance: 0,
        portability_rate_threshold: 0,
        use_balance_plus_released: false,
        disable_weighted_rate_validation: false,
        sub_agreement: selectedSubAgreement || ""
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingRule(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { 
        ...formData, 
        bank_id: parseInt(formData.bank_id),
        min_age: parseInt(formData.min_age),
        max_age: parseInt(formData.max_age),
        max_term: parseInt(formData.max_term),
        min_release_amount: parseFloat(formData.min_release_amount),
        disability_min_age: parseInt(formData.disability_min_age) || 0,
        disability_max_age: parseInt(formData.disability_max_age) || 0,
        disability_grace_age: parseInt(formData.disability_grace_age) || 0,
        disability_min_benefit_years: parseInt(formData.disability_min_benefit_years) || 0,
        disability_min_benefit_months: parseInt(formData.disability_min_benefit_months) || 0,
        min_paid_installments: parseInt(formData.min_paid_installments) || 0,
        min_installment_value: parseFloat(formData.min_installment_value) || 0,
        min_debt_balance: parseFloat(formData.min_debt_balance) || 0,
        portability_rate_threshold: parseFloat(formData.portability_rate_threshold) || 0
      };

      if (editingRule) {
        await api.patch(`/admin/bank-rules/${editingRule.id}`, payload);
      } else {
        await api.post("/admin/bank-rules", payload);
      }
      handleCloseModal();
      loadRules(selectedBankId);
      toast.success("Regra salva com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar regra:", error);
      toast.error("Erro ao salvar regra.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Certeza que deseja excluir esta regra?")) return;
    try {
      await api.delete(`/admin/bank-rules/${id}`);
      loadRules(selectedBankId);
      toast.success("Regra excluída com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir regra:", error);
      toast.error("Erro ao excluir regra.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Regras de"
        highlight="Aceitação"
        subtitle="Configure as restrições por idade e convênio"
      />
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-full">
          {/* Seletor 1: BANCO */}
          <div className="relative w-full md:w-48">
            <select 
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className="w-full py-3.5 px-6 bg-slate-50 dark:bg-white/5 rounded-2xl border-none shadow-inner text-[11px] font-black uppercase tracking-widest focus:ring-2 ring-blue-500/20 transition-all cursor-pointer text-blue-600"
            >
              <option value="">BANCO</option>
              {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Seletor 2: CONVÊNIO */}
          <div className="relative w-full md:w-48">
            <select 
              value={selectedAgreement}
              onChange={(e) => setSelectedAgreement(e.target.value)}
              className="w-full py-3.5 px-6 bg-slate-50 dark:bg-white/5 rounded-2xl border-none shadow-inner text-[11px] font-black uppercase tracking-widest focus:ring-2 ring-blue-500/20 transition-all cursor-pointer text-slate-700 dark:text-white"
            >
              <option value="">TODOS CONVÊNIOS</option>
              <option value="INSS">INSS</option>
              <option value="SIAPE">SIAPE</option>
              <option value="FORÇAS ARMADAS">FORÇAS ARMADAS</option>
              <option value="GOVERNOS">GOVERNOS</option>
              <option value="CLT PRIVADO">CLT PRIVADO</option>
            </select>
          </div>

          {/* Seletor 3: ESTADOS (Sub-Convênio Governos) */}
          {selectedAgreement === "GOVERNOS" && (
            <div className="relative w-full md:w-32 animate-in zoom-in duration-300">
              <select 
                value={selectedSubAgreement}
                onChange={(e) => setSelectedSubAgreement(e.target.value)}
                className="w-full py-3.5 px-6 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border-none shadow-inner text-[11px] font-black uppercase tracking-widest focus:ring-2 ring-blue-500/20 transition-all cursor-pointer text-blue-600"
              >
                <option value="">ESTADOS</option>
                {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          )}

          <button 
            disabled={!selectedBankId}
            onClick={() => handleOpenModal()}
            className="w-full md:w-auto py-3.5 px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 hover:-translate-y-1 active:scale-95 disabled:opacity-50"
          >
            <Icons.Plus size={16} /> Nova Regra
          </button>
        </div>
      </div>

      {/* Grouped Rules by Agreement */}
      <div className="space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest animate-pulse">Sincronizando Diretrizes...</p>
          </div>
        ) : !selectedBankId ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/5 shadow-2xl">
             <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Escolha um banco acima para gerenciar as regras.</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/5 shadow-2xl">
             <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Nenhuma regra encontrada para este banco.</p>
          </div>
        ) : (
          /* Agrupar por Convênio para visual Premium */
          ["INSS", "SIAPE", "FORÇAS ARMADAS", "GOVERNOS", "CLT PRIVADO"].filter(agr => !selectedAgreement || agr === selectedAgreement).map(agr => {
            const agrRules = rules.filter(r => {
              const ruleAgr = (r.agreement || "").toUpperCase().replace("_", " ");
              const filterAgr = agr.toUpperCase();
              
              // Verifica se o convênio bate
              const matchAgr = ruleAgr === filterAgr || (filterAgr === "FORÇAS ARMADAS" && ruleAgr === "FORCAS") || (filterAgr === "GOVERNOS" && ruleAgr === "GOV EST");
              if (!matchAgr) return false;

              // Verifica se o sub-convênio (Estado) bate, se houver filtro
              if (selectedSubAgreement) {
                return r.sub_agreement === selectedSubAgreement;
              }

              return true;
            });

            if (agrRules.length === 0) return null;
            const bank = banks.find(b => b.id.toString() === selectedBankId);

            return (
              <div key={agr} className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-white/10 shadow-2xl animate-in slide-in-from-bottom-4 duration-500 mb-8">
                <div className="px-8 py-6 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 p-0 shadow-xl border border-slate-100 dark:border-white/5 flex items-center justify-center overflow-hidden">
                      {bank?.logo_url ? (
                        <img src={getStaticUrl(bank.logo_url)} className="w-full h-full object-cover" alt={bank.name} />
                      ) : (
                        <span className="text-xl font-black text-blue-600">{bank?.name?.charAt(0) || "B"}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                        {bank?.name} • {agr === 'GOV_EST' ? 'GOVERNO' : agr === 'FORCAS' ? 'FORÇAS' : agr === 'CLT_PRIVADO' ? 'CLT' : agr}
                      </h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Regras de Aceitação por Convênio</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleOpenModal()}
                    className="py-2.5 px-6 bg-white dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-600 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10 transition-all shadow-lg flex items-center gap-2"
                  >
                    <Icons.Plus size={14} /> Adicionar Regra {agr}
                  </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {agrRules.map(rule => (
                    <div key={rule.id} className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/10 hover:border-blue-500/30 transition-all group relative overflow-hidden">
                       <div className="flex justify-between items-start mb-6">
                          <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Público Alvo</p>
                             <div className="flex items-center gap-2">
                                <span className="text-lg font-black text-slate-800 dark:text-white">{rule.min_age} - {rule.max_age}</span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">ANOS</span>
                             </div>
                          </div>
                          {rule.sub_agreement && (
                            <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20">
                              {rule.sub_agreement}
                            </span>
                          )}
                       </div>

                       <div className="space-y-4 mb-6">
                          {/* Espécies */}
                          <div className="flex flex-wrap gap-2">
                             {agr === "INSS" && (
                                <>
                                  <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${rule.accepts_disability ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-red-500/10 border-red-500/20 text-red-500 opacity-60'}`}>
                                     <Icons.Wheelchair size={14} />
                                     <span className="text-[9px] font-black uppercase tracking-widest">{rule.accepts_disability ? 'Invalidez OK' : 'Não Invalidez'}</span>
                                  </div>
                                  <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${rule.accepts_loas ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-red-500/10 border-red-500/20 text-red-500 opacity-60'}`}>
                                     <Icons.HandCoins size={14} />
                                     <span className="text-[9px] font-black uppercase tracking-widest">{rule.accepts_loas ? 'LOAS OK' : 'Não LOAS'}</span>
                                  </div>
                                </>
                             )}
                             <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${rule.literacy_required ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}>
                                <Icons.BookOpen size={14} />
                                <span className="text-[9px] font-black uppercase tracking-widest">{rule.literacy_required ? 'Só Alfabetizado' : 'Aceita Analfabeto'}</span>
                             </div>
                          </div>

                          {/* Viabilidade */}
                          <div className="grid grid-cols-2 gap-3">
                             <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                                <p className="text-[8px] text-slate-400 font-black uppercase mb-1 tracking-widest">Saldo Mínimo</p>
                                <p className="text-xs font-black text-slate-800 dark:text-white">R$ {rule.min_debt_balance?.toLocaleString() || '0'}</p>
                             </div>
                             <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                                <p className="text-[8px] text-slate-400 font-black uppercase mb-1 tracking-widest">Troco Mínimo</p>
                                <p className="text-xs font-black text-blue-600">R$ {rule.min_release_amount?.toLocaleString() || '0'}</p>
                             </div>
                          </div>
                       </div>

                       {/* Action Footer Premium */}
                       <div className="mt-auto flex gap-3 pt-5 border-t border-slate-100 dark:border-white/5">
                         <button 
                           onClick={() => handleOpenModal(rule)}
                           className="flex-1 py-3 bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 hover:from-blue-600 hover:to-indigo-600 text-slate-600 dark:text-slate-300 hover:text-white rounded-[1.25rem] text-[9px] font-black uppercase tracking-widest transition-all duration-300 border border-slate-200 dark:border-slate-700/50 hover:border-transparent hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 flex items-center justify-center gap-2.5 group/btn relative overflow-hidden"
                         >
                           <svg className="w-4 h-4 text-slate-400 group-hover/btn:text-white transition-colors group-hover/btn:rotate-90 duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                           Configurar
                           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
                         </button>
                         
                         <button 
                           onClick={() => handleDelete(rule.id)}
                           className="w-[46px] h-[46px] bg-rose-50/50 dark:bg-rose-900/10 hover:bg-gradient-to-br hover:from-rose-500 hover:to-red-600 text-rose-500 hover:text-white rounded-[1.25rem] transition-all duration-300 border border-rose-100 dark:border-rose-500/20 hover:border-transparent hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-0.5 flex items-center justify-center shrink-0 group/del relative overflow-hidden"
                           title="Excluir Regra"
                         >
                           <svg className="w-4 h-4 transition-transform group-hover/del:scale-110 group-hover/del:-rotate-12 duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/del:translate-x-full transition-transform duration-700"></div>
                         </button>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-up border border-white/20">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingRule ? "Editar Regra" : "Nova Regra"}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 text-2xl font-light">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
              {/* Seção 1: Geral */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Convênio *</label>
                  <select 
                    required
                    value={formData.agreement}
                    onChange={(e) => setFormData({...formData, agreement: e.target.value, sub_agreement: ""})}
                    className="input-admin"
                  >
                    <option value="INSS">INSS</option>
                    <option value="SIAPE">SIAPE</option>
                    <option value="GOV_EST">GOVERNO ESTADUAL</option>
                    <option value="FORCAS">FORÇAS ARMADAS</option>
                    <option value="CLT_PRIVADO">CLT PRIVADO</option>
                  </select>
                </div>
                {formData.agreement === "FORCAS" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Força (Opcional)</label>
                    <select value={formData.sub_agreement || ""} onChange={(e) => setFormData({...formData, sub_agreement: e.target.value})} className="input-admin">
                      <option value="">Todas</option>
                      <option value="EXERCITO">EXÉRCITO</option>
                      <option value="AERONAUTICA">AERONÁUTICA</option>
                      <option value="MARINHA">MARINHA</option>
                    </select>
                  </div>
                )}
                {formData.agreement === "GOV_EST" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Estado (Opcional)</label>
                    <select value={formData.sub_agreement || ""} onChange={(e) => setFormData({...formData, sub_agreement: e.target.value})} className="input-admin">
                      <option value="">Todos</option>
                      <option value="AC">Acre (AC)</option><option value="AL">Alagoas (AL)</option><option value="AP">Amapá (AP)</option>
                      <option value="AM">Amazonas (AM)</option><option value="BA">Bahia (BA)</option><option value="CE">Ceará (CE)</option>
                      <option value="DF">Distrito Federal (DF)</option><option value="ES">Espírito Santo (ES)</option><option value="GO">Goiás (GO)</option>
                      <option value="MA">Maranhão (MA)</option><option value="MT">Mato Grosso (MT)</option><option value="MS">Mato Grosso do Sul (MS)</option>
                      <option value="MG">Minas Gerais (MG)</option><option value="PA">Pará (PA)</option><option value="PB">Paraíba (PB)</option>
                      <option value="PR">Paraná (PR)</option><option value="PE">Pernambuco (PE)</option><option value="PI">Piauí (PI)</option>
                      <option value="RJ">Rio de Janeiro (RJ)</option><option value="RN">Rio Grande do Norte (RN)</option><option value="RS">Rio Grande do Sul (RS)</option>
                      <option value="RO">Rondônia (RO)</option><option value="RR">Roraima (RR)</option><option value="SC">Santa Catarina (SC)</option>
                      <option value="SP">São Paulo (SP)</option><option value="SE">Sergipe (SE)</option><option value="TO">Tocantins (TO)</option>
                    </select>
                  </div>
                )}
                <div className={formData.agreement === "FORCAS" || formData.agreement === "GOV_EST" ? "col-span-2" : ""}>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Idade (Min - Max) *</label>
                  <div className="flex gap-2">
                    <input type="number" required value={formData.min_age} onChange={(e) => setFormData({...formData, min_age: e.target.value})} className="input-admin" placeholder="Min" />
                    <input type="number" required value={formData.max_age} onChange={(e) => setFormData({...formData, max_age: e.target.value})} className="input-admin" placeholder="Max" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {formData.agreement === "INSS" ? (
                  <>
                    <div className="flex flex-col gap-3 justify-center">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Restrições de Espécie (INSS)</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={!formData.accepts_disability} 
                            onChange={(e) => setFormData({...formData, accepts_disability: !e.target.checked})} 
                            className="w-5 h-5 rounded border-slate-300 text-red-600 focus:ring-red-500"
                          />
                          <span className="text-sm font-bold text-slate-600 group-hover:text-red-600 transition-colors">Não Aceita Invalidez</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={!formData.accepts_loas} 
                            onChange={(e) => setFormData({...formData, accepts_loas: !e.target.checked})} 
                            className="w-5 h-5 rounded border-slate-300 text-red-600 focus:ring-red-500"
                          />
                          <span className="text-sm font-bold text-slate-600 group-hover:text-red-600 transition-colors">Não Aceita LOAS</span>
                        </label>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium italic">* Aceita todas as espécies por padrão, exceto as marcadas acima.</p>
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Mín. Parcelas Pagas (Geral)</label>
                       <input type="number" value={formData.min_paid_installments} onChange={(e) => setFormData({...formData, min_paid_installments: e.target.value})} className="input-admin" placeholder="Ex: 12" />
                    </div>
                  </>
                ) : (
                  <div className="col-span-2">
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Mín. Parcelas Pagas (Geral)</label>
                     <input type="number" value={formData.min_paid_installments} onChange={(e) => setFormData({...formData, min_paid_installments: e.target.value})} className="input-admin" placeholder="Ex: 12" />
                  </div>
                )}
              </div>

              {/* Seção 2: Portabilidade & Bancos */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">II. Filtros de Portabilidade de Origem</h4>
                
                <div>
                   <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bancos de Origem NÃO Portados</label>
                   <input 
                      type="text" 
                      value={formData.excluded_origin_banks} 
                      onChange={(e) => setFormData({...formData, excluded_origin_banks: e.target.value})}
                      className="input-admin !py-2"
                      placeholder="Ex: AGIBANK, ITAU, 121 (Separados por vírgula)"
                   />
                </div>

                <div>
                   <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Qtd. Parcelas por Banco (JSON)</label>
                   <textarea 
                      value={formData.origin_banks_min_paid} 
                      onChange={(e) => setFormData({...formData, origin_banks_min_paid: e.target.value})}
                      className="input-admin h-16 font-mono text-[10px] !py-2"
                      placeholder='Ex: {"PAN": 37, "C6": 12}'
                   />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="lit" checked={formData.literacy_required} onChange={(e) => setFormData({...formData, literacy_required: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-blue-600 cursor-pointer" />
                      <label htmlFor="lit" className="text-sm font-semibold text-slate-600 cursor-pointer select-none">Exige alfabetização?</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="a60" checked={formData.accepts_60_plus} onChange={(e) => setFormData({...formData, accepts_60_plus: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-blue-600 cursor-pointer" />
                      <label htmlFor="a60" className="text-sm font-semibold text-slate-600 cursor-pointer select-none">Aceita Clientes 60+?</label>
                    </div>
                 </div>
                 {formData.agreement === "INSS" && (
                   <div className="flex items-center gap-3 border-l pl-4 border-slate-100">
                      <input type="checkbox" id="inv_cfg" checked={formData.accepts_disability} onChange={(e) => setFormData({...formData, accepts_disability: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-blue-600 cursor-pointer" />
                      <label htmlFor="inv_cfg" className="text-sm font-bold text-blue-600 cursor-pointer select-none">Configurar carência para Invalidez?</label>
                   </div>
                 )}
              </div>

              {/* Seção 3: Regras para Invalidez */}
              {formData.agreement === "INSS" && formData.accepts_disability && (
                <div className="p-4 bg-red-50/30 rounded-2xl border border-red-100 space-y-4 animate-slide-up">
                  <h4 className="text-xs font-black text-red-800 uppercase tracking-widest">III. Trava de Concessão (Invalidez)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[9px] font-black text-red-700 uppercase mb-1">Idade Min</label>
                      <input type="number" value={formData.disability_min_age} onChange={(e) => setFormData({...formData, disability_min_age: e.target.value})} className="input-admin !border-red-200 focus:!border-red-400" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-red-700 uppercase mb-1">Idade Max</label>
                      <input type="number" value={formData.disability_max_age} onChange={(e) => setFormData({...formData, disability_max_age: e.target.value})} className="input-admin !border-red-200 focus:!border-red-400" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-red-700 uppercase mb-1">Isenção da DIB</label>
                      <input type="number" value={formData.disability_grace_age} onChange={(e) => setFormData({...formData, disability_grace_age: e.target.value})} className="input-admin !border-red-200 focus:!border-red-400" placeholder="Ex: 60" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-[9px] font-black text-red-700 uppercase mb-1">Anos de Concessão</label>
                      <input type="number" value={formData.disability_min_benefit_years} onChange={(e) => setFormData({...formData, disability_min_benefit_years: e.target.value})} className="input-admin !border-red-200 focus:!border-red-400" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-red-700 uppercase mb-1">Meses de Concessão</label>
                      <input type="number" value={formData.disability_min_benefit_months} onChange={(e) => setFormData({...formData, disability_min_benefit_months: e.target.value})} className="input-admin !border-red-200 focus:!border-red-400" />
                    </div>
                  </div>
                </div>
              )}

              {/* Seção 4: Regras de Ticket e Troco */}
              <div className="p-4 bg-blue-50/30 rounded-2xl border border-blue-100 space-y-4">
                 <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest">IV. Regras de Ticket e Viabilidade</h4>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                   <div>
                      <label className="block text-[9px] font-black text-blue-700 uppercase mb-1">Taxa Mínima Port. (%)</label>
                      <input type="number" step="0.01" value={formData.portability_rate_threshold} onChange={(e) => setFormData({...formData, portability_rate_threshold: e.target.value})} className="input-admin" placeholder="Ex: 1.10" />
                   </div>
                   <div>
                      <label className="block text-[9px] font-black text-blue-700 uppercase mb-1">Saldo Mínimo (R$)</label>
                      <input type="number" step="0.01" value={formData.min_debt_balance} onChange={(e) => setFormData({...formData, min_debt_balance: e.target.value})} className="input-admin" placeholder="Ex: 5000" />
                   </div>
                   <div>
                      <label className="block text-[9px] font-black text-blue-700 uppercase mb-1">Parcela Mínima (R$)</label>
                      <input type="number" step="0.01" value={formData.min_installment_value} onChange={(e) => setFormData({...formData, min_installment_value: e.target.value})} className="input-admin" placeholder="Ex: 100" />
                   </div>
                   <div>
                      <label className="block text-[9px] font-black text-blue-700 uppercase mb-1">Troco Mínimo (R$)</label>
                      <input type="number" step="0.01" value={formData.min_release_amount} onChange={(e) => setFormData({...formData, min_release_amount: e.target.value})} className="input-admin" placeholder="Ex: 300" />
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-3 pt-2">
                    <input 
                      type="checkbox" 
                      id="use_sum" 
                      checked={formData.use_balance_plus_released} 
                      onChange={(e) => setFormData({...formData, use_balance_plus_released: e.target.checked})} 
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 cursor-pointer" 
                    />
                    <div className="leading-tight">
                       <label htmlFor="use_sum" className="text-sm font-bold text-blue-700 cursor-pointer select-none">Somar Saldo + Troco para Validação?</label>
                       <p className="text-[10px] text-slate-500 font-medium">Se marcado, o saldo mínimo exigido será comparado com o valor total do novo contrato (Saldo + Liberação).</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-3 pt-2 border-t border-blue-100/50">
                    <input 
                      type="checkbox" 
                      id="disable_w" 
                      checked={formData.disable_weighted_rate_validation} 
                      onChange={(e) => setFormData({...formData, disable_weighted_rate_validation: e.target.checked})} 
                      className="w-5 h-5 rounded border-slate-300 text-red-600 cursor-pointer" 
                    />
                    <div className="leading-tight">
                       <label htmlFor="disable_w" className="text-sm font-bold text-red-700 cursor-pointer select-none">DESATIVAR Validação de Taxa Ponderada?</label>
                       <p className="text-[10px] text-slate-500 font-medium italic">Se marcado, o sistema NÃO irá validar se a taxa da tabela é menor que a taxa final da operação para este banco.</p>
                    </div>
                 </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50">
                  {isSubmitting ? "Salvando..." : editingRule ? "Salvar Alterações" : "Criar Regra"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
