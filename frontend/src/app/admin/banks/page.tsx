"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { api, getStaticUrl } from "@/utils/api";
import { Icons } from "@/components/Icons";
import { useToast } from "@/components/ToastProvider";

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
  const { toast } = useToast();
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<any>(null);
  const [formData, setFormData] = useState<any>({ 
    name: "", 
    logo_url: "",
    active: true,
    priority: 99,
    is_margin_base: false,
    margin_base_priority: 0,
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
  const [activeTab, setActiveTab] = useState<"basic" | "rules">("basic");
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
    setActiveTab("basic");
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
            is_margin_base: bank.is_margin_base || false,
            margin_base_priority: bank.margin_base_priority || 0,
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
            is_margin_base: bank.is_margin_base || false,
            margin_base_priority: bank.margin_base_priority || 0,
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
        is_margin_base: false,
        margin_base_priority: 0,
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
      is_margin_base: false,
      margin_base_priority: 0,
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
        priority: parseInt(formData.priority) || 99,
        is_margin_base: formData.is_margin_base || false,
        margin_base_priority: parseInt(formData.margin_base_priority) || 0
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
      toast.success("Banco e Regras salvos com sucesso!");
      handleCloseModal();
    } catch (error: any) {
      console.error("Erro ao salvar banco:", error);
      const detail = error.message || "Erro ao salvar banco. Verifique os dados e tente novamente.";
      toast.error(detail);
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
      toast.warning(`A regra para ${newAgreement}${newSubAgreement ? ` - ${newSubAgreement}` : ""} já existe!`);
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
      toast.success("Regra de convênio removida!");
    } catch (error) {
      console.error("Erro ao excluir regra:", error);
      toast.error("Erro ao excluir regra do convênio.");
    }
  };

  const handleLogoUpload = async (e) => {
    if (!editingBank) {
      toast.warning("Salve o banco primeiro para fazer o upload da logo.");
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
      
      toast.success("Logo enviada com sucesso!");
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao enviar logo.");
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
      toast.error("Erro ao excluir banco.");
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
                  Array.from(new Set(bank.rules.map((r: any) => r.agreement as string))).map((agr: string) => {
                    const isAgrActive = bank.rules.some((r: any) => r.agreement === agr && r.active !== false);
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
          <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-scale-up border border-slate-100 dark:border-white/10 flex flex-col max-h-[90vh]">
            {/* Header Premium */}
            <div className="bg-slate-50 dark:bg-white/5 px-8 py-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg shadow-inner">
                  🏦
                </div>
                <div>
                  <h3 className="font-black text-slate-800 dark:text-white text-base tracking-tight uppercase">
                    {editingBank && editingBank.name ? `Configurar: ${editingBank.name}` : "Novo Banco"}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Definições cadastrais e de elegibilidade</p>
                </div>
              </div>
              
              <button 
                type="button"
                onClick={handleCloseModal} 
                className="p-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-500 dark:bg-white/5 dark:hover:bg-rose-500/20 dark:hover:text-rose-400 rounded-xl text-slate-400 dark:text-slate-500 transition-all duration-300 flex items-center justify-center shadow-inner"
              >
                <Icons.X size={16} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-100 dark:border-white/5 px-8 bg-slate-50/50 dark:bg-white/5 gap-6 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("basic")}
                className={`py-4 px-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2.5 ${
                  activeTab === "basic"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                    : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                <Icons.User size={16} />
                Dados Gerais
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("rules")}
                className={`py-4 px-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2.5 ${
                  activeTab === "rules"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                    : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                <Icons.Layers size={16} />
                Regras de Convênios
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0 bg-white dark:bg-slate-900">
              <div className="p-8 space-y-6 flex-1">
                {activeTab === "basic" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5">Nome do Banco *</label>
                        <input 
                          type="text" 
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full py-3.5 px-5 bg-slate-50 dark:bg-white/5 rounded-2xl border-none shadow-inner text-xs font-semibold placeholder-slate-400 focus:ring-2 ring-blue-500/20 text-slate-800 dark:text-white transition-all outline-none"
                          placeholder="Ex: Banco Itaú"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5">Prioridade de Exibição</label>
                        <input 
                          type="number" 
                          required
                          value={formData.priority}
                          onChange={(e) => setFormData({...formData, priority: e.target.value})}
                          className="w-full py-3.5 px-5 bg-slate-50 dark:bg-white/5 rounded-2xl border-none shadow-inner text-xs font-semibold placeholder-slate-400 focus:ring-2 ring-blue-500/20 text-slate-800 dark:text-white transition-all outline-none"
                          placeholder="Ex: 1"
                        />
                      </div>
                      
                      {/* Toggle Premium para status ativo */}
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-inner">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">⚡</span>
                            <div>
                              <span className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Ativo para Simulações</span>
                              <span className="block text-[9px] text-slate-400 font-bold uppercase mt-0.5">Disponibilizar banco no simulador</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, active: !formData.active})}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              formData.active ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                formData.active ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-inner">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">⚖️</span>
                            <div>
                              <span className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Base de Cálculo de Margem</span>
                              <span className="block text-[9px] text-slate-400 font-bold uppercase mt-0.5">Prioridade para coeficiente diário</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, is_margin_base: !formData.is_margin_base})}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              formData.is_margin_base ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                formData.is_margin_base ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {formData.is_margin_base && (
                          <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-inner mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5">
                              Ordem de Preferência (Margem)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={formData.margin_base_priority || ""}
                              onChange={(e) => setFormData({...formData, margin_base_priority: parseInt(e.target.value) || 0})}
                              placeholder="Ex: 1 (1ª Prioridade), 2 (2ª Prioridade)..."
                              className="w-full py-3 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Logo Dropzone */}
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Identidade Visual (Logo)</label>
                        <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col items-center justify-center text-center transition-all hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/20 group h-[220px]">
                          <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleLogoUpload} accept="image/*" />
                          {formData.logo_url ? (
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-24 h-24 rounded-2xl overflow-hidden border border-slate-100 dark:border-white/10 bg-white shadow-xl flex items-center justify-center relative group-hover:scale-105 transition-all duration-300">
                                <img 
                                  src={getStaticUrl(formData.logo_url) || formData.logo_url} 
                                  className={`w-full h-full object-cover transition-all duration-500 ${
                                    formData.active ? "grayscale-0" : "grayscale opacity-50 contrast-75"
                                  }`} 
                                />
                              </div>
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest flex items-center gap-1.5 mt-1">
                                📁 Alterar Logotipo
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-md flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-blue-500 transition-colors">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                              </div>
                              <div>
                                <span className="block text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Fazer Upload de Logo</span>
                                <span className="block text-[9px] text-slate-400 dark:text-slate-500 mt-1 italic uppercase tracking-wider">PNG, JPG (Máx 200x200px)</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Seletor do convênio */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-white/5 space-y-4 shadow-inner">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Selecione o Convênio para configurar a Regra</label>
                        {bankRules.length === 0 ? (
                          <div className="text-xs font-semibold text-slate-400 italic py-2">
                            Nenhuma regra cadastrada para este banco.
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {bankRules.map((rule, idx) => {
                              const isActive = selectedAgreement === rule.agreement && (selectedSubAgreement || "") === (rule.sub_agreement || "");
                              const label = `${rule.agreement}${rule.sub_agreement ? ` - ${rule.sub_agreement}` : ""}`;
                              return (
                                <div
                                  key={idx}
                                  onClick={() => handleAgreementChange(rule.agreement, rule.sub_agreement || "")}
                                  className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer flex items-center gap-2 select-none hover:-translate-y-0.5 active:scale-98 duration-200 ${
                                    isActive
                                      ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20"
                                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700/80"
                                  }`}
                                >
                                  <span>
                                    {rule.agreement === "FORÇAS ARMADAS" ? `FORÇAS ARMADAS${rule.sub_agreement ? ` - ${rule.sub_agreement}` : " (GERAL)"}` : label}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteRule(rule);
                                    }}
                                    className={`p-1 rounded-md transition-all hover:bg-rose-500/20 hover:text-rose-400 ${
                                      isActive ? "text-white/70 hover:text-white" : "text-slate-400 dark:text-slate-500 hover:text-rose-600"
                                    }`}
                                    title="Excluir Convênio"
                                  >
                                    <Icons.Trash size={12} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {selectedAgreement && (
                        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200/50 dark:border-white/5">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-slate-700 dark:text-white uppercase tracking-tight">Ativar Simulação para este Convênio:</span>
                            <button
                              type="button"
                              onClick={() => updateRuleField("active", !formData.rules.active)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                formData.rules.active !== false ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  formData.rules.active !== false ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              const rule = bankRules.find(r => r.agreement === selectedAgreement && (r.sub_agreement || "") === selectedSubAgreement);
                              if (rule) handleDeleteRule(rule);
                            }}
                            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white dark:bg-rose-500/10 dark:hover:bg-rose-600 rounded-xl border border-rose-100 dark:border-transparent transition-all flex items-center justify-center gap-1.5 font-black text-[9px] uppercase tracking-widest"
                          >
                            <Icons.Trash size={12} />
                            Remover Convênio
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Formulário de Nova Regra */}
                    <div className="relative">
                      {!showAddRuleForm ? (
                        <button
                          type="button"
                          onClick={() => setShowAddRuleForm(true)}
                          className="w-full py-3 bg-white dark:bg-slate-900 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 text-blue-600 dark:text-blue-400 rounded-2xl border border-dashed border-blue-200 dark:border-blue-500/20 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Icons.Plus size={14} /> Adicionar Regra para outro Convênio
                        </button>
                      ) : (
                        <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-white/5">
                            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Nova Regra de Convênio</span>
                            <button
                              type="button"
                              onClick={() => setShowAddRuleForm(false)}
                              className="text-slate-400 hover:text-slate-600 text-[9px] font-black uppercase tracking-widest"
                            >
                              Cancelar
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-widest">Tipo de Convênio</label>
                              <select
                                value={newAgreement}
                                onChange={(e) => {
                                  setNewAgreement(e.target.value);
                                  setNewSubAgreement("");
                                }}
                                className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all uppercase"
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
                                <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-widest">Estado (UF)</label>
                                <select
                                  value={newSubAgreement}
                                  onChange={(e) => setNewSubAgreement(e.target.value)}
                                  className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                                <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-widest">Organização</label>
                                <select
                                  value={newSubAgreement}
                                  onChange={(e) => setNewSubAgreement(e.target.value)}
                                  className="w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-emerald-500/20"
                          >
                            Adicionar Convênio
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Detalhes da Regra Ativa */}
                    {selectedAgreement ? (
                      <div className="space-y-6 mt-4">
                        {/* Bloco de Idades e Taxas */}
                        <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5 space-y-4">
                          <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-2">
                            📊 Idades e Taxas
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Idade Mínima</label>
                              <input 
                                type="number" 
                                value={formData.rules.min_age}
                                onChange={(e) => updateRuleField("min_age", parseInt(e.target.value) || 0)}
                                className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold placeholder-slate-400 focus:ring-2 ring-blue-500/20 text-slate-800 dark:text-white transition-all outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Idade Máxima</label>
                              <input 
                                type="number" 
                                value={formData.rules.max_age}
                                onChange={(e) => updateRuleField("max_age", parseInt(e.target.value) || 0)}
                                className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold placeholder-slate-400 focus:ring-2 ring-blue-500/20 text-slate-800 dark:text-white transition-all outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Taxa Portabilidade (%)</label>
                              <input 
                                type="number" 
                                step="0.01"
                                value={formData.rules.portability_rate_threshold}
                                onChange={(e) => updateRuleField("portability_rate_threshold", e.target.value)}
                                className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold placeholder-slate-400 focus:ring-2 ring-blue-500/20 text-slate-800 dark:text-white transition-all outline-none"
                                placeholder="Ex: 1.50"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Taxa Refin (%)</label>
                              <input 
                                type="number" 
                                step="0.01"
                                value={formData.rules.refin_portability_rate_threshold}
                                onChange={(e) => updateRuleField("refin_portability_rate_threshold", e.target.value)}
                                className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold placeholder-slate-400 focus:ring-2 ring-blue-500/20 text-slate-800 dark:text-white transition-all outline-none"
                                placeholder="Ex: 1.60"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Bloco de Limites Financeiros */}
                        <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5 space-y-4">
                          <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-2">
                            💰 Limites Financeiros
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Parcela Mín.</label>
                              <input 
                                type="number" 
                                value={formData.rules.min_installment_value}
                                onChange={(e) => updateRuleField("min_installment_value", e.target.value)}
                                className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold placeholder-slate-400 focus:ring-2 ring-blue-500/20 text-slate-800 dark:text-white transition-all outline-none"
                                placeholder="R$ 50,00"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Saldo Devedor Mín.</label>
                              <input 
                                type="number" 
                                value={formData.rules.min_debt_balance}
                                onChange={(e) => updateRuleField("min_debt_balance", e.target.value)}
                                className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold placeholder-slate-400 focus:ring-2 ring-blue-500/20 text-slate-800 dark:text-white transition-all outline-none"
                                placeholder="R$ 1000,00"
                              />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                              <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Parc. Pagas Mín.</label>
                              <input 
                                type="number" 
                                value={formData.rules.min_paid_installments}
                                onChange={(e) => updateRuleField("min_paid_installments", parseInt(e.target.value) || 0)}
                                className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold placeholder-slate-400 focus:ring-2 ring-blue-500/20 text-slate-800 dark:text-white transition-all outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Bloco de Políticas de Aceitação */}
                        <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5 space-y-4">
                          <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-2">
                            🛡️ Políticas de Aceitação
                          </h4>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Aceita Analfabeto</span>
                              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                                <button 
                                  type="button"
                                  onClick={() => updateRuleField("accepts_illiterate", true)}
                                  className={`px-3.5 py-1.5 text-[10px] font-black rounded-lg transition-all ${formData.rules.accepts_illiterate ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"}`}
                                >
                                  SIM
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => updateRuleField("accepts_illiterate", false)}
                                  className={`px-3.5 py-1.5 text-[10px] font-black rounded-lg transition-all ${!formData.rules.accepts_illiterate ? "bg-rose-500 text-white shadow-md shadow-rose-500/20" : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"}`}
                                >
                                  NÃO
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Aceita Idade 60+</span>
                              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                                <button 
                                  type="button"
                                  onClick={() => updateRuleField("accepts_60_plus", true)}
                                  className={`px-3.5 py-1.5 text-[10px] font-black rounded-lg transition-all ${formData.rules.accepts_60_plus ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"}`}
                                >
                                  SIM
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => updateRuleField("accepts_60_plus", false)}
                                  className={`px-3.5 py-1.5 text-[10px] font-black rounded-lg transition-all ${!formData.rules.accepts_60_plus ? "bg-rose-500 text-white shadow-md shadow-rose-500/20" : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"}`}
                                >
                                  NÃO
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Saldo Devedor + Valor Liberado</span>
                              <button 
                                type="button"
                                onClick={() => updateRuleField("use_balance_plus_released", !formData.rules.use_balance_plus_released)}
                                className={`px-4 py-2 text-[10px] font-black rounded-xl border transition-all ${
                                  formData.rules.use_balance_plus_released 
                                    ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20" 
                                    : "bg-slate-50 dark:bg-slate-850 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                                }`}
                              >
                                {formData.rules.use_balance_plus_released ? "ATIVADO" : "DESATIVADO"}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Bloco de Restrições Específicas */}
                        <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5 space-y-5">
                          <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            🚫 Restrições Operacionais
                          </h4>
                          
                          {formData.rules.agreement === "INSS" && (
                            <div className="p-5 bg-orange-50/50 dark:bg-orange-500/5 rounded-2xl border border-orange-100 dark:border-orange-500/10">
                              <label className="block text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2.5">Espécies de Benefício Bloqueadas (NÃO Atendidas)</label>
                              <div className="flex gap-2 mb-3">
                                <input 
                                  type="text" 
                                  list="inssSpecies"
                                  value={benefitTypeInput}
                                  onChange={(e) => setBenefitTypeInput(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExcludedBenefitType())}
                                  className="flex-1 py-2.5 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold placeholder-slate-400 focus:ring-2 ring-orange-500/20 text-slate-800 dark:text-white transition-all outline-none"
                                  placeholder="Ex: 04, 32, 92..."
                                />
                                <datalist id="inssSpecies">
                                  {["04", "05", "06", "32", "33", "34", "92", "87", "88", "42", "21"].map(s => (
                                    <option key={s} value={s} />
                                  ))}
                                </datalist>
                                <button type="button" onClick={addExcludedBenefitType} className="px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold flex items-center justify-center transition-all hover:scale-105 active:scale-95">+</button>
                              </div>
                              <div className="flex flex-wrap gap-1.5 py-1.5 items-center">
                                {(formData.rules.excluded_benefit_types || "").split(',').filter(Boolean).map(species => (
                                  <span key={species} className="px-3 py-1.5 bg-orange-600/90 text-white text-[9px] font-black rounded-lg flex items-center gap-2 shadow-sm animate-fade-in group whitespace-nowrap">
                                    ESPÉCIE {species.trim().toUpperCase()}
                                    <button type="button" onClick={() => removeExcludedBenefitType(species)} className="hover:scale-125 transition-all opacity-60 group-hover:opacity-100 font-black text-sm">×</button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="p-5 bg-red-50/50 dark:bg-red-500/5 rounded-2xl border border-red-100 dark:border-red-500/10">
                            <label className="block text-[9px] font-black text-red-600 dark:text-red-400 uppercase tracking-wider mb-2.5">Bancos de Origem Bloqueados (NÃO Portados)</label>
                            <div className="flex gap-2 mb-3">
                              <input 
                                type="text" 
                                list="commonBanks"
                                value={excludedInput}
                                onChange={(e) => setExcludedInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExcludedBank())}
                                className="flex-1 py-2.5 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold placeholder-slate-400 focus:ring-2 ring-red-500/20 text-slate-800 dark:text-white transition-all outline-none"
                                placeholder="Escolha ou digite o banco..."
                              />
                              <button type="button" onClick={addExcludedBank} className="px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold flex items-center justify-center transition-all hover:scale-105 active:scale-95">+</button>
                            </div>
                            <div className="flex flex-wrap gap-1.5 py-1.5 items-center">
                              {(formData.rules.excluded_origin_banks || "").split(',').filter(Boolean).map(bank => (
                                <span key={bank} className="px-3 py-1.5 bg-red-600/90 text-white text-[9px] font-black rounded-lg flex items-center gap-2 shadow-sm animate-fade-in group whitespace-nowrap">
                                  {bank.trim().toUpperCase()}
                                  <button type="button" onClick={() => removeExcludedBank(bank)} className="hover:scale-125 transition-all opacity-60 group-hover:opacity-100 font-black text-sm">×</button>
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="p-5 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/10">
                            <label className="block text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2.5">Regra Específica: Parcelas Pagas por Banco de Origem</label>
                            <div className="flex gap-3 mb-3 items-end">
                              <div className="flex-1">
                                <label className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-widest">Banco</label>
                                <input 
                                  type="text" 
                                  list="commonBanks"
                                  value={bankCarInput}
                                  onChange={(e) => setBankCarInput(e.target.value)}
                                  className="w-full py-2 px-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:ring-2 ring-emerald-500/20 text-slate-800 dark:text-white transition-all outline-none"
                                  placeholder="Ex: C6..."
                                />
                                <datalist id="commonBanks">
                                  {["AGIBANK", "BMG", "BRADESCO", "CAIXA", "ITAU", "PAN", "SAFRA", "SANTANDER", "DAYCOVAL", "C6", "PICPAY", "INBURSA", "MERCANTIL"].map(b => (
                                    <option key={b} value={b} />
                                  ))}
                                </datalist>
                              </div>
                              <div className="w-28">
                                <label className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-widest">Parcelas Mín.</label>
                                <input 
                                  type="number" 
                                  value={parcCarInput}
                                  onChange={(e) => setParcCarInput(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBankCarença())}
                                  className="w-full py-2 px-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:ring-2 ring-emerald-500/20 text-slate-800 dark:text-white transition-all outline-none"
                                  placeholder="Mín: 12"
                                />
                              </div>
                              <button type="button" onClick={addBankCarença} className="px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center justify-center transition-all h-[36px] hover:scale-105 active:scale-95">+</button>
                            </div>
                            <div className="flex flex-wrap gap-1.5 py-1.5 items-center">
                              {Object.entries(safeParse(formData.rules.origin_banks_min_paid, {})).map(([bank, parc]) => (
                                <span key={bank} className="px-3 py-1.5 bg-emerald-600/90 text-white text-[9px] font-black rounded-lg flex items-center gap-2 shadow-sm animate-fade-in group whitespace-nowrap">
                                  {bank}: {parc as string} PARC.
                                  <button type="button" onClick={() => removeBankCarença(bank)} className="hover:scale-125 transition-all opacity-60 group-hover:opacity-100 font-black text-sm">×</button>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Bloco de Regras de Invalidez */}
                        <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5 space-y-4">
                          <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            ♿ Regras de Invalidez (Espécies 04, 32, 92)
                          </h4>
                          
                          <div className="flex items-center justify-between p-4 bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/10">
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-400">Aceita Beneficiários por Invalidez?</span>
                            <button 
                              type="button"
                              onClick={() => updateRuleField("accepts_disability", !formData.rules.accepts_disability)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-205 ease-in-out focus:outline-none ${
                                formData.rules.accepts_disability 
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20" 
                                  : "bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  formData.rules.accepts_disability ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>

                          {formData.rules.accepts_disability && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 pt-2">
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Idade Mínima</label>
                                  <input 
                                    type="number" 
                                    value={formData.rules.disability_min_age}
                                    onChange={(e) => updateRuleField("disability_min_age", e.target.value)}
                                    className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold placeholder-slate-400 focus:ring-2 ring-blue-500/20 text-slate-800 dark:text-white transition-all outline-none"
                                    placeholder="Mínima"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Idade Máxima</label>
                                  <input 
                                    type="number" 
                                    value={formData.rules.disability_max_age}
                                    onChange={(e) => updateRuleField("disability_max_age", e.target.value)}
                                    className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold placeholder-slate-400 focus:ring-2 ring-blue-500/20 text-slate-800 dark:text-white transition-all outline-none"
                                    placeholder="Máxima"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Isenção DIB a partir</label>
                                  <input 
                                    type="number" 
                                    value={formData.rules.disability_grace_age}
                                    onChange={(e) => updateRuleField("disability_grace_age", e.target.value)}
                                    className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold placeholder-slate-400 focus:ring-2 ring-blue-500/20 text-slate-800 dark:text-white transition-all outline-none"
                                    placeholder="Ex: 60"
                                  />
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Tempo Benefício (Anos)</label>
                                  <input 
                                    type="number" 
                                    value={formData.rules.disability_min_benefit_years}
                                    onChange={(e) => updateRuleField("disability_min_benefit_years", e.target.value)}
                                    className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold placeholder-slate-400 focus:ring-2 ring-blue-500/20 text-slate-800 dark:text-white transition-all outline-none"
                                    placeholder="Anos"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5">Tempo Benefício (Meses)</label>
                                  <input 
                                    type="number" 
                                    value={formData.rules.disability_min_benefit_months}
                                    onChange={(e) => updateRuleField("disability_min_benefit_months", e.target.value)}
                                    className="w-full py-2.5 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold placeholder-slate-400 focus:ring-2 ring-blue-500/20 text-slate-800 dark:text-white transition-all outline-none"
                                    placeholder="Meses"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center bg-slate-50 dark:bg-slate-800/20 rounded-3xl border border-dashed border-slate-250 dark:border-slate-800 mt-4">
                        <span className="text-3xl block mb-2">⚖️</span>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Escolha ou Adicione um Convênio acima para configurar suas regras.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Botões do Rodapé */}
              <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-900 p-8 rounded-b-[2.5rem] mt-auto shrink-0">
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-3 px-5 text-sm font-black text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Icons.X size={14} />
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-5 text-sm font-black text-white bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 rounded-2xl transition-all shadow-xl shadow-blue-500/20 disabled:shadow-none flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  <Icons.Check size={14} />
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
