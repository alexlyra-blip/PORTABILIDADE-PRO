"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function ResultadosPage() {
  const [loading, setLoading] = useState(true);
  
  // Mock results that would normally come from the FastAPI backend
  const resultados = [
    { banco: "Banco Inbursa", taxa: 1.65, parcela_nova: 400.00, economia_mensal: 50.00, valor_troco: 2500.00, score: 98 },
    { banco: "Banco Pan", taxa: 1.70, parcela_nova: 410.00, economia_mensal: 40.00, valor_troco: 2100.00, score: 85 },
    { banco: "Banco Daycoval", taxa: 1.72, parcela_nova: 415.00, economia_mensal: 35.00, valor_troco: 1800.00, score: 79 },
    { banco: "Banco C6", taxa: 1.75, parcela_nova: 420.00, economia_mensal: 30.00, valor_troco: 1200.00, score: 65 }
  ];

  useEffect(() => {
    // Simulate API fetch delay
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Resultados da Portabilidade</h1>
          <p className="text-slate-400">Aqui estão as melhores oportunidades calculadas pelo nosso motor.</p>
        </div>
        <Link href="/simulador" className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium">
          ← Nova Simulação
        </Link>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-blue-400 font-medium animate-pulse">Calculando RPM de 18 bancos...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass-card p-4 flex items-center justify-between border-emerald-500/30 bg-emerald-500/5 animate-fade-in">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">✨</span>
              <div>
                <h3 className="text-emerald-400 font-bold">4 Bancos Aprovados</h3>
                <p className="text-sm text-slate-300">A melhor oferta gera R$ 2.500,00 de troco para o cliente.</p>
              </div>
            </div>
            <button className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              Gerar Proposta PDF
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            {resultados.map((res, i) => (
              <div key={i} className={`glass-panel p-6 relative overflow-hidden transition-all duration-300 animate-slide-up hover:border-blue-500/50 ${i === 0 ? 'border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/20' : ''}`} style={{ animationDelay: `${i * 0.1}s` }}>
                
                {i === 0 && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg shadow-lg">
                    Recomendado 🔥
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center text-xl shadow-inner">
                    🏦
                  </div>
                  <div className="text-right">
                    <h3 className="text-xl font-bold text-white">{res.banco}</h3>
                    <p className="text-emerald-400 font-medium text-sm">Score API: {res.score}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-[#0f172a]/50 p-3 rounded-lg border border-white/5">
                    <p className="text-xs text-slate-400 mb-1">Taxa Juros</p>
                    <p className="text-lg font-bold text-blue-400">{res.taxa}% a.m.</p>
                  </div>
                  <div className="bg-[#0f172a]/50 p-3 rounded-lg border border-white/5">
                    <p className="text-xs text-slate-400 mb-1">Nova Parcela</p>
                    <p className="text-lg font-bold text-white">R$ {res.parcela_nova.toFixed(2)}</p>
                  </div>
                  <div className="bg-[#0f172a]/50 p-3 rounded-lg border border-white/5 col-span-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[30px] -z-10"></div>
                    <p className="text-xs text-slate-400 mb-1">Valor do Troco (Liberado)</p>
                    <p className="text-2xl font-bold text-emerald-400 relative z-10">R$ {res.valor_troco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
                
                <button className={`w-full py-3 rounded-lg font-medium transition-all ${
                  i === 0 ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}>
                  Avançar Digitação
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
