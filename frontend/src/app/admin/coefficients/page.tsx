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
                className="input-admin !py-2 !px-4 !bg-white md:w-48 text-sm"
            >
                <option value="">Banco</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>

            <select 
                value={selectedTableId}
                disabled={!selectedBankId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="input-admin !py-2 !px-4 !bg-white md:w-48 text-sm"
            >
                <option value="">Tabela</option>
                {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <button 
            disabled={!selectedTableId}
            onClick={() => handleOpenModal()}
            className="btn-premium flex items-center justify-center gap-2 !py-2.5 !px-5 !rounded-xl !bg-blue-600 hover:!bg-purple-500 text-sm disabled:opacity-50 w-full md:w-auto"
          >
            <span className="text-lg">🔢</span> Novo Coeficiente
          </button>
        </div>
      </div>

      <div className="admin-card overflow-hidden shadow-sm border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Banco</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Tabela</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Convênio</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Prazo</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Taxa de Juros (%)</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Valor do Coeficiente</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">Carregando coeficientes...</td></tr>
            ) : !selectedTableId ? (
              <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">Selecione um banco e uma tabela.</td></tr>
            ) : coefficients.length === 0 ? (
              <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">Nenhum coeficiente cadastrado para esta tabela.</td></tr>
            ) : (
              coefficients.map((coeff) => {
                const bank = banks.find(b => b.id.toString() === selectedBankId);
                return (
                  <tr key={coeff.id} className="hover:bg-blue-50/10 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {bank?.logo_url ? (
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-100 bg-white shadow-sm flex-shrink-0">
                            <img src={bank.logo_url} className="w-full h-full object-contain p-1" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase">
                            {bank?.name?.substring(0, 2) || "BK"}
                          </div>
                        )}
                        <span className="font-bold text-slate-900 text-sm">{bank?.name || "-"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-700">{tables.find(t => t.id?.toString() === selectedTableId)?.name || '-'}</span>
                    </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold tracking-tight uppercase bg-blue-50 text-blue-600 border border-blue-100">
                      {tables.find(t => t.id?.toString() === selectedTableId)?.agreement || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-bold text-slate-700">{coeff.term} meses</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-semibold text-slate-600">{coeff.interest_rate}%</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-mono text-sm text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-lg">
                      {coeff.coefficient}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleOpenModal(coeff)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-purple-50 rounded-lg transition-all">✏️</button>
                      <button onClick={() => handleDelete(coeff.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">🗑️</button>
                    </div>
                  </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
