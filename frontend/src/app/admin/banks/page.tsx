"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { api, getStaticUrl } from "@/utils/api";

interface BankRule {
  id?: number;
  min_age: string | number;
  max_age: string | number;
  accepts_illiterate: boolean;
  accepts_60_plus: boolean;
  portability_rate_threshold: string;
  refin_portability_rate_threshold: string;
  min_installment_value: string;
  min_debt_balance: string;
  use_balance_plus_released: boolean;
  agreement: string;
  min_paid_installments: number;
  excluded_origin_banks?: string;
  origin_banks_min_paid?: string;
  accepts_disability: boolean;
  disability_min_age: string;
  disability_max_age: string;
  disability_grace_age: string;
  disability_min_benefit_years: string;
  disability_min_benefit_months: string;
}

interface Bank {
  id: number;
  name: string;
  logo_url?: string;
  active: boolean;
  rules?: BankRule[];
}

export default function BanksPage() {
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<any>(null);
  const [formData, setFormData] = useState<any>({ 
    name: "", 
    logo_url: "",
    active: true,
    priority: 99,
    rules: {
      agreement: "INSS",
      sub_agreement: "",
      min_age: 18,
      max_age: 80,
      accepts_illiterate: true,
      accepts_60_plus: true,
      portability_rate_threshold: "",
      refin_portability_rate_threshold: "",
      min_installment_value: "",
      min_debt_balance: "",
      use_balance_plus_released: false,
      min_paid_installments: 0,
      max_term: 84,
      min_release_amount: 0,
      literacy_required: false,
      excluded_origin_banks: "",
      origin_banks_min_paid: "",
      excluded_benefit_types: "",
      accepts_disability: false,
      disability_min_age: "",
      disability_max_age: "",
      disability_grace_age: "",
      disability_min_benefit_years: "",
      disability_min_benefit_months: ""
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState("INSS");
  const [selectedSubAgreement, setSelectedSubAgreement] = useState("");
  const [bankRules, setBankRules] = useState<any[]>([]);
  const [showAddRuleForm, setShowAddRuleForm] = useState(false);
  const [newAgreement, setNewAgreement] = useState("INSS");
  const [newSubAgreement, setNewSubAgreement] = useState("");
  
  // Debug & Status
  const currentRuleData = bankRules.find(r => r.agreement === selectedAgreement);
  
  // Helper for safe JSON parsing
  const safeParse = (str: string, defaultValue: any = {}) => {
    try {
      if (!str || str.trim() === "") return defaultValue;
      return JSON.parse(str);
    } catch (e) {
      console.error("Error parsing JSON:", str, e);
      return defaultValue;
    }
  };

  const [excludedInput, setExcludedInput] = useState("");
  const [benefitTypeInput, setBenefitTypeInput] = useState("");
  const [bankCarInput, setBankCarInput] = useState("");
  const [parcCarInput, setParcCarInput] = useState("");

  useEffect(() => {
    loadBanks();
  }, []);

  const loadBanks = async () => {
    try {
      setLoading(true);
      const data = await api.get("/admin/banks");
      setBanks(data);
    } catch (error) {
      console.error("Erro ao carregar bancos:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateRuleField = (fieldName: string, value: any) => {
    // 1. Update in the active formData.rules state (what the form inputs read)
    setFormData(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        [fieldName]: value
      }
    }));
    
    // 2. Also keep the same rule in bankRules state synchronized
    setBankRules(prev => prev.map(r => {
      if (r.agreement === formData.rules.agreement && (r.sub_agreement || "") === (formData.rules.sub_agreement || "")) {
        return { ...r, [fieldName]: value };
      }
      return r;
    }));
  };

  const handleOpenModal = async (bank: any = null) => {
    setShowAddRuleForm(false);
    if (bank) {
      setEditingBank(bank);
      try {
        const rules = await api.get(`/admin/banks/${bank.id}/rules`);
        setBankRules(rules);
        
        // Pick the first rule or default
        const rule = rules[0] || null;
        if (rule) {
          setSelectedAgreement(rule.agreement);
          setSelectedSubAgreement(rule.sub_agreement || "");
          
          setFormData({ 
            name: bank.name, 
            logo_url: bank.logo_url || "",
            active: bank.active,
            priority: bank.priority || 99,
            rules: {
              agreement: rule.agreement,
              sub_agreement: rule.sub_agreement || "",
              min_age: rule.min_age ?? 18,
              max_age: rule.max_age ?? 80,
              max_term: rule.max_term ?? 84,
              min_release_amount: rule.min_release_amount ?? 0,
              literacy_required: rule.literacy_required ?? false,
              accepts_illiterate: rule.accepts_illiterate ?? true,
              accepts_60_plus: rule.accepts_60_plus ?? true,
              portability_rate_threshold: rule.portability_rate_threshold || "",
              refin_portability_rate_threshold: rule.refin_portability_rate_threshold || "",
              min_installment_value: rule.min_installment_value || "",
              min_debt_balance: rule.min_debt_balance || "",
              use_balance_plus_released: rule.use_balance_plus_released || false,
              min_paid_installments: rule.min_paid_installments || 0,
              excluded_origin_banks: rule.excluded_origin_banks || "",
              origin_banks_min_paid: rule.origin_banks_min_paid || "",
              excluded_benefit_types: rule.excluded_benefit_types || "",
              accepts_disability: rule.accepts_disability ?? false,
              disability_min_age: rule.disability_min_age || "",
              disability_max_age: rule.disability_max_age || "",
              disability_grace_age: rule.disability_grace_age || "",
              disability_min_benefit_years: rule.disability_min_benefit_years || "",
              disability_min_benefit_months: rule.disability_min_benefit_months || "",
              active: rule.active ?? true
            }
          });
        } else {
          // No rules configured yet
          setSelectedAgreement("");
          setSelectedSubAgreement("");
          setFormData({
            name: bank.name, 
            logo_url: bank.logo_url || "",
            active: bank.active,
            priority: bank.priority || 99,
            rules: {
              agreement: "",
              sub_agreement: "",
              min_age: 18,
              max_age: 80,
              max_term: 84,
              min_release_amount: 0,
              literacy_required: false,
              accepts_illiterate: true,
              accepts_60_plus: true,
              portability_rate_threshold: "",
              refin_portability_rate_threshold: "",
              min_installment_value: "",
              min_debt_balance: "",
              use_balance_plus_released: false,
              min_paid_installments: 0,
              excluded_origin_banks: "",
              origin_banks_min_paid: "",
              excluded_benefit_types: "",
              accepts_disability: false,
              disability_min_age: "",
              disability_max_age: "",
              disability_grace_age: "",
              disability_min_benefit_years: "",
              disability_min_benefit_months: "",
              active: true
            }
          });
        }
      } catch (error) {
        console.error("Erro ao carregar regras:", error);
      }
    } else {
      setEditingBank(null);
      setBankRules([]);
      setSelectedAgreement("");
      setSelectedSubAgreement("");
      setFormData({ 
        name: "", 
        logo_url: "",
        active: true,
        priority: 99,
        rules: {
          agreement: "",
          sub_agreement: "",
          min_age: 18,
          max_age: 80,
          max_term: 84,
          min_release_amount: 0,
          literacy_required: false,
          accepts_illiterate: true,
          accepts_60_plus: true,
          portability_rate_threshold: "",
          refin_portability_rate_threshold: "",
          min_installment_value: "",
          min_debt_balance: "",
          use_balance_plus_released: false,
          min_paid_installments: 0,
          excluded_origin_banks: "",
          origin_banks_min_paid: "",
          excluded_benefit_types: "",
          accepts_disability: false,
          disability_min_age: "",
          disability_max_age: "",
          disability_grace_age: "",
          disability_min_benefit_years: "",
          disability_min_benefit_months: "",
          active: true
        }
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingBank(null);
    setShowAddRuleForm(false);
    setFormData({ 
      name: "", 
      logo_url: "",
      active: true,
      priority: 99,
      rules: {
        agreement: "",
        sub_agreement: "",
        min_age: 18,
        max_age: 80,
        max_term: 84,
        min_release_amount: 0,
        literacy_required: false,
        accepts_illiterate: true,
        accepts_60_plus: true,
        portability_rate_threshold: "",
        refin_portability_rate_threshold: "",
        min_installment_value: "",
        min_debt_balance: "",
        use_balance_plus_released: false,
        accepts_disability: false,
        disability_min_age: "",
        disability_max_age: "",
        disability_grace_age: "",
        disability_min_benefit_years: "",
        disability_min_benefit_months: "",
        excluded_origin_banks: "",
        origin_banks_min_paid: "",
        excluded_benefit_types: "",
        active: true
      }
    });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const bankPayload = { 
        name: formData.name, 
        logo_url: formData.logo_url, 
        active: formData.active,
        priority: parseInt(formData.priority) || 99
      };
      
      let savedBank;
      if (editingBank) {
        savedBank = await api.patch(`/admin/banks/${editingBank.id}`, bankPayload);
      } else {
        savedBank = await api.post("/admin/banks", bankPayload);
      }

      // Save ALL rules in bankRules list
      for (const rule of bankRules) {
        const rulePayload = {
          agreement: rule.agreement,
          sub_agreement: rule.sub_agreement || "",
          min_age: parseInt(rule.min_age) || 18,
          max_age: parseInt(rule.max_age) || 80,
          max_term: parseInt(rule.max_term) || 84,
          min_release_amount: parseFloat(rule.min_release_amount) || 0,
          allowed_benefit_types: rule.allowed_benefit_types || "",
          literacy_required: rule.literacy_required || false,
          accepts_illiterate: rule.accepts_illiterate ?? true,
          accepts_60_plus: rule.accepts_60_plus ?? true,
          portability_rate_threshold: rule.portability_rate_threshold ? parseFloat(rule.portability_rate_threshold) : null,
          refin_portability_rate_threshold: rule.refin_portability_rate_threshold ? parseFloat(rule.refin_portability_rate_threshold) : null,
          min_installment_value: rule.min_installment_value ? parseFloat(rule.min_installment_value) : null,
          min_debt_balance: rule.min_debt_balance ? parseFloat(rule.min_debt_balance) : null,
          use_balance_plus_released: rule.use_balance_plus_released ?? false,
          min_paid_installments: parseInt(rule.min_paid_installments) || 0,
          excluded_origin_banks: rule.excluded_origin_banks || "",
          origin_banks_min_paid: rule.origin_banks_min_paid || "",
          excluded_benefit_types: rule.excluded_benefit_types || "",
          accepts_disability: rule.accepts_disability ?? false,
          disability_min_age: rule.disability_min_age ? parseInt(rule.disability_min_age) : null,
          disability_max_age: rule.disability_max_age ? parseInt(rule.disability_max_age) : null,
          disability_grace_age: rule.disability_grace_age ? parseInt(rule.disability_grace_age) : null,
          disability_min_benefit_years: rule.disability_min_benefit_years ? parseInt(rule.disability_min_benefit_years) : null,
          disability_min_benefit_months: rule.disability_min_benefit_months ? parseInt(rule.disability_min_benefit_months) : null,
          bank_id: savedBank.id,
          active: rule.active ?? true
        };

        if (rule.id) {
          await api.patch(`/admin/bank-rules/${rule.id}`, rulePayload);
        } else {
          await api.post("/admin/bank-rules", rulePayload);
        }
      }

      loadBanks();
      alert("✅ Banco e Regras salvos com sucesso!");
      handleCloseModal();
    } catch (error: any) {
      console.error("Erro ao salvar banco:", error);
      const detail = error.message || "Erro ao salvar banco. Verifique os dados e tente novamente.";
      alert(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAgreementChange = (newAgreement: string, newSubAgreement: string = "") => {
    setSelectedAgreement(newAgreement);
    setSelectedSubAgreement(newSubAgreement);
    const rule = bankRules.find(r => r.agreement === newAgreement && (r.sub_agreement || "") === newSubAgreement);
    if (rule) {
      setFormData(prev => ({
        ...prev,
        rules: {
          agreement: rule.agreement,
          sub_agreement: rule.sub_agreement || "",
          min_age: rule.min_age ?? 18,
          max_age: rule.max_age ?? 80,
          max_term: rule.max_term ?? 84,
          min_release_amount: rule.min_release_amount ?? 0,
          literacy_required: rule.literacy_required ?? false,
          accepts_illiterate: rule.accepts_illiterate ?? true,
          accepts_60_plus: rule.accepts_60_plus ?? true,
          portability_rate_threshold: rule.portability_rate_threshold ?? "",
          refin_portability_rate_threshold: rule.refin_portability_rate_threshold ?? "",
          min_installment_value: rule.min_installment_value ?? "",
          min_debt_balance: rule.min_debt_balance ?? "",
          use_balance_plus_released: rule.use_balance_plus_released ?? false,
          min_paid_installments: rule.min_paid_installments ?? 0,
          excluded_origin_banks: rule.excluded_origin_banks ?? "",
          origin_banks_min_paid: rule.origin_banks_min_paid ?? "",
          excluded_benefit_types: rule.excluded_benefit_types ?? "",
          accepts_disability: rule.accepts_disability ?? false,
          disability_min_age: rule.disability_min_age ?? "",
          disability_max_age: rule.disability_max_age ?? "",
          disability_grace_age: rule.disability_grace_age ?? "",
          disability_min_benefit_years: rule.disability_min_benefit_years ?? "",
          disability_min_benefit_months: rule.disability_min_benefit_months ?? "",
          active: rule.active ?? true
        }
      }));
    }
  };

  const handleAddNewRule = () => {
    if (!newAgreement) return;
    const exists = bankRules.some(r => r.agreement === newAgreement && (r.sub_agreement || "") === newSubAgreement);
    if (exists) {
      alert(`⚠️ A regra para ${newAgreement}${newSubAgreement ? ` - ${newSubAgreement}` : ""} já existe!`);
      handleAgreementChange(newAgreement, newSubAgreement);
      setShowAddRuleForm(false);
      return;
    }

    const defaultRule = {
      agreement: newAgreement,
      sub_agreement: newSubAgreement,
      min_age: 18,
      max_age: 80,
      max_term: 84,
      min_release_amount: 0,
      literacy_required: false,
      accepts_illiterate: true,
      accepts_60_plus: true,
      portability_rate_threshold: "",
      refin_portability_rate_threshold: "",
      min_installment_value: "",
      min_debt_balance: "",
      use_balance_plus_released: false,
      min_paid_installments: 0,
      excluded_origin_banks: "",
      origin_banks_min_paid: "",
      excluded_benefit_types: "",
      accepts_disability: false,
      disability_min_age: "",
      disability_max_age: "",
      disability_grace_age: "",
      disability_min_benefit_years: "",
      disability_min_benefit_months: "",
      active: true
    };

    setBankRules(prev => [...prev, defaultRule]);
    setSelectedAgreement(newAgreement);
    setSelectedSubAgreement(newSubAgreement);
    setFormData(prev => ({
      ...prev,
      rules: defaultRule
    }));
    setShowAddRuleForm(false);
    setNewAgreement("INSS");
    setNewSubAgreement("");
  };

  const handleDeleteRule = async (ruleToDelete: any) => {
    if (!window.confirm(`Tem certeza que deseja excluir a regra de convênio ${ruleToDelete.agreement}${ruleToDelete.sub_agreement ? ` - ${ruleToDelete.sub_agreement}` : ""}?`)) return;
    
    try {
      if (ruleToDelete.id) {
        await api.delete(`/admin/bank-rules/${ruleToDelete.id}`);
      }
      
      const updatedRules = bankRules.filter(r => !(r.agreement === ruleToDelete.agreement && (r.sub_agreement || "") === (ruleToDelete.sub_agreement || "")));
      setBankRules(updatedRules);
      
      if (updatedRules.length > 0) {
        handleAgreementChange(updatedRules[0].agreement, updatedRules[0].sub_agreement || "");
      } else {
        setSelectedAgreement("");
        setSelectedSubAgreement("");
        setFormData(prev => ({
          ...prev,
          rules: {
            agreement: "",
            sub_agreement: "",
            min_age: 18,
            max_age: 80,
            max_term: 84,
            min_release_amount: 0,
            literacy_required: false,
            accepts_illiterate: true,
            accepts_60_plus: true,
            portability_rate_threshold: "",
            refin_portability_rate_threshold: "",
            min_installment_value: "",
            min_debt_balance: "",
            use_balance_plus_released: false,
            min_paid_installments: 0,
            excluded_origin_banks: "",
            origin_banks_min_paid: "",
            excluded_benefit_types: "",
            accepts_disability: false,
            disability_min_age: "",
            disability_max_age: "",
            disability_grace_age: "",
            disability_min_benefit_years: "",
            disability_min_benefit_months: "",
            active: true
          }
        }));
      }
      alert("✅ Regra de convênio removida!");
    } catch (error) {
      console.error("Erro ao excluir regra:", error);
      alert("Erro ao excluir regra do convênio.");
    }
  };

  const handleLogoUpload = async (e) => {
    if (!editingBank) {
      alert("Salve o banco primeiro para fazer o upload da logo.");
      return;
    }
    
    const file = e.target.files[0];
    if (!file) return;

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    try {
      const response = await api.upload(`/admin/banks/${editingBank?.id}/upload-logo`, uploadFormData);
      
      // Atualiza o estado local IMEDIATAMENTE para a imagem aparecer na hora
      setFormData(prev => ({ ...prev, logo_url: response.logo_url }));
      
      // Atualiza o banco na lista lateral
      setBanks(prev => prev.map(b => b.id === editingBank.id ? { ...b, logo_url: response.logo_url } : b));
      
      alert("✅ Logo enviada com sucesso!");
    } catch (error) {
      console.error("Erro no upload:", error);
      alert("Erro ao enviar logo.");
    } finally {
      loadBanks(); // Recarrega do banco para garantir sincronia
    }
  };

  const addExcludedBank = () => {
    if (!excludedInput.trim()) return;
    const current = formData.rules.excluded_origin_banks ? formData.rules.excluded_origin_banks.split(',').map(s => s.trim().toUpperCase()) : [];
    if (!current.includes(excludedInput.trim().toUpperCase())) {
      const newList = [...current, excludedInput.trim().toUpperCase()].join(',');
      updateRuleField("excluded_origin_banks", newList);
    }
    setExcludedInput("");
  };

  const removeExcludedBank = (bank) => {
    const newList = formData.rules.excluded_origin_banks.split(',').map(s => s.trim().toUpperCase()).filter(b => b !== bank).join(',');
    updateRuleField("excluded_origin_banks", newList);
  };

  const addExcludedBenefitType = () => {
    if (!benefitTypeInput.trim()) return;
    const current = formData.rules.excluded_benefit_types ? formData.rules.excluded_benefit_types.split(',').map(s => s.trim().toUpperCase()) : [];
    if (!current.includes(benefitTypeInput.trim().toUpperCase())) {
      const newList = [...current, benefitTypeInput.trim().toUpperCase()].join(',');
      updateRuleField("excluded_benefit_types", newList);
    }
    setBenefitTypeInput("");
  };

  const removeExcludedBenefitType = (species) => {
    const newList = formData.rules.excluded_benefit_types.split(',').map(s => s.trim().toUpperCase()).filter(b => b !== species).join(',');
    updateRuleField("excluded_benefit_types", newList);
  };

  const addBankCarença = () => {
    if (!bankCarInput.trim() || !parcCarInput.trim()) return;
    let currentData = {};
    try {
      currentData = formData.rules.origin_banks_min_paid ? JSON.parse(formData.rules.origin_banks_min_paid) : {};
    } catch {}
    
    currentData[bankCarInput.trim().toUpperCase()] = parseInt(parcCarInput) || 0;
    updateRuleField("origin_banks_min_paid", JSON.stringify(currentData));
    
    setBankCarInput("");
    setParcCarInput("");
  };

  const removeBankCarença = (bank) => {
    let currentData = {};
    try {
      currentData = JSON.parse(formData.rules.origin_banks_min_paid);
      delete currentData[bank];
      updateRuleField("origin_banks_min_paid", JSON.stringify(currentData));
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Certeza que deseja excluir este banco?")) return;
    try {
      await api.delete(`/admin/banks/${id}`);
      loadBanks();
    } catch (error) {
      console.error("Erro ao excluir banco:", error);
      alert("Erro ao excluir banco.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      {/* Header Premium */}
      <PageHeader
        title="Instituições"
        highlight="Bancárias"
        subtitle="Controle central de ativos, identidades visuais e restrições operacionais."
      >
        <button 
          onClick={() => handleOpenModal()}
          className="relative overflow-hidden bg-blue-600 hover:bg-blue-500 text-white font-black py-3 px-8 rounded-2xl transition-all shadow-2xl shadow-blue-500/40 hover:-translate-y-1 active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-3 group"
        >
          <span className="text-lg group-hover:rotate-90 transition-transform duration-300">＋</span> 
          Novo Banco
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        </button>
      </PageHeader>

      {/* Grid de Bancos Premium */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest animate-pulse">Sincronizando Base de Dados...</p>
          </div>
        ) : banks.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/5">
             <span className="text-4xl block mb-4">🏦</span>
             <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhuma instituição cadastrada.</p>
          </div>
        ) : (
          banks.map((bank) => (
            <div key={bank?.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-white/10 shadow-xl hover:shadow-2xl transition-all duration-500 group relative overflow-hidden flex flex-col">
              {/* Status Badge */}
              <div className="absolute top-6 right-6">
                 <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                    bank.active 
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                      : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                  }`}>
                    {bank.active ? "● Online" : "○ Offline"}
                 </span>
              </div>

              {/* Logo Area */}
              {(() => {
                const isLogoActive = bank.active && (!bank.rules || bank.rules.length === 0 || bank.rules.some((r: any) => r.active !== false));
                return (
                  <div className="flex flex-col items-center mb-6 pt-4">
                    <div className="w-20 h-20 rounded-[1.5rem] bg-slate-50 dark:bg-white/5 p-0 shadow-inner border border-slate-100 dark:border-white/5 group-hover:scale-110 transition-transform duration-500 flex items-center justify-center relative overflow-hidden">
                      {bank?.logo_url ? (
                        <img 
                          src={getStaticUrl(bank.logo_url) || ""} 
                          alt={bank.name} 
                          className={`w-full h-full object-cover relative z-10 transition-all duration-500 ${
                            isLogoActive ? "grayscale-0" : "grayscale opacity-50 contrast-75"
                          }`} 
                        />
                      ) : (
                        <span className={`text-2xl font-black relative z-10 transition-all duration-500 ${
                          isLogoActive ? "text-blue-600" : "text-slate-400"
                        }`}>
                          {bank?.name?.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    <h3 className="mt-4 font-black text-slate-800 dark:text-white text-base tracking-tight uppercase group-hover:text-blue-600 transition-colors text-center">{bank?.name}</h3>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1 opacity-60">ID #{bank?.id}</p>
                  </div>
                );
              })()}

              {/* Convenios Badges */}
              <div className="flex flex-wrap justify-center gap-1.5 mb-8">
                {bank.rules && bank.rules.length > 0 ? (
                  Array.from(new Set(bank.rules.map(r => r.agreement))).map(agr => {
                    const isAgrActive = bank.rules.some(r => r.agreement === agr && r.active !== false);
                    return (
                      <span 
                        key={agr} 
                        className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
                          !isAgrActive 
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700/50'
                            : agr === 'INSS' ? 'bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/20' :
                              agr === 'SIAPE' ? 'bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/20' :
                              agr === 'FORCAS' || agr === 'FORÇAS ARMADAS' ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/20' :
                              'bg-slate-800 text-white border-slate-700'
                        }`}
                      >
                        {!isAgrActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block shrink-0 animate-pulse"></span>
                        )}
                        {agr === 'FORCAS' || agr === 'FORÇAS ARMADAS' ? 'FORÇAS' : agr}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-[9px] text-slate-300 italic font-black uppercase tracking-widest">Sem Regras</span>
                )}
              </div>

              {/* Action Footer Premium */}
              <div className="mt-auto flex gap-3 pt-5 border-t border-slate-100 dark:border-white/5">
                <button 
                  onClick={() => handleOpenModal(bank)}
                  className="flex-1 py-3 bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 hover:from-blue-600 hover:to-indigo-600 text-slate-600 dark:text-slate-300 hover:text-white rounded-[1.25rem] text-[9px] font-black uppercase tracking-widest transition-all duration-300 border border-slate-200 dark:border-slate-700/50 hover:border-transparent hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 flex items-center justify-center gap-2.5 group/btn relative overflow-hidden"
                >
                  <svg className="w-4 h-4 text-slate-400 group-hover/btn:text-white transition-colors group-hover/btn:rotate-90 duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  Configurar
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
                </button>
                
                <button 
                  onClick={() => handleDelete(bank.id)}
                  className="w-[46px] h-[46px] bg-rose-50/50 dark:bg-rose-900/10 hover:bg-gradient-to-br hover:from-rose-500 hover:to-red-600 text-rose-500 hover:text-white rounded-[1.25rem] transition-all duration-300 border border-rose-100 dark:border-rose-500/20 hover:border-transparent hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-0.5 flex items-center justify-center shrink-0 group/del relative overflow-hidden"
                  title="Excluir Banco"
                >
                  <svg className="w-4 h-4 transition-transform group-hover/del:scale-110 group-hover/del:-rotate-12 duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/del:translate-x-full transition-transform duration-700"></div>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up border border-white/20">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingBank && editingBank.name ? `Configurar: ${editingBank.name}` : "Novo Banco"}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 text-2xl font-light">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nome do Banco *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="input-admin"
                    placeholder="Ex: Banco Itaú"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Prioridade</label>
                  <input 
                    type="number" 
                    required
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="input-admin"
                    placeholder="Ex: 1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Logo do Banco</label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl border border-dashed border-slate-300 transition-all font-bold text-xs uppercase">
                      <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                      <span>📁 Enviar Arquivo</span>
                    </label>
                    {formData.logo_url && (
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-300 bg-white shadow-md flex-shrink-0">
                        <img 
                          src={getStaticUrl(formData.logo_url) || formData.logo_url} 
                          className={`w-full h-full object-cover transition-all duration-500 ${
                            formData.active ? "grayscale-0" : "grayscale opacity-50 contrast-75"
                          }`} 
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1 italic">Recomendado: 200x200px PNG/JPG</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span>⚖️</span> Regras de Aceitação
                </h4>

                <div className="mb-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col gap-3">
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1.5">Selecione o Convênio para configurar a Regra</label>
                      {bankRules.length === 0 ? (
                        <div className="text-xs font-semibold text-slate-400 italic py-2">
                          Nenhuma regra cadastrada para este banco.
                        </div>
                      ) : (
                        <select
                          value={`${selectedAgreement}|||${selectedSubAgreement}`}
                          onChange={(e) => {
                            const [agr, sub] = e.target.value.split("|||");
                            handleAgreementChange(agr, sub);
                          }}
                          className="w-full bg-white text-slate-800 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all uppercase"
                        >
                          {bankRules.map((rule, idx) => {
                            const label = `${rule.agreement}${rule.sub_agreement ? ` - ${rule.sub_agreement}` : ""}`;
                            return (
                              <option key={idx} value={`${rule.agreement}|||${rule.sub_agreement || ""}`}>
                                {rule.agreement === "FORÇAS ARMADAS" ? `FORÇAS ARMADAS${rule.sub_agreement ? ` - ${rule.sub_agreement}` : " (GERAL)"}` : label}
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </div>
                    
                    {selectedAgreement && (
                      <div className="flex items-end h-[60px] pb-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            const rule = bankRules.find(r => r.agreement === selectedAgreement && (r.sub_agreement || "") === selectedSubAgreement);
                            if (rule) handleDeleteRule(rule);
                          }}
                          className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl border border-rose-100 hover:border-transparent transition-all shadow-sm flex items-center justify-center gap-1.5 font-bold text-xs uppercase"
                          title="Excluir esta Regra"
                        >
                          <span className="text-sm">🗑️</span> Excluir
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    {!showAddRuleForm ? (
                      <button
                        type="button"
                        onClick={() => setShowAddRuleForm(true)}
                        className="w-full py-2.5 bg-white hover:bg-blue-50 text-blue-600 rounded-xl border border-dashed border-blue-200 font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <span>＋</span> Adicionar Regra para um Convênio
                      </button>
                    ) : (
                      <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Nova Regra de Convênio</span>
                          <button
                            type="button"
                            onClick={() => setShowAddRuleForm(false)}
                            className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase"
                          >
                            Cancelar
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-[8px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Tipo de Convênio</label>
                            <select
                              value={newAgreement}
                              onChange={(e) => {
                                setNewAgreement(e.target.value);
                                setNewSubAgreement("");
                              }}
                              className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
                            >
                              {["INSS", "SIAPE", "GOVERNOS", "FORÇAS ARMADAS", "CLT_PRIVADO"].map(agr => (
                                <option key={agr} value={agr}>
                                  {agr === "FORÇAS ARMADAS" ? "FORÇAS ARMADAS" : agr === "CLT_PRIVADO" ? "CLT PRIVADO" : agr}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          {newAgreement === "GOVERNOS" && (
                            <div>
                              <label className="block text-[8px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Estado (UF)</label>
                              <select
                                value={newSubAgreement}
                                onChange={(e) => setNewSubAgreement(e.target.value)}
                                className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
                              >
                                <option value="">Selecione o Estado...</option>
                                {[
                                  { value: "AC", label: "AC - ACRE" }, { value: "AL", label: "AL - ALAGOAS" }, { value: "AP", label: "AP - AMAPÁ" },
                                  { value: "AM", label: "AM - AMAZONAS" }, { value: "BA", label: "BA - BAHIA" }, { value: "CE", label: "CE - CEARÁ" },
                                  { value: "DF", label: "DF - DISTRITO FEDERAL" }, { value: "ES", label: "ES - ESPÍRITO SANTO" }, { value: "GO", label: "GO - GOIÁS" },
                                  { value: "MA", label: "MA - MARANHÃO" }, { value: "MT", label: "MT - MATO GROSSO" }, { value: "MS", label: "MS - MATO GROSSO DO SUL" },
                                  { value: "MG", label: "MG - MINAS GERAIS" }, { value: "PA", label: "PA - PARÁ" }, { value: "PB", label: "PB - PARAÍBA" },
                                  { value: "PR", label: "PR - PARANÁ" }, { value: "PE", label: "PE - PERNAMBUCO" }, { value: "PI", label: "PI - PIAUÍ" },
                                  { value: "RJ", label: "RJ - RIO DE JANEIRO" }, { value: "RN", label: "RN - RIO GRANDE DO NORTE" }, { value: "RS", label: "RS - RIO GRANDE DO SUL" },
                                  { value: "RO", label: "RO - RONDÔNIA" }, { value: "RR", label: "RR - RORAIMA" }, { value: "SC", label: "SC - SANTA CATARINA" },
                                  { value: "SP", label: "SP - SÃO PAULO" }, { value: "SE", label: "SE - SERGIPE" }, { value: "TO", label: "TO - TOCANTINS" }
                                ].map(sub => (
                                  <option key={sub.value} value={sub.value}>{sub.label}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          
                          {newAgreement === "FORÇAS ARMADAS" && (
                            <div>
                              <label className="block text-[8px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Organização</label>
                              <select
                                value={newSubAgreement}
                                onChange={(e) => setNewSubAgreement(e.target.value)}
                                className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
                              >
                                <option value="">Selecione o Ramo...</option>
                                {["EXÉRCITO", "AERONÁUTICA", "MARINHA"].map(sub => (
                                  <option key={sub} value={sub}>{sub}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                        
                        <button
                          type="button"
                          onClick={handleAddNewRule}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20"
                        >
                          Adicionar Convênio
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedAgreement && (
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/5 mt-2 shadow-sm">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                         Ativar Simulação ({formData.rules.agreement}{formData.rules.sub_agreement ? ` - ${formData.rules.sub_agreement}` : ""})?
                      </span>
                      <button
                        type="button"
                        onClick={() => updateRuleField("active", !formData.rules.active)}
                        className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all border ${
                          formData.rules.active !== false 
                            ? "bg-emerald-500 text-white border-emerald-400 shadow-sm" 
                            : "bg-rose-500 text-white border-rose-400 shadow-sm"
                        }`}
                      >
                        {formData.rules.active !== false ? "ATIVADO" : "DESATIVADO"}
                      </button>
                    </div>
                  )}

                  <p className="text-[9px] text-slate-400 italic">Cada convênio tem suas próprias regras de idade e portabilidade.</p>
                </div>
                
                {selectedAgreement ? (
                  <div className="space-y-4 mt-4 animate-in fade-in duration-300">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Idade Mínima</label>
                        <input 
                          type="number" 
                          value={formData.rules.min_age}
                          onChange={(e) => updateRuleField("min_age", parseInt(e.target.value) || 0)}
                          className="input-admin !py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Idade Máxima</label>
                        <input 
                          type="number" 
                          value={formData.rules.max_age}
                          onChange={(e) => updateRuleField("max_age", parseInt(e.target.value) || 0)}
                          className="input-admin !py-2"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Taxa Portabilidade (%)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          value={formData.rules.portability_rate_threshold}
                          onChange={(e) => updateRuleField("portability_rate_threshold", e.target.value)}
                          className="input-admin !py-2"
                          placeholder="Ex: 1.50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Taxa Refin (%)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          value={formData.rules.refin_portability_rate_threshold}
                          onChange={(e) => updateRuleField("refin_portability_rate_threshold", e.target.value)}
                          className="input-admin !py-2"
                          placeholder="Ex: 1.60"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Valor Parcela Mín.</label>
                        <input 
                          type="number" 
                          value={formData.rules.min_installment_value}
                          onChange={(e) => updateRuleField("min_installment_value", e.target.value)}
                          className="input-admin !py-2"
                          placeholder="R$ 50,00"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Saldo Devedor Mín.</label>
                        <input 
                          type="number" 
                          value={formData.rules.min_debt_balance}
                          onChange={(e) => updateRuleField("min_debt_balance", e.target.value)}
                          className="input-admin !py-2"
                          placeholder="R$ 1000,00"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mín. Parc. Pagas (Geral)</label>
                        <input 
                          type="number" 
                          value={formData.rules.min_paid_installments}
                          onChange={(e) => updateRuleField("min_paid_installments", parseInt(e.target.value) || 0)}
                          className="input-admin !py-2"
                        />
                      </div>
                    </div>

                    <div className="space-y-6 mb-4 mt-6">
                      {formData.rules.agreement === "INSS" && (
                        <div className="p-4 bg-orange-50/30 rounded-2xl border border-orange-100">
                          <label className="block text-[10px] font-bold text-orange-600 uppercase mb-2">Espécies de Benefício NÃO Atendidas (Bloquear)</label>
                          <div className="flex gap-2 mb-3">
                            <input 
                              type="text" 
                              list="inssSpecies"
                              value={benefitTypeInput}
                              onChange={(e) => setBenefitTypeInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExcludedBenefitType())}
                              className="input-admin !py-2 !text-xs flex-1"
                              placeholder="Ex: 04, 32, 92..."
                            />
                            <datalist id="inssSpecies">
                              {["04", "05", "06", "32", "33", "34", "92", "87", "88", "42", "21"].map(s => (
                                <option key={s} value={s} />
                              ))}
                            </datalist>
                            <button type="button" onClick={addExcludedBenefitType} className="px-4 bg-orange-600 text-white rounded-xl text-xs font-bold leading-none">+</button>
                          </div>
                          <div className="flex flex-wrap gap-2 min-h-fit py-2 items-center">
                            {(formData.rules.excluded_benefit_types || "").split(',').filter(Boolean).map(species => (
                              <span key={species} className="px-3 py-1 bg-orange-600/90 text-white text-[9px] font-black rounded-lg flex items-center gap-2 shadow-sm animate-fade-in group whitespace-nowrap">
                                ESPÉCIE {species.trim().toUpperCase()}
                                <button type="button" onClick={() => removeExcludedBenefitType(species)} className="hover:scale-120 transition-all opacity-60 group-hover:opacity-100">×</button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="p-4 bg-red-50/30 rounded-2xl border border-red-100">
                        <label className="block text-[10px] font-bold text-red-600 uppercase mb-2">Bancos de Origem NÃO Portados (Excluir)</label>
                        <div className="flex gap-2 mb-3">
                          <input 
                            type="text" 
                            list="commonBanks"
                            value={excludedInput}
                            onChange={(e) => setExcludedInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExcludedBank())}
                            className="input-admin !py-2 !text-xs flex-1"
                            placeholder="Escolha ou Digite o Banco..."
                          />
                          <button type="button" onClick={addExcludedBank} className="px-4 bg-red-600 text-white rounded-xl text-xs font-bold leading-none">+</button>
                        </div>
                        <div className="flex flex-wrap gap-2 min-h-fit py-2 items-center">
                          {(formData.rules.excluded_origin_banks || "").split(',').filter(Boolean).map(bank => (
                            <span key={bank} className="px-3 py-1 bg-red-600/90 text-white text-[9px] font-black rounded-lg flex items-center gap-2 shadow-sm animate-fade-in group whitespace-nowrap">
                              {bank.trim().toUpperCase()}
                              <button type="button" onClick={() => removeExcludedBank(bank)} className="hover:scale-120 transition-all opacity-60 group-hover:opacity-100">×</button>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100">
                        <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-2">Regra Específica: Banco e Parcelas Pagas</label>
                        <div className="flex gap-2 mb-3 items-start">
                          <div className="flex-1">
                            <label className="block text-[8px] font-bold text-slate-400 mb-1 ml-1 uppercase tracking-widest">Banco</label>
                            <input 
                              type="text" 
                              list="commonBanks"
                              value={bankCarInput}
                              onChange={(e) => setBankCarInput(e.target.value)}
                              className="input-admin !py-2 !text-xs w-full"
                              placeholder="029 - ITAU..."
                            />
                            <datalist id="commonBanks">
                              {["AGIBANK", "BMG", "BRADESCO", "CAIXA", "ITAU", "PAN", "SAFRA", "SANTANDER", "DAYCOVAL", "C6", "PICPAY", "INBURSA", "MERCANTIL"].map(b => (
                                <option key={b} value={b} />
                              ))}
                            </datalist>
                          </div>
                          <div className="w-24">
                            <label className="block text-[8px] font-bold text-slate-400 mb-1 ml-1 uppercase tracking-widest">Parcelas Pagas</label>
                            <input 
                              type="number" 
                              value={parcCarInput}
                              onChange={(e) => setParcCarInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBankCarença())}
                              className="input-admin !py-2 !text-xs w-full"
                              placeholder="Min: 12"
                            />
                          </div>
                          <button type="button" onClick={addBankCarença} className="px-5 bg-emerald-600 text-white rounded-xl text-xs font-bold leading-none mt-5 h-[38px] transition-all hover:scale-105 active:scale-95">+</button>
                        </div>
                        <div className="flex flex-wrap gap-2 min-h-fit py-2 items-center">
                          {Object.entries(safeParse(formData.rules.origin_banks_min_paid, {})).map(([bank, parc]) => (
                            <span key={bank} className="px-3 py-1 bg-emerald-600/90 text-white text-[9px] font-black rounded-lg flex items-center gap-2 shadow-sm animate-fade-in group whitespace-nowrap">
                              {bank}; {parc as string} PARC. PAGAS
                              <button type="button" onClick={() => removeBankCarença(bank)} className="hover:scale-120 transition-all opacity-60 group-hover:opacity-100">×</button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 bg-slate-50 rounded-xl border border-slate-100 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600">Analfabeto</span>
                        <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                          <button 
                            type="button"
                            onClick={() => updateRuleField("accepts_illiterate", true)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${formData.rules.accepts_illiterate ? "bg-emerald-500 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                          >
                            SIM
                          </button>
                          <button 
                            type="button"
                            onClick={() => updateRuleField("accepts_illiterate", false)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${!formData.rules.accepts_illiterate ? "bg-red-500 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                          >
                            NÃO
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600">Aceita 60+</span>
                        <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                          <button 
                            type="button"
                            onClick={() => updateRuleField("accepts_60_plus", true)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${formData.rules.accepts_60_plus ? "bg-emerald-500 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                          >
                            SIM
                          </button>
                          <button 
                            type="button"
                            onClick={() => updateRuleField("accepts_60_plus", false)}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${!formData.rules.accepts_60_plus ? "bg-red-500 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                          >
                            NÃO
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600">Saldo Devedor + Valor Liberado</span>
                        <button 
                          type="button"
                          onClick={() => updateRuleField("use_balance_plus_released", !formData.rules.use_balance_plus_released)}
                          className={`px-4 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                            formData.rules.use_balance_plus_released 
                              ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                              : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {formData.rules.use_balance_plus_released ? "ATIVADO" : "DESATIVADO"}
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 mt-6 border-t border-slate-100">
                      <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span>♿</span> Regras de Invalidez (04, 32, 92)
                      </h4>
                      
                      <div className="flex items-center justify-between mb-4 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                        <span className="text-xs font-bold text-blue-700">Aceita Invalidez?</span>
                        <button 
                          type="button"
                          onClick={() => updateRuleField("accepts_disability", !formData.rules.accepts_disability)}
                          className={`px-4 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                            formData.rules.accepts_disability 
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-md" 
                              : "bg-white text-slate-400 border-slate-200"
                          }`}
                        >
                          {formData.rules.accepts_disability ? "SIM" : "NÃO"}
                        </button>
                      </div>

                      {formData.rules.accepts_disability && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Idade Mínima</label>
                              <input 
                                type="number" 
                                value={formData.rules.disability_min_age}
                                onChange={(e) => updateRuleField("disability_min_age", e.target.value)}
                                className="input-admin !py-2"
                                placeholder="Mínima"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Idade Máxima</label>
                              <input 
                                type="number" 
                                value={formData.rules.disability_max_age}
                                onChange={(e) => updateRuleField("disability_max_age", e.target.value)}
                                className="input-admin !py-2"
                                placeholder="Máxima"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Isenção da DIB a partir</label>
                              <input 
                                type="number" 
                                value={formData.rules.disability_grace_age}
                                onChange={(e) => updateRuleField("disability_grace_age", e.target.value)}
                                className="input-admin !py-2"
                                placeholder="Ex: 60"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tempo Benefício (Anos)</label>
                              <input 
                                type="number" 
                                value={formData.rules.disability_min_benefit_years}
                                onChange={(e) => updateRuleField("disability_min_benefit_years", e.target.value)}
                                className="input-admin !py-2"
                                placeholder="Anos"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tempo Benefício (Meses)</label>
                              <input 
                                type="number" 
                                value={formData.rules.disability_min_benefit_months}
                                onChange={(e) => updateRuleField("disability_min_benefit_months", e.target.value)}
                                className="input-admin !py-2"
                                placeholder="Meses"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-white/5 mt-4">
                    <span className="text-2xl block mb-2">⚖️</span>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Escolha ou Adicione um Convênio acima para configurar.</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 py-2">
                <input 
                  type="checkbox" 
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({...formData, active: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="active" className="text-sm font-semibold text-slate-600 cursor-pointer select-none">
                  Banco Ativo para Simulações
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50"
                >
                  {isSubmitting ? "Salvando..." : editingBank ? "Salvar Alterações" : "Criar Banco"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
