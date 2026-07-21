"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { api } from "@/utils/api";
import { Icons } from "@/components/Icons";
import { useToast } from "@/components/ToastProvider";

export default function MarginCoefficientsPage() {
  const { toast } = useToast();
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedConvenio, setSelectedConvenio] = useState<"INSS" | "SIAPE">("INSS");
  const [selectedBank, setSelectedBank] = useState<number | "">("");
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  const [coefficients, setCoefficients] = useState<Record<string, number>>({});

  useEffect(() => {
    loadBanks();
  }, []);

  useEffect(() => {
    if (selectedBank && selectedYear && selectedMonth) {
      loadCoefficients();
    } else {
      setCoefficients({});
    }
  }, [selectedConvenio, selectedBank, selectedYear, selectedMonth]);

  const loadBanks = async () => {
    try {
      setLoading(true);
      const data = await api.get("/admin/banks");
      const activeBanks = data.filter((b: any) => b.active);
      setBanks(activeBanks);
      const baseBanks = activeBanks
        .filter((b: any) => b.is_margin_base)
        .sort((a: any, b: any) => (a.margin_base_priority || 0) - (b.margin_base_priority || 0));
      if (baseBanks.length > 0) {
        setSelectedBank(baseBanks[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadCoefficients = async () => {
    try {
      setLoading(true);
      const data = await api.get(
        `/admin/margin-coefficients?year=${selectedYear}&month=${selectedMonth}&convenio=${selectedConvenio}`
      );
      const bankData = data.filter(
        (d: any) =>
          d.bank_id === Number(selectedBank) &&
          String(d.convenio || "INSS").toUpperCase() === selectedConvenio
      );
      
      const newCoefs: Record<string, number> = {};
      bankData.forEach((d: any) => {
        const cleanDate = d.date ? d.date.split("T")[0] : d.date;
        newCoefs[cleanDate] = d.coefficient;
      });
      setCoefficients(newCoefs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleCoefficientChange = (day: number, value: string) => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setCoefficients((prev) => ({
      ...prev,
      [dateStr]: parseFloat(value) || 0,
    }));
  };

  const handleSave = async () => {
    if (!selectedBank) return;
    setSaving(true);
    try {
      const payload = Object.entries(coefficients).map(([date, coef]) => ({
        bank_id: Number(selectedBank),
        convenio: selectedConvenio,
        date,
        coefficient: coef
      }));
      await api.post("/admin/margin-coefficients", payload);
      toast.success("Coeficientes salvos com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar coeficientes.");
    } finally {
      setSaving(false);
    }
  };

  const fillEmptyDays = () => {
    let lastKnown = 0;
    const newCoefs = { ...coefficients };
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayOfWeek = new Date(selectedYear, selectedMonth - 1, day).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      if (isWeekend) {
        continue;
      }
      if (newCoefs[dateStr]) {
        lastKnown = newCoefs[dateStr];
      } else if (lastKnown > 0) {
        newCoefs[dateStr] = lastKnown;
      }
    }
    setCoefficients(newCoefs);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      <PageHeader
        title="Coeficientes de"
        highlight="Margem Livre"
        subtitle="Gerencie separadamente os coeficientes diários dos convênios INSS e SIAPE"
      />

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-white/10 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Convênio</label>
              <select value={selectedConvenio} onChange={(e) => setSelectedConvenio(e.target.value as "INSS" | "SIAPE")} className="w-full py-3.5 px-5 bg-slate-50 dark:bg-white/5 rounded-2xl border-none shadow-inner text-xs font-semibold text-slate-800 dark:text-white outline-none">
                <option value="INSS">INSS</option>
                <option value="SIAPE">SIAPE</option>
              </select>
            </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Banco Prioritário</label>
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(Number(e.target.value))}
              className="w-full py-3.5 px-5 bg-slate-50 dark:bg-white/5 rounded-2xl border-none shadow-inner text-xs font-semibold text-slate-800 dark:text-white outline-none"
            >
              <option value="">Selecione um banco</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.is_margin_base ? "⭐ " : ""}{b.name} {b.is_margin_base ? `(Prioridade: ${b.margin_base_priority || 0})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Mês</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full py-3.5 px-5 bg-slate-50 dark:bg-white/5 rounded-2xl border-none shadow-inner text-xs font-semibold text-slate-800 dark:text-white outline-none"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Ano</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full py-3.5 px-5 bg-slate-50 dark:bg-white/5 rounded-2xl border-none shadow-inner text-xs font-semibold text-slate-800 dark:text-white outline-none"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Badges de Bancos Preferenciais */}
        {(() => {
          const baseBanks = banks
            .filter(b => b.is_margin_base)
            .sort((a, b) => (a.margin_base_priority || 0) - (b.margin_base_priority || 0));
          if (baseBanks.length === 0) return null;
          return (
            <div className="flex flex-wrap gap-2.5 mb-8 p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 items-center animate-in fade-in duration-500">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1">
                ⭐ Bancos Preferenciais (Ordem):
              </span>
              {baseBanks.map((b, idx) => (
                <span key={b.id} className="py-1.5 px-4 bg-blue-100/50 hover:bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 shadow-sm flex items-center gap-1">
                  ⭐ {idx + 1}º - {b.name} (Prioridade: {b.margin_base_priority || 0})
                </span>
              ))}
            </div>
          );
        })()}

        {selectedBank ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-blue-50/50 dark:bg-blue-500/5 p-5 rounded-[2rem] border border-blue-100 dark:border-blue-500/10">
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Calendário de Coeficientes — {selectedConvenio}</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Preencha o coeficiente para os dias úteis. Finais de semana herdam o coeficiente dos dias anteriores.</p>
              </div>
              <button 
                onClick={fillEmptyDays}
                className="py-2.5 px-5 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
              >
                🪄 Repetir Coeficiente p/ Dias Vazios
              </button>
            </div>

            {loading ? (
              <div className="py-20 text-center">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
                {daysArray.map((day) => {
                  const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isToday = new Date().toISOString().split("T")[0] === dateStr;
                  const value = coefficients[dateStr] !== undefined ? coefficients[dateStr] : "";
                  const dateObj = new Date(selectedYear, selectedMonth - 1, day);
                  const dayOfWeek = dateObj.getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const dayName = dateObj.toLocaleString('pt-BR', { weekday: 'short' });
                  
                  return (
                    <div key={day} className={`p-4 rounded-3xl border transition-all ${
                      isWeekend 
                        ? 'border-slate-100 dark:border-white/5 bg-slate-100/30 dark:bg-slate-800/10 opacity-60' 
                        : isToday 
                          ? 'border-blue-500 bg-blue-50/30 shadow-lg shadow-blue-500/10' 
                          : 'border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/50'
                    } flex flex-col items-center gap-3`}>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isWeekend ? 'text-slate-400' : isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                        Dia {day} <span className="text-[8px] font-bold opacity-80">({dayName})</span>
                      </span>
                      <input 
                        type="number"
                        step="0.000001"
                        value={isWeekend ? "" : value}
                        onChange={(e) => handleCoefficientChange(day, e.target.value)}
                        placeholder={isWeekend ? "FDS" : "0.000000"}
                        disabled={isWeekend}
                        className={`w-full text-center py-2 bg-white dark:bg-slate-900 rounded-xl border ${
                          isWeekend 
                            ? 'border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed bg-slate-50 dark:bg-slate-950' 
                            : isToday 
                              ? 'border-blue-200 focus:ring-2 ring-blue-500/20' 
                              : 'border-slate-200 dark:border-slate-700 focus:ring-2 ring-blue-500/20'
                        } text-xs font-semibold outline-none`}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-white/10">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="py-4 px-10 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/30 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[3rem]">
            <span className="text-4xl block mb-4">🏦</span>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecione um banco para gerenciar os coeficientes</p>
          </div>
        )}
      </div>
    </div>
  );
}
