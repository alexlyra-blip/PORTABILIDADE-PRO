"use client";

import { useEffect, useState } from "react";
import { api } from "@/utils/api";

export default function RulesPage() {
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
    disability_min_benefit_years: 0,
    disability_min_benefit_months: 0,
    min_paid_installments: 0,
    excluded_origin_banks: "",
    origin_banks_min_paid: "",
    accepts_60_plus: true,
    accepts_illiterate: true,
    accepts_disability: true,
    accepts_loas: true,
    min_installment_value: 0,
    min_debt_balance: 0,
    portability_rate_threshold: 0,
    use_balance_plus_released: false,
    sub_agreement: ""
  });

  useEffect(() => {
    loadBanks();
  }, []);

  useEffect(() => {
    if (selectedBankId) {
      loadRules(selectedBankId);
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
        disability_min_benefit_years: rule.disability_min_benefit_years || 0,
        disability_min_benefit_months: rule.disability_min_benefit_months || 0,
        min_paid_installments: rule.min_paid_installments || 0,
        excluded_origin_banks: rule.excluded_origin_banks || "",
        origin_banks_min_paid: rule.origin_banks_min_paid || "",
        accepts_60_plus: rule.accepts_60_plus ?? true,
        accepts_illiterate: rule.accepts_illiterate ?? true,
        accepts_disability: rule.accepts_disability ?? true,
        accepts_loas: rule.accepts_loas ?? true,
        min_installment_value: rule.min_installment_value || 0,
        min_debt_balance: rule.min_debt_balance || 0,
        portability_rate_threshold: rule.portability_rate_threshold || 0,
        use_balance_plus_released: rule.use_balance_plus_released || false,
        sub_agreement: rule.sub_agreement || ""
      });
    } else {
      setEditingRule(null);
      setFormData({
        bank_id: selectedBankId,
        agreement: "INSS",
        min_age: 18,
        max_age: 80,
        max_term: 84,
        min_release_amount: 0,
        allowed_benefit_types: "",
        literacy_required: false,
        accepts_disability: false,
        disability_min_age: 0,
        disability_min_benefit_years: 0,
        disability_min_benefit_months: 0,
        min_paid_installments: 0,
        excluded_origin_banks: "",
        origin_banks_min_paid: "",
        accepts_60_plus: true,
        accepts_illiterate: true,
        accepts_disability: true,
        accepts_loas: true,
        min_installment_value: 0,
        min_debt_balance: 0,
        portability_rate_threshold: 0,
        use_balance_plus_released: false,
        sub_agreement: ""
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
    } catch (error) {
      console.error("Erro ao salvar regra:", error);
      alert("Erro ao salvar regra.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Certeza que deseja excluir esta regra?")) return;
    try {
      await api.delete(`/admin/bank-rules/${id}`);
      loadRules(selectedBankId);
    } catch (error) {
      console.error("Erro ao excluir regra:", error);
      alert("Erro ao excluir regra.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Regras de Aceitação</h1>
          <p className="text-slate-500 text-sm mt-1">Configure as restrições por idade, convênio e espécie para cada banco.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={selectedBankId}
            onChange={(e) => setSelectedBankId(e.target.value)}
            className="input-admin !py-2 !px-4 !bg-white md:w-64"
          >
            <option value="">Selecione um Banco</option>
            {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <button 
            disabled={!selectedBankId}
            onClick={() => handleOpenModal()}
            className="btn-premium flex items-center gap-2 !py-2.5 !px-5 !rounded-xl !bg-blue-600 hover:!bg-blue-500 text-sm disabled:opacity-50"
          >
            <span className="text-lg">⚖️</span> Nova Regra
          </button>
        </div>
      </div>

      <div className="admin-card overflow-hidden shadow-sm border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Convênio</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Idade (Min-Max)</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Espécies Permitidas</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">Carregando regras...</td></tr>
            ) : !selectedBankId ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">Selecione um banco para ver as regras.</td></tr>
            ) : rules.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">Nenhuma regra cadastrada para este banco.</td></tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-blue-50/20 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md text-xs">{rule.agreement}</span>
                    {rule.sub_agreement && (
                      <span className="ml-2 font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-md text-xs">{rule.sub_agreement}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-medium text-slate-600">{rule.min_age} - {rule.max_age} anos</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        {rule.allowed_benefit_types || "Todas"}
                      </span>
                      <div className="flex gap-1 flex-wrap justify-center">
                        {!rule.accepts_disability && (
                          <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-black">🚫 NO INV</span>
                        )}
                        {!rule.accepts_loas && (
                          <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-black">🚫 NO LOAS</span>
                        )}
                        {rule.accepts_disability && (
                           <span className="text-[9px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-black">♿ INV OK</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleOpenModal(rule)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">✏️</button>
                      <button onClick={() => handleDelete(rule.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
                 <div className="flex items-center gap-3 border-l pl-4 border-slate-100">
                    <input type="checkbox" id="inv_cfg" checked={formData.accepts_disability} onChange={(e) => setFormData({...formData, accepts_disability: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-blue-600 cursor-pointer" />
                    <label htmlFor="inv_cfg" className="text-sm font-bold text-blue-600 cursor-pointer select-none">Configurar carência para Invalidez?</label>
                 </div>
              </div>

              {/* Seção 3: Regras para Invalidez */}
              {formData.accepts_disability && (
                <div className="p-4 bg-red-50/30 rounded-2xl border border-red-100 space-y-4 animate-slide-up">
                  <h4 className="text-xs font-black text-red-800 uppercase tracking-widest">III. Trava de Concessão (Invalidez)</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] font-black text-red-700 uppercase mb-1">Idade Min</label>
                      <input type="number" value={formData.disability_min_age} onChange={(e) => setFormData({...formData, disability_min_age: e.target.value})} className="input-admin !border-red-200 focus:!border-red-400" />
                    </div>
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
