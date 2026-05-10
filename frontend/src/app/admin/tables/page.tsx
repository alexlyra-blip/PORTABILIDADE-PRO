"use client";

import { useEffect, useState } from "react";
import { api } from "@/utils/api";

export default function TablesPage() {
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<any>({
    bank_id: "",
    name: "",
    active: true,
    agreement: "INSS",
    sub_agreement: "",
    taxa_convenio: 0,
    portability_adjustment: 0,
    refin_adjustment: 0,
    min_paid_installments: 0,
    min_ticket: 0,
    min_rate: 0,
    min_port_rate: 0,
    min_installment: 0,
    max_installment: 0,
    min_age: 0,
    max_age: 0,
    term: 84
  });

  const [previewBaseRate, setPreviewBaseRate] = useState<number>(1.25);

  useEffect(() => {
    loadBanks();
    // Synchronize with last simulation rate from CRM
    const lastRate = localStorage.getItem("last_simulation_rate");
    if (lastRate) setPreviewBaseRate(parseFloat(lastRate));
  }, []);

  useEffect(() => {
    if (selectedBankId) {
      loadTables(selectedBankId);
    } else {
      setTables([]);
    }
  }, [selectedBankId]);

  const loadBanks = async () => {
    try {
      const data = await api.get("/admin/banks");
      setBanks(data);
      if (data.length > 0) setSelectedBankId(data[0].id.toString());
    } catch (error) {
      console.error("Erro ao carregar bancos:", error);
    }
  };

  const loadTables = async (bankId) => {
    try {
      setLoading(true);
      const data = await api.get(`/admin/banks/${bankId}/tables`);
      setTables(data);
    } catch (error) {
      console.error("Erro ao carregar tabelas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (table: any = null) => {
    if (table) {
      setEditingTable(table);
      setFormData({
        bank_id: table.bank_id.toString(),
        name: table.name,
        active: table.active,
        agreement: table.agreement || "INSS",
        sub_agreement: table.sub_agreement || "",
        taxa_convenio: table.taxa_convenio || 0,
        portability_adjustment: table.portability_adjustment || 0,
        refin_adjustment: table.refin_adjustment || 0,
        min_paid_installments: table.min_paid_installments || 0,
        min_ticket: table.min_ticket || 0,
        min_rate: table.min_rate || 0,
        min_port_rate: table.min_port_rate || 0,
        min_installment: table.min_installment || 0,
        max_installment: table.max_installment || 0,
        min_age: table.min_age || 0,
        max_age: table.max_age || 0,
        term: table.term || 84
      });
    } else {
      setEditingTable(null);
      setFormData({
        bank_id: selectedBankId,
        name: "",
        active: true,
        agreement: "INSS",
        sub_agreement: "",
        taxa_convenio: 0,
        portability_adjustment: 0,
        refin_adjustment: 0,
        min_paid_installments: 0,
        min_ticket: 0,
        min_rate: 0,
        min_port_rate: 0,
        min_installment: 0,
        max_installment: 0,
        min_age: 0,
        max_age: 0,
        term: 84
      });
    }
    
    // Refresh rate from simulation
    const lastRate = localStorage.getItem("last_simulation_rate");
    if (lastRate) setPreviewBaseRate(parseFloat(lastRate));

    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingTable(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { 
        name: formData.name,
        active: formData.active,
        agreement: formData.agreement,
        sub_agreement: formData.sub_agreement || "",
        bank_id: parseInt(formData.bank_id),
        taxa_convenio: parseFloat(formData.taxa_convenio) || 0,
        portability_adjustment: parseFloat(formData.portability_adjustment) || 0,
        refin_adjustment: parseFloat(formData.refin_adjustment) || 0,
        min_paid_installments: parseInt(formData.min_paid_installments) || 0,
        min_ticket: parseFloat(formData.min_ticket) || 0,
        min_rate: parseFloat(formData.min_rate) || 0,
        min_port_rate: parseFloat(formData.min_port_rate) || 0,
        min_installment: parseFloat(formData.min_installment) || 0,
        max_installment: parseFloat(formData.max_installment) || 0,
        min_age: parseInt(formData.min_age) || 0,
        max_age: parseInt(formData.max_age) || 0,
        term: parseInt(formData.term) || 0
      };

      if (editingTable) {
        await api.patch(`/admin/bank-tables/${editingTable.id}`, payload);
      } else {
        await api.post("/admin/bank-tables", payload);
      }
      handleCloseModal();
      loadTables(selectedBankId);
    } catch (error) {
      console.error("Erro ao salvar tabela:", error);
      alert("Erro ao salvar tabela.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Certeza que deseja excluir esta tabela?")) return;
    try {
      await api.delete(`/admin/bank-tables/${id}`);
      loadTables(selectedBankId);
    } catch (error) {
      console.error("Erro ao excluir tabela:", error);
      alert("Erro ao excluir tabela.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tabelas de Comissão</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie as tabelas de taxas e prazos disponíveis para cada banco.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={selectedBankId}
            onChange={(e) => setSelectedBankId(e.target.value)}
            className="input-admin !py-3 !px-6 !bg-white dark:!bg-slate-900 !rounded-2xl border-none shadow-xl text-xs font-black uppercase tracking-widest md:w-64 focus:ring-2 ring-blue-500/20"
          >
            <option value="">Selecione o Banco</option>
            {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <button 
            disabled={!selectedBankId}
            onClick={() => handleOpenModal()}
            className="relative overflow-hidden bg-blue-600 hover:bg-blue-500 text-white font-black py-3 px-8 rounded-2xl transition-all shadow-2xl shadow-blue-500/40 hover:-translate-y-1 active:scale-95 text-[10px] uppercase tracking-widest flex items-center gap-3 group disabled:opacity-50 disabled:translate-y-0"
          >
            <span className="text-base group-hover:rotate-90 transition-transform duration-300">📋</span> 
            Nova Tabela
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </button>
        </div>
      </div>

      {/* Grouped Tables by Bank */}
      <div className="space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest animate-pulse">Organizando Tabelas...</p>
          </div>
        ) : !selectedBankId ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/5 shadow-2xl">
             <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Escolha um banco acima para gerenciar as tabelas.</p>
          </div>
        ) : tables.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/5 shadow-2xl">
             <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Nenhuma tabela ativa para este banco.</p>
          </div>
        ) : (
          /* Agrupar por Convênio para visual Premium */
          ["INSS", "SIAPE", "FORÇAS ARMADAS", "GOVERNOS", "CLT_PRIVADO"].map(agr => {
            const agrTables = tables.filter(t => (t.agreement === agr || (agr === "FORÇAS ARMADAS" && t.agreement === "FORCAS") || (agr === "GOVERNOS" && t.agreement === "GOV_EST")));
            if (agrTables.length === 0) return null;
            const bank = banks.find(b => b.id.toString() === selectedBankId);

            return (
              <div key={agr} className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-white/10 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
                <div className="px-8 py-6 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 p-0 shadow-xl border border-slate-100 dark:border-white/5 flex items-center justify-center overflow-hidden">
                      {(() => {
                        const bank = banks.find(b => b.id.toString() === selectedBankId);
                        return bank?.logo_url ? (
                          <img src={bank.logo_url} className="w-full h-full object-cover" alt={bank.name} />
                        ) : (
                          <span className="text-xl font-black text-blue-600">{bank?.name?.charAt(0) || "B"}</span>
                        );
                      })()}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                        {bank?.name} • {agr}
                      </h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gestão de Tabelas de Comissão</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleOpenModal()}
                    className="py-2.5 px-6 bg-white dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-600 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10 transition-all shadow-lg flex items-center gap-2"
                  >
                    <span>＋</span> Adicionar Tabela {agr}
                  </button>
                </div>
                
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {agrTables.map(table => (
                    <div key={table.id} className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-blue-500/50 transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="min-w-0">
                          <h4 className="font-black text-slate-800 dark:text-white text-sm truncate uppercase tracking-tight">{table.name}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {table.sub_agreement && (
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[8px] font-black rounded-md uppercase tracking-wider">
                                {table.sub_agreement}
                              </span>
                            )}
                            <span className="text-blue-600 dark:text-blue-400 font-black text-xs">{table.term || 84}x</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">• {Number(table.taxa_convenio || 0).toFixed(2)}% AM</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${table.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'}`}>
                          {table.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-white dark:bg-slate-800 p-2 rounded-xl text-center border border-slate-100 dark:border-white/5 shadow-sm">
                          <p className="text-[8px] text-slate-400 font-black uppercase mb-0.5">Ajuste Port</p>
                          <p className={`text-[10px] font-black ${table.portability_adjustment >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {table.portability_adjustment >= 0 ? '+' : ''}{table.portability_adjustment}%
                          </p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-2 rounded-xl text-center border border-slate-100 dark:border-white/5 shadow-sm">
                          <p className="text-[8px] text-slate-400 font-black uppercase mb-0.5">Ajuste Refin</p>
                          <p className={`text-[10px] font-black ${table.refin_adjustment >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {table.refin_adjustment >= 0 ? '+' : ''}{table.refin_adjustment}%
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4 border-t border-slate-200/50 dark:border-white/5">
                        <button onClick={() => handleOpenModal(table)} className="flex-1 py-2 bg-white dark:bg-white/5 hover:bg-blue-600 hover:text-white text-slate-500 rounded-xl text-[9px] font-black uppercase transition-all border border-slate-200 dark:border-white/5">Editar</button>
                        <button onClick={() => handleDelete(table.id)} className="w-10 h-10 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/20 flex items-center justify-center">🗑️</button>
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
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up border border-white/20 flex flex-col max-h-[95vh]">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingTable ? "Editar Tabela" : "Nova Tabela"}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 text-2xl font-light">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <input 
                  type="text" 
                  autoFocus
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input-admin !py-2.5"
                  placeholder="Ex: Tabela Flex 1.0"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Convênio</label>
                  <select 
                    value={formData.agreement}
                    onChange={(e) => setFormData({...formData, agreement: e.target.value, sub_agreement: ""})}
                    className="input-admin !py-2"
                  >
                    <option value="INSS">INSS</option>
                    <option value="SIAPE">SIAPE</option>
                    <option value="GOVERNOS">GOVERNOS</option>
                    <option value="FORÇAS ARMADAS">FORÇAS ARMADAS</option>
                    <option value="CLT_PRIVADO">CLT PRIVADO</option>
                  </select>
                </div>
                {formData.agreement === "FORÇAS ARMADAS" && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Força (Opcional)</label>
                    <select value={formData.sub_agreement || ""} onChange={(e) => setFormData({...formData, sub_agreement: e.target.value})} className="input-admin !py-2">
                      <option value="">Todas</option>
                      <option value="EXÉRCITO">EXÉRCITO</option>
                      <option value="AERONÁUTICA">AERONÁUTICA</option>
                      <option value="MARINHA">MARINHA</option>
                    </select>
                  </div>
                )}
                {formData.agreement === "GOVERNOS" && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Estado (Opcional)</label>
                    <select value={formData.sub_agreement || ""} onChange={(e) => setFormData({...formData, sub_agreement: e.target.value})} className="input-admin !py-2">
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
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Taxa Convênio (%)</label>
                  <input 
                    type="number" step="0.01"
                    value={formData.taxa_convenio}
                    onChange={(e) => setFormData({...formData, taxa_convenio: parseFloat(e.target.value)})}
                    className="input-admin !py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Ajuste Port. (+/-)</label>
                  <input 
                    type="number" step="0.01"
                    value={formData.portability_adjustment}
                    onChange={(e) => setFormData({...formData, portability_adjustment: parseFloat(e.target.value)})}
                    className="input-admin !py-2 border-blue-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Ajuste Refin (+/-)</label>
                  <input 
                    type="number" step="0.01"
                    value={formData.refin_adjustment}
                    onChange={(e) => setFormData({...formData, refin_adjustment: parseFloat(e.target.value)})}
                    className="input-admin !py-2 border-blue-200"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Mín. Parc. Pagas</label>
                    <input 
                      type="number"
                      value={formData.min_paid_installments}
                      onChange={(e) => setFormData({...formData, min_paid_installments: parseInt(e.target.value)})}
                      className="input-admin !py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Ticket Mín. (R$)</label>
                    <input 
                      type="number"
                      value={formData.min_ticket}
                      onChange={(e) => setFormData({...formData, min_ticket: parseFloat(e.target.value)})}
                      className="input-admin !py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Prazo (Meses)</label>
                    <input 
                      type="number"
                      value={formData.term}
                      onChange={(e) => setFormData({...formData, term: parseInt(e.target.value) || 0})}
                      className="input-admin !py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Status Ativa</label>
                    <div className="flex items-center gap-2 h-8">
                       <input 
                        type="checkbox" 
                        checked={formData.active}
                        onChange={(e) => setFormData({...formData, active: e.target.checked})}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-[10px] font-bold text-slate-500">Ativa?</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-3 border-t border-slate-100 pt-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Parc Mín (R$)</label>
                    <input type="number" step="0.01" value={formData.min_installment} onChange={(e) => setFormData({...formData, min_installment: parseFloat(e.target.value) || 0})} className="input-admin !py-1.5" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Parc Máx (R$)</label>
                    <input type="number" step="0.01" value={formData.max_installment} onChange={(e) => setFormData({...formData, max_installment: parseFloat(e.target.value) || 0})} className="input-admin !py-1.5" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Idade Mín</label>
                    <input type="number" value={formData.min_age} onChange={(e) => setFormData({...formData, min_age: parseInt(e.target.value) || 0})} className="input-admin !py-1.5" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Idade Máx</label>
                    <input type="number" value={formData.max_age} onChange={(e) => setFormData({...formData, max_age: parseInt(e.target.value) || 0})} className="input-admin !py-1.5" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-blue-600 uppercase mb-1">Taxa Mínima Port (%)</label>
                    <input 
                      type="number" step="0.01"
                      value={formData.min_port_rate}
                      onChange={(e) => setFormData({...formData, min_port_rate: parseFloat(e.target.value)})}
                      className="input-admin !py-1.5 border-blue-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-emerald-600 uppercase mb-1">Taxa Mínima Refin (%)</label>
                    <input 
                      type="number" step="0.01"
                      value={formData.min_rate}
                      onChange={(e) => setFormData({...formData, min_rate: parseFloat(e.target.value)})}
                      className="input-admin !py-1.5 border-emerald-200"
                    />
                  </div>
                </div>
              </div>

              {/* SIMULADOR DE PREVISIBILIDADE */}
              <div className="mt-6 pt-4 border-t border-slate-200">
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">🔬 Preview de Cálculo (Como o Motor vai ler)</h4>
                
                <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-4">
                     <span className="text-[10px] uppercase font-bold text-slate-400">Taxa Portabilidade HP-12C (Cliente)</span>
                     <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-blue-100 shadow-sm">
                        <input 
                           type="number" step="0.01" 
                           value={previewBaseRate} 
                           onChange={e => setPreviewBaseRate(parseFloat(e.target.value) || 0)}
                           className="w-16 bg-transparent border-none text-blue-600 font-black text-right outline-none text-xs p-0"
                        />
                        <span className="text-xs font-black text-blue-300">%</span>
                     </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center text-[10px] font-bold uppercase tracking-tight">
                     <div className="bg-white p-3 rounded-xl border border-blue-50 shadow-sm">
                        <span className="text-slate-400 block mb-1">Portabilidade</span>
                        <div className="flex flex-col">
                           <span className="text-[8px] text-blue-300 font-bold">
                              {(previewBaseRate || 0).toFixed(2)}% {formData.portability_adjustment >= 0 ? "+" : ""} {(formData.portability_adjustment || 0).toFixed(2)}%
                           </span>
                           <span className="text-blue-600 font-black">
                              {((previewBaseRate || 0) + (formData.portability_adjustment || 0)).toFixed(2)}%
                           </span>
                        </div>
                     </div>
                     <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-sm">
                        <span className="text-slate-400 block mb-1">Taxa Tabela</span>
                        <span className="text-blue-600 font-black">
                           {(formData.taxa_convenio || 0).toFixed(2)}%
                        </span>
                     </div>
                      <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-200">
                         <span className="text-emerald-600 block mb-1">Final (Refin)</span>
                         <div className="flex flex-col">
                            <span className="text-[8px] text-emerald-400 font-bold">
                               (({(previewBaseRate || 0).toFixed(2)} + {((previewBaseRate || 0) + (formData.portability_adjustment || 0)).toFixed(2)}) / 2) + {(formData.refin_adjustment || 0).toFixed(2)}
                            </span>
                            <span className="text-emerald-600 text-sm font-black">
                               {((((previewBaseRate || 0) + ((previewBaseRate || 0) + (formData.portability_adjustment || 0))) / 2) + (formData.refin_adjustment || 0)).toFixed(2)}%
                            </span>
                         </div>
                      </div>
                  </div>

                  <div className={`p-3 rounded-xl text-center text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${
                     (() => {
                        const portFinal = ((previewBaseRate || 0) + (formData.portability_adjustment || 0));
                        const refinFinal = (((previewBaseRate || 0) + portFinal) / 2) + (formData.refin_adjustment || 0);
                        const isPortOk = portFinal >= (formData.min_port_rate || 0);
                        const isRefinOk = refinFinal >= (formData.min_rate || 0);
                        const isAboveTable = refinFinal >= (formData.taxa_convenio || 0);

                        return (isPortOk && isRefinOk && isAboveTable)
                           ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20" 
                           : "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20";
                     })()
                  }`}>
                     Status da Tabela: {
                     (() => {
                        const portFinal = ((previewBaseRate || 0) + (formData.portability_adjustment || 0));
                        const refinFinal = (((previewBaseRate || 0) + portFinal) / 2) + (formData.refin_adjustment || 0);
                        const isPortOk = portFinal >= (formData.min_port_rate || 0);
                        const isRefinOk = refinFinal >= (formData.min_rate || 0);
                        const isAboveTable = refinFinal >= (formData.taxa_convenio || 0);

                        if (!isPortOk) return "🔴 BLOQUEADA (TAXA PORT. < MÍNIMA)";
                        if (!isRefinOk) return "🔴 BLOQUEADA (TAXA REFIN < MÍNIMA)";
                        if (!isAboveTable) return "🔴 BLOQUEADA (REFIN < TAXA TABELA)";
                        return "🟢 DISPONÍVEL P/ TROCO";
                     })()
                     }
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 py-2 mt-4">
                <input 
                  type="checkbox" 
                  id="tab_act"
                  checked={formData.active}
                  onChange={(e) => setFormData({...formData, active: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="tab_act" className="text-sm font-semibold text-slate-600 cursor-pointer select-none">
                  Tabela Ativa para Simulações
                </label>
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50">
                  {isSubmitting ? "Salvando..." : editingTable ? "Salvar Alterações" : "Criar Tabela"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
