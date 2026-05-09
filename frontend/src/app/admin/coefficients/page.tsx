"use client";

import { useEffect, useState } from "react";
import { api } from "@/utils/api";

export default function CoefficientsPage() {
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [coefficients, setCoefficients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoeff, setEditingCoeff] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<any>({
    bank_id: "",
    table_id: "",
    term: 84,
    interest_rate: 0,
    coefficient: ""
  });

  useEffect(() => {
    loadBanks();
  }, []);

  useEffect(() => {
    if (selectedBankId) {
      loadTables(selectedBankId);
    } else {
      setTables([]);
      setSelectedTableId("");
    }
  }, [selectedBankId]);

  useEffect(() => {
    if (selectedTableId) {
      loadCoefficients(selectedTableId);
    } else {
      setCoefficients([]);
    }
  }, [selectedTableId]);

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
      const data = await api.get(`/admin/banks/${bankId}/tables`);
      setTables(data);
      if (data.length > 0) {
          setSelectedTableId(data[0].id.toString());
      } else {
          setSelectedTableId("");
      }
    } catch (error) {
      console.error("Erro ao carregar tabelas:", error);
    }
  };

  const loadCoefficients = async (tableId) => {
    try {
      setLoading(true);
      const data = await api.get(`/admin/bank-tables/${tableId}/coefficients`);
      setCoefficients(data);
    } catch (error) {
      console.error("Erro ao carregar coeficientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (coeff: any = null) => {
    if (coeff) {
      setEditingCoeff(coeff);
      setFormData({
        bank_id: coeff.bank_id.toString(),
        table_id: coeff.table_id.toString(),
        term: coeff.term,
        interest_rate: coeff.interest_rate,
        coefficient: coeff.coefficient.toString()
      });
    } else {
      setEditingCoeff(null);
      setFormData({
        bank_id: selectedBankId,
        table_id: selectedTableId,
        term: 84,
        interest_rate: 0,
        coefficient: ""
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingCoeff(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { 
        ...formData, 
        bank_id: parseInt(formData.bank_id),
        table_id: parseInt(formData.table_id),
        term: parseInt(formData.term),
        interest_rate: parseFloat(formData.interest_rate),
        coefficient: formData.coefficient
      };

      if (editingCoeff) {
        await api.patch(`/admin/coefficients/${editingCoeff.id}`, payload);
      } else {
        await api.post("/admin/coefficients", payload);
      }
      handleCloseModal();
      loadCoefficients(selectedTableId);
    } catch (error) {
      console.error("Erro ao salvar coeficiente:", error);
      alert("Erro ao salvar coeficiente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Certeza que deseja excluir este coeficiente?")) return;
    try {
      await api.delete(`/admin/coefficients/${id}`);
      loadCoefficients(selectedTableId);
    } catch (error) {
      console.error("Erro ao excluir coeficiente:", error);
      alert("Erro ao excluir coeficiente.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Coeficientes</h1>
          <p className="text-slate-500 text-sm mt-1">Valores numéricos fundamentais para o cálculo de prestação e troco.</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="flex gap-2 w-full md:w-auto">
            <select 
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="input-admin !py-3 !px-6 !bg-white dark:!bg-slate-900 !rounded-2xl border-none shadow-xl text-xs font-black uppercase tracking-widest md:w-48 focus:ring-2 ring-blue-500/20"
            >
                <option value="">Banco</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>

            <select 
                value={selectedTableId}
                disabled={!selectedBankId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="input-admin !py-3 !px-6 !bg-white dark:!bg-slate-900 !rounded-2xl border-none shadow-xl text-xs font-black uppercase tracking-widest md:w-48 focus:ring-2 ring-blue-500/20"
            >
                <option value="">Tabela</option>
                {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <button 
            disabled={!selectedTableId}
            onClick={() => handleOpenModal()}
            className="relative overflow-hidden bg-blue-600 hover:bg-blue-500 text-white font-black py-3 px-8 rounded-2xl transition-all shadow-2xl shadow-blue-500/40 hover:-translate-y-1 active:scale-95 text-[10px] uppercase tracking-widest flex items-center gap-3 group disabled:opacity-50 disabled:translate-y-0"
          >
            <span className="text-base group-hover:rotate-90 transition-transform duration-300">🔢</span> 
            Novo Coeficiente
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest animate-pulse">Sincronizando Coeficientes...</p>
          </div>
        ) : !selectedTableId ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/5 shadow-2xl">
             <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Selecione uma tabela para visualizar os coeficientes.</p>
          </div>
        ) : coefficients.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/5 shadow-2xl">
             <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Nenhum coeficiente cadastrado para esta tabela.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-white/10 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
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
                      <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none flex items-center gap-2">
                        {banks.find(b => b.id.toString() === selectedBankId)?.name} • {tables.find(t => t.id?.toString() === selectedTableId)?.name}
                      </h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 italic">
                        Convênio: {tables.find(t => t.id?.toString() === selectedTableId)?.agreement}
                      </p>
                   </div>
                </div>
                
                <button 
                  onClick={() => handleOpenModal()}
                  className="py-2.5 px-6 bg-white dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-600 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10 transition-all shadow-lg flex items-center gap-2"
                >
                  <span>＋</span> Novo Coeficiente
                </button>
             </div>

             <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {coefficients.sort((a, b) => b.term - a.term).map(coeff => (
                   <div key={coeff.id} className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-blue-500/50 transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-12 h-12 bg-blue-600/5 rounded-full -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-700"></div>
                      
                      <div className="flex justify-between items-start mb-3 relative z-10">
                         <span className="text-blue-600 dark:text-blue-400 font-black text-base">{coeff.term}x</span>
                         <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{coeff.interest_rate}% AM</span>
                      </div>

                      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-white/5 shadow-inner mb-4 relative z-10">
                         <p className="text-[8px] text-slate-400 font-black uppercase mb-1">Coeficiente</p>
                         <p className="text-sm font-mono font-black text-slate-800 dark:text-white tracking-tighter">{coeff.coefficient}</p>
                      </div>

                      <div className="flex gap-2 relative z-10">
                         <button onClick={() => handleOpenModal(coeff)} className="flex-1 py-2 bg-white dark:bg-white/5 hover:bg-blue-600 hover:text-white text-slate-500 rounded-xl text-[9px] font-black uppercase transition-all border border-slate-200 dark:border-white/5">Editar</button>
                         <button onClick={() => handleDelete(coeff.id)} className="w-10 h-10 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/20 flex items-center justify-center">🗑️</button>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up border border-white/20">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingCoeff ? "Editar Coeficiente" : "Novo Coeficiente"}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 text-2xl font-light">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Prazo (Meses) *</label>
                  <input 
                    type="number" 
                    required
                    value={formData.term}
                    onChange={(e) => setFormData({...formData, term: parseInt(e.target.value)})}
                    className="input-admin"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Taxa Am (%) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={formData.interest_rate}
                    onChange={(e) => setFormData({...formData, interest_rate: parseFloat(e.target.value)})}
                    className="input-admin"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Valor do Coeficiente (Decimal) *</label>
                <input 
                  type="text" 
                  required
                  value={formData.coefficient}
                  onChange={(e) => setFormData({...formData, coefficient: e.target.value})}
                  className="input-admin !font-mono"
                  placeholder="Ex: 0.02456"
                />
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-100 mt-2">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50">
                  {isSubmitting ? "Salvando..." : editingCoeff ? "Salvar Alterações" : "Criar Coeficiente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
