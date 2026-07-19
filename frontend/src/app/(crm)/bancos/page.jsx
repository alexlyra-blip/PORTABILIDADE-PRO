"use client";

import React, { useEffect, useState, useRef, cloneElement, isValidElement } from "react";
import PageHeader from "@/components/PageHeader";
import { api, getStaticUrl } from "@/utils/api";
import { inssBanks } from "@/utils/constants";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

import { Icons } from "@/components/Icons";


async function toDataURL(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Error converting image to base64:", e);
    return null;
  }
}

const matchAgreement = (ruleAgr, selectedAgr) => {
  if (!ruleAgr || !selectedAgr) return false;
  const r = ruleAgr.toUpperCase().replace(/\s/g, '_');
  const s = selectedAgr.toUpperCase().replace(/\s/g, '_');
  if (r === s) return true;
  if (s === "FORCAS" && (r === "FORCAS" || r === "FORCAS_ARMADAS" || r === "FORÇAS_ARMADAS" || r === "FORÇAS" || r === "FORÇASARMADAS")) return true;
  if (s === "GOV_EST" && (r === "GOV_EST" || r === "GOVERNOS" || r === "GOVERNO")) return true;
  if (s === "CLT_PRIVADO" && (r === "CLT_PRIVADO" || r === "CLT" || r === "CLT_PRIVADO" || r === "CLT PRIVADO")) return true;
  // Also vice-versa in case selected is display and rule is DB:
  if (r === "FORCAS" && (s === "FORCAS" || s === "FORCAS_ARMADAS" || s === "FORÇAS_ARMADAS" || s === "FORÇAS" || s === "FORÇASARMADAS")) return true;
  if (r === "GOV_EST" && (s === "GOV_EST" || s === "GOVERNOS" || s === "GOVERNO")) return true;
  if (r === "CLT_PRIVADO" && (s === "CLT_PRIVADO" || s === "CLT" || s === "CLT_PRIVADO" || s === "CLT PRIVADO")) return true;
  return false;
};

const getConvenioDisplayName = (convenio) => {
  const mapping = {
    "INSS": "INSS",
    "SIAPE": "SIAPE",
    "FORCAS": "FORÇAS ARMADAS",
    "GOV_EST": "GOVERNO",
    "CLT_PRIVADO": "CLT PRIVADO",
    "FGTS": "FGTS"
  };
  return mapping[convenio] || convenio;
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
  const [logoBase64, setLogoBase64] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [promotoraRules, setPromotoraRules] = useState([]);
  const [downloadState, setDownloadState] = useState("idle");
  const pdfRef = useRef();

  useEffect(() => {
    setMounted(true);
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      loadPromotoraRules(parsedUser);
      const logoUrl = getStaticUrl(parsedUser.logo_url || parsedUser.avatar_url);
      if (logoUrl) {
        toDataURL(logoUrl).then(base64 => {
          if (base64) setLogoBase64(base64);
        });
      }
    }
    
    loadBanks();
  }, []);

  const loadPromotoraRules = async (currentUser) => {
    try {
      const uId = (currentUser.role === 'admin' || currentUser.role === 'promotora') ? currentUser.id : (currentUser.broker_id || currentUser.id);
      if (uId) {
        const rules = await api.get(`/admin/users/${uId}/rules`);
        setPromotoraRules(rules || []);
      }
    } catch (error) {
      console.error("Erro ao carregar regras da promotora:", error);
    }
  };

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

  const getRuleForSelectedConvenio = (bank) => {
    return bank.rules?.find(r => matchAgreement(r.agreement, selectedConvenio));
  };

  const filteredBanks = banks.filter(bank => {
    const matchesSearch = bank.name.toLowerCase().includes(searchTerm.toLowerCase());
    const rule = getRuleForSelectedConvenio(bank);
    return matchesSearch && rule && rule.active;
  });

  const handleBankClick = async (bank) => {
    setSelectedBank(bank);
    const rule = bank.rules?.find(r => matchAgreement(r.agreement, selectedConvenio) && r.active)
      || bank.rules?.find(r => matchAgreement(r.agreement, selectedConvenio));
    if (rule) setSelectedRuleId(rule.id);
    else setSelectedRuleId(null);
    
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
    if (selectedRuleId) {
      const rule = selectedBank.rules?.find(r => r.id === selectedRuleId);
      if (rule) return rule;
    }
    return selectedBank.rules?.find(r => matchAgreement(r.agreement, selectedConvenio)) || null;
  };

  const exportPDF = async () => {
    if (typeof window === "undefined" || !selectedBank) return;
    setDownloadState("loading");

    try {
      // Garantir compatibilidade com Next.js SSR carregando o script dinamicamente
      if (!window.html2pdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      const html2pdf = window.html2pdf;
      const rule = getSelectedRule();

      const activeAgreement = rule ? rule.agreement : selectedConvenio;
      const activeSubAgreement = rule ? rule.sub_agreement : null;
      const tablesForAgreement = bankTables.filter(t => t.active && (!t.agreement || matchAgreement(t.agreement, activeAgreement)) && (!t.sub_agreement || t.sub_agreement === activeSubAgreement));

      // Fallback rates from bankTables
      const portRates = tablesForAgreement
        .map(t => (t.min_port_rate !== null && t.min_port_rate !== undefined) ? Number(t.min_port_rate) : Number(t.min_rate))
        .filter(rate => !isNaN(rate) && rate !== null);
      const fallbackPortRate = portRates.length > 0 ? Math.min(...portRates) : null;

      const refinRates = tablesForAgreement
        .map(t => Number(t.min_rate))
        .filter(rate => !isNaN(rate) && rate !== null);
      const fallbackRefinRate = refinRates.length > 0 ? Math.min(...refinRates) : null;

      const hasPortThreshold = rule && rule.portability_rate_threshold !== null && rule.portability_rate_threshold !== undefined;
      const portRateValue = hasPortThreshold ? rule.portability_rate_threshold : fallbackPortRate;

      const hasRefinThreshold = rule && rule.refin_portability_rate_threshold !== null && rule.refin_portability_rate_threshold !== undefined;
      const refinRateValue = hasRefinThreshold ? rule.refin_portability_rate_threshold : fallbackRefinRate;

      // Calcular Prazos
      let prazosAtivos = tablesForAgreement
        .map(t => t.term)
        .filter(Boolean);
      
      prazosAtivos = [...new Set(prazosAtivos)].sort((a,b)=>a-b);
      let prazosText = "";
      if (prazosAtivos.length > 0) {
        const list = prazosAtivos.map(p => `${p}X`);
        if (list.length === 1) prazosText = list[0];
        else if (list.length === 2) prazosText = list.join(' e ');
        else prazosText = list.slice(0, -1).join(', ') + ' e ' + list[list.length - 1];
      } else {
        prazosText = rule ? `Até ${rule.max_term || 'N/A'}X` : "Não informado";
      }

      // Calcular LOAS
      let excluidos = rule?.excluded_benefit_types || "";
      if (rule && rule.accepts_loas === false) {
        excluidos = excluidos ? `${excluidos}, 87 e 88 (LOAS)` : "87 e 88 (LOAS)";
      }

      // Calcular Invalidez
      const disabilityMinAge = rule?.disability_min_age || 0;
      const disabilityMaxAge = rule?.disability_max_age || 0;
      const disabilityMinYears = rule?.disability_min_benefit_years || 0;
      const disabilityMinMonths = rule?.disability_min_benefit_months || 0;
      const disabilityAccepts = rule?.accepts_disability || false;

      const mesesInvalidezStr = disabilityMinMonths ? ` e ${disabilityMinMonths} Meses` : '';
      const invalidezTexto = disabilityAccepts 
        ? `SIM (Idade mínima ${disabilityMinAge} anos até ${disabilityMaxAge} anos, Tempo de benefício de ${disabilityMinYears} Anos${mesesInvalidezStr})` 
        : "NÃO";

      const ruleMinAge = rule ? rule.min_age : null;
      const ruleMaxAge = rule ? rule.max_age : null;

      const ticketValues = tablesForAgreement.map(t => Number(t.min_ticket)).filter(val => val > 0);
      const fallbackTicket = ticketValues.length > 0 ? Math.min(...ticketValues) : null;
      const minReleaseAmount = (rule && rule.min_release_amount !== null && rule.min_release_amount !== undefined) ? rule.min_release_amount : fallbackTicket;

      const installmentValues = tablesForAgreement.map(t => Number(t.min_installment)).filter(val => val > 0);
      const fallbackInstallment = installmentValues.length > 0 ? Math.min(...installmentValues) : null;
      const minInstallmentValue = (rule && rule.min_installment_value !== null && rule.min_installment_value !== undefined) ? rule.min_installment_value : fallbackInstallment;

      const minDebtBalance = rule ? rule.min_debt_balance : null;

      // Blocked origin banks from promoter
      const blockedOriginRuleObj = promotoraRules.find(r => r.rule_key === 'origin_bank_blocklist');
      const blockedOriginBanks = blockedOriginRuleObj ? JSON.parse(blockedOriginRuleObj.rule_value) : [];

      // Specific origin bank rules from promoter
      const originRuleObj = promotoraRules.find(r => r.rule_key === 'origin_bank_config');
      const promoterOriginRules = originRuleObj ? JSON.parse(originRuleObj.rule_value) : [];

      // Bancos com Regras Específicas
      let combinedSpecificRules = [];
      if (rule?.origin_banks_min_paid) {
        try {
          const parsed = JSON.parse(rule.origin_banks_min_paid);
          if (parsed && typeof parsed === 'object') {
            combinedSpecificRules = Object.entries(parsed).map(([bank, parcelas]) => `${bank} ${parcelas} pagas`);
          } else {
            combinedSpecificRules = rule.origin_banks_min_paid.split(/,|\n/).map(item => item.replace(/^-/, '').trim()).filter(Boolean);
          }
        } catch (e) {
          combinedSpecificRules = rule.origin_banks_min_paid.split(/,|\n/).map(item => item.replace(/^-/, '').trim()).filter(Boolean);
        }
      }
      if (promoterOriginRules.length > 0) {
        combinedSpecificRules = [
          ...combinedSpecificRules,
          ...promoterOriginRules.map(r => `${r.origin_bank} ${r.min_paid} pagas (Regra da Promotora)`)
        ];
      }

      let regrasEspecificasHtml = "";
      if (combinedSpecificRules.length > 0) {
        regrasEspecificasHtml = `
          <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #e2e8f0; page-break-inside: avoid;">
            <h4 style="font-size: 13px; font-weight: bold; color: #c2410c; text-transform: uppercase; margin: 0 0 10px 0;">Bancos com Regras Específicas</h4>
            <div style="background-color: #fff7ed; border: 1px solid #ffedd5; padding: 12px; border-radius: 8px;">
              <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #9a3412; line-height: 1.6; list-style-type: disc;">
                ${combinedSpecificRules.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          </div>
        `;
      }

      // Bancos Não Portados (Origem)
      let bancosNaoPortadosHtml = "";
      const hasExcludedBanks = rule?.excluded_origin_banks;
      const hasBlockedPromoBanks = blockedOriginBanks && blockedOriginBanks.length > 0;
      if (hasExcludedBanks || hasBlockedPromoBanks) {
        const bankBadges = [];
        if (hasExcludedBanks) {
          rule.excluded_origin_banks.split(',').forEach(b => {
            bankBadges.push(`<span style="padding: 4px 8px; background-color: #fef2f2; border: 1px solid #fee2e2; color: #991b1b; font-size: 11px; font-weight: bold; border-radius: 6px; text-transform: uppercase; margin-right: 5px; margin-bottom: 5px; display: inline-block;">${b.trim()}</span>`);
          });
        }
        if (hasBlockedPromoBanks) {
          blockedOriginBanks.forEach(b => {
            bankBadges.push(`<span style="padding: 4px 8px; background-color: #fee2e2; border: 1px solid #fecaca; color: #b91c1c; font-size: 11px; font-weight: bold; border-radius: 6px; text-transform: uppercase; margin-right: 5px; margin-bottom: 5px; display: inline-block;">${b.trim()} (PROMOTORA)</span>`);
          });
        }

        bancosNaoPortadosHtml = `
          <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #e2e8f0; page-break-inside: avoid;">
            <h4 style="font-size: 13px; font-weight: bold; color: #b91c1c; text-transform: uppercase; margin: 0 0 10px 0;">Bancos Não Portados (Origem)</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${bankBadges.join('')}
            </div>
          </div>
        `;
      }

      const element = document.createElement('div');
      element.innerHTML = `
        <div style="padding: 40px; font-family: Arial, sans-serif; color: #1e293b; max-width: 800px; margin: 0 auto; background-color: white;">
          <!-- Header -->
          <div style="display: flex; flex-direction: column; align-items: center; text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 25px;">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="height: 60px; object-fit: contain; margin-bottom: 15px;" />` : ''}
            <h1 style="font-size: 24px; font-weight: bold; color: #1e293b; margin: 0; text-transform: uppercase; letter-spacing: 1px;">
              🏛️ ${selectedBank.name}
            </h1>
            <p style="font-size: 13px; font-weight: bold; color: #64748b; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 2px;">
              Regras do Convênio: ${activeAgreement} ${rule?.sub_agreement ? '- ' + rule.sub_agreement : ''}
            </p>
          </div>

          <!-- Rules List -->
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <tbody>
              ${renderPdfRow('Idade', (ruleMinAge || ruleMaxAge) ? `De ${ruleMinAge || 'N/A'} a ${ruleMaxAge || 'N/A'} anos` : 'Não informado')}
              ${renderPdfRow('Prazos', prazosText)}
              
              ${activeAgreement === "INSS" ? renderPdfRow('Aceita Invalidez', invalidezTexto) : ''}
              ${activeAgreement === "INSS" ? renderPdfRow('Benefício não atendido', excluidos || 'Nenhum restrito') : ''}
              
              ${renderPdfRow('Aceita Analfabeto', rule ? (rule.accepts_illiterate ? 'SIM' : 'NÃO') : 'Não informado')}
              ${renderPdfRow('Aceita 60+', rule ? (rule.accepts_60_plus ? 'SIM' : 'NÃO') : 'Não informado')}
              
              ${renderPdfRow('Parcela Mínima', formatCurrency(minInstallmentValue))}
              ${renderPdfRow('Troco Mínimo', formatCurrency(minReleaseAmount))}
              ${renderPdfRow('Saldo Mínimo', formatCurrency(minDebtBalance))}
              
              ${renderPdfRow('Taxa Mínima Portabilidade', (portRateValue !== null && portRateValue !== undefined) ? `${portRateValue}%` : 'Não informado')}
              ${renderPdfRow('Taxa Mínima Refin/Port', (refinRateValue !== null && refinRateValue !== undefined) ? `${refinRateValue}%` : 'Não informado')}
            </tbody>
          </table>

          <!-- Bancos Não Portados & Regras Específicas -->
          ${bancosNaoPortadosHtml}
          ${regrasEspecificasHtml}
        </div>
      `;

      const opt = {
        margin:       10,
        filename:     `Regras_${selectedBank.name}_${activeAgreement}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(element).toPdf().get('pdf').then(async (pdf) => {
        const blob = pdf.output('blob');
        const blobURL = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = blobURL;
        a.download = opt.filename;
        a.click();
        setDownloadState("success");
        setTimeout(() => setDownloadState("idle"), 3000);
      }).catch(e => {
        console.error("Erro ao gerar PDF:", e);
        alert("Ocorreu um erro ao gerar o PDF das regras.");
        setDownloadState("idle");
      });
    } catch (e) {
      console.error("Erro geral na exportação do PDF:", e);
      alert("Ocorreu um erro ao inicializar o PDF.");
      setDownloadState("idle");
    }
  };

  const renderPdfRow = (label, value) => {
    return `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; font-size: 12px; font-weight: bold; color: #475569; text-transform: uppercase; width: 40%;">${label}</td>
        <td style="padding: 10px 0; font-size: 12px; color: #1e293b; font-weight: bold; text-align: right;">${value}</td>
      </tr>
    `;
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
            <option value="FORCAS">FORÇAS ARMADAS</option>
            <option value="GOV_EST">GOVERNO</option>
            <option value="CLT_PRIVADO">CLT PRIVADO</option>
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
          <AnimatePresence mode="popLayout">
            {filteredBanks.map(bank => {
              return (
                <motion.div
                  key={bank.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  onClick={() => handleBankClick(bank)}
                  className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-blue-200 transition-all cursor-pointer group flex flex-col items-center text-center gap-4 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden relative z-10 p-0">
                    {bank.logo_url ? (
                      <img src={getStaticUrl(bank.logo_url)} alt={bank.name} loading="eager" fetchPriority="high" className="w-full h-full object-cover" />
                    ) : (
                      <Icons.Landmark size={32} />
                    )}
                  </div>
                  
                  <div className="relative z-10 w-full">
                    <h3 className="font-black text-slate-800 text-lg truncate w-full" title={bank.name}>{bank.name}</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mt-1">
                      Ver Regras
                    </p>
                  </div>
                </motion.div>
              );
            })}
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
                          <img src={getStaticUrl(selectedBank.logo_url)} alt={selectedBank.name} loading="eager" fetchPriority="high" className="w-full h-full object-cover" />
                        ) : (
                          <Icons.Landmark size={24} />
                        )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 leading-none">{selectedBank.name}</h2>
                      <div className="flex items-center gap-2 mt-2">
                        <select 
                          value={selectedRuleId || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedRuleId(val ? Number(val) : null);
                          }}
                          className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-black uppercase tracking-widest outline-none cursor-pointer"
                        >
                          {(!selectedRuleId || !selectedBank.rules?.some(r => r.id === selectedRuleId)) && (
                            <option value="">
                              {getConvenioDisplayName(selectedConvenio)} (Inativo)
                            </option>
                          )}
                          {selectedBank.rules
                            ?.filter(r => matchAgreement(r.agreement, selectedConvenio))
                            .map(r => (
                              <option key={r.id} value={r.id}>
                                {r.sub_agreement ? r.sub_agreement : "Regra Geral"}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={exportPDF} 
                    disabled={downloadState === "loading"}
                    className={`w-10 h-10 sm:w-auto sm:px-4 rounded-xl text-white flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                      downloadState === "loading"
                        ? "bg-slate-400 shadow-slate-200 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 shadow-blue-200 hover:-translate-y-0.5"
                    }`}
                  >
                    {downloadState === "loading" ? (
                      <Icons.Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Icons.Download size={16} />
                    )}
                    <span className="hidden sm:inline text-[11px] font-black uppercase tracking-widest">
                      {downloadState === "loading" ? "Gerando..." : "Baixar PDF"}
                    </span>
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
                      <img src={logoBase64 || getStaticUrl(user.logo_url || user.avatar_url)} alt="Logo Promotora" loading="eager" fetchPriority="high" className="h-16 object-contain mb-4" crossOrigin="anonymous" />
                    )}
                    <h1 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <Icons.Landmark size={24} className="text-blue-600 inline-block align-text-bottom mr-1" /> {selectedBank.name}
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
                    const isRuleActive = rule?.active;
                    const activeAgreement = rule ? rule.agreement : selectedConvenio;
                    const activeSubAgreement = rule ? rule.sub_agreement : null;

                    // Filter tables for the current agreement & sub-agreement
                    const tablesForAgreement = bankTables.filter(t => 
                      t.active && 
                      (!t.agreement || matchAgreement(t.agreement, activeAgreement)) && 
                      (!t.sub_agreement || t.sub_agreement === activeSubAgreement)
                    );

                    // 1. Calculate prazos
                    let prazosAtivos = tablesForAgreement
                      .map(t => t.term)
                      .filter(Boolean);
                    
                    prazosAtivos = [...new Set(prazosAtivos)].sort((a, b) => a - b);
                    let prazosText = "";
                    if (prazosAtivos.length > 0) {
                      const list = prazosAtivos.map(p => `${p}X`);
                      if (list.length === 1) prazosText = list[0];
                      else if (list.length === 2) prazosText = list.join(' e ');
                      else prazosText = list.slice(0, -1).join(', ') + ' e ' + list[list.length - 1];
                    } else {
                      prazosText = rule ? `Até ${rule.max_term || 'N/A'}X` : "Não informado";
                    }

                    // 2. Calculate LOAS (INSS only)
                    let excluidos = rule?.excluded_benefit_types || "";
                    if (rule && rule.accepts_loas === false) {
                      excluidos = excluidos ? `${excluidos}, 87 e 88 (LOAS)` : "87 e 88 (LOAS)";
                    }

                    // 3. Calculate Invalidez (INSS only)
                    const disabilityAccepts = rule?.accepts_disability || false;
                    const disabilityMinAge = rule?.disability_min_age || 0;
                    const disabilityMaxAge = rule?.disability_max_age || 0;
                    const disabilityMinYears = rule?.disability_min_benefit_years || 0;
                    const disabilityMinMonths = rule?.disability_min_benefit_months || 0;
                    const mesesInvalidezStr = disabilityMinMonths ? ` e ${disabilityMinMonths} Meses` : '';
                    const invalidezTexto = disabilityAccepts 
                      ? `SIM (Idade mínima ${disabilityMinAge} anos até ${disabilityMaxAge} anos, Tempo de benefício de ${disabilityMinYears} Anos${mesesInvalidezStr})` 
                      : "NÃO";

                    // 4. Calculate Fallback Rates
                    const portRates = tablesForAgreement
                      .map(t => (t.min_port_rate !== null && t.min_port_rate !== undefined) ? Number(t.min_port_rate) : Number(t.min_rate))
                      .filter(rate => !isNaN(rate) && rate !== null);
                    const fallbackPortRate = portRates.length > 0 ? Math.min(...portRates) : null;

                    const refinRates = tablesForAgreement
                      .map(t => Number(t.min_rate))
                      .filter(rate => !isNaN(rate) && rate !== null);
                    const fallbackRefinRate = refinRates.length > 0 ? Math.min(...refinRates) : null;

                    const hasPortThreshold = rule && rule.portability_rate_threshold !== null && rule.portability_rate_threshold !== undefined;
                    const portRateValue = hasPortThreshold ? rule.portability_rate_threshold : fallbackPortRate;

                    const hasRefinThreshold = rule && rule.refin_portability_rate_threshold !== null && rule.refin_portability_rate_threshold !== undefined;
                    const refinRateValue = hasRefinThreshold ? rule.refin_portability_rate_threshold : fallbackRefinRate;

                    // 5. Calculate Fallback Ticket & Installment Limit
                    const ticketValues = tablesForAgreement.map(t => Number(t.min_ticket)).filter(val => val > 0);
                    const fallbackTicket = ticketValues.length > 0 ? Math.min(...ticketValues) : null;
                    const releaseAmount = (rule && rule.min_release_amount !== null && rule.min_release_amount !== undefined) ? rule.min_release_amount : fallbackTicket;

                    const installmentValues = tablesForAgreement.map(t => Number(t.min_installment)).filter(val => val > 0);
                    const fallbackInstallment = installmentValues.length > 0 ? Math.min(...installmentValues) : null;
                    const installmentValue = (rule && rule.min_installment_value !== null && rule.min_installment_value !== undefined) ? rule.min_installment_value : fallbackInstallment;

                    const minDebtBalance = rule ? rule.min_debt_balance : null;

                    return (
                      <div className="space-y-4">
                        {/* Warning Banner if Rule is Inactive or Missing */}
                        {!isRuleActive && (
                          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 flex items-start gap-3 mb-2">
                            <div className="text-amber-500 shrink-0 mt-0.5">
                              <Icons.AlertTriangle size={20} />
                            </div>
                            <div>
                              <h4 className="font-black text-xs uppercase tracking-wider mb-0.5">Convênio Inativo</h4>
                              <p className="text-xs font-bold opacity-90">
                                Este convênio está inativo ou não possui regras cadastradas para o convênio {getConvenioDisplayName(activeAgreement)}. 
                                As informações de taxas e prazos exibidas abaixo são baseadas nas tabelas ativas do banco.
                              </p>
                            </div>
                          </div>
                        )}

                        <RuleItem icon={<Icons.User size={18} />} label="Idade" value={(rule?.min_age || rule?.max_age) ? `De ${rule.min_age || 'N/A'} a ${rule.max_age || 'N/A'} anos` : 'Não informado'} />
                        <RuleItem icon={<Icons.Calendar size={18} />} label="Prazos" value={prazosText} />
                        
                        {activeAgreement === "INSS" && (
                          <RuleItem 
                            icon={<Icons.ShieldAlert size={18} />} 
                            label="Aceita Invalidez" 
                            value={invalidezTexto}
                            status={disabilityAccepts ? "success" : "error"}
                          />
                        )}
                        
                        {activeAgreement === "INSS" && (
                          <RuleItem 
                            icon={<Icons.Ban size={18} />} 
                            label="Benefício não atendido" 
                            value={excluidos || "Nenhum restrito"} 
                            status="warning"
                          />
                        )}
                        
                        <RuleItem icon={<Icons.PenTool size={18} />} label="Aceita Analfabeto" value={rule ? (rule.accepts_illiterate ? "SIM" : "NÃO") : "Não informado"} status={rule ? (rule.accepts_illiterate ? "success" : "error") : "info"} />
                        <RuleItem icon={<Icons.Clock size={18} />} label="Aceita 60+" value={rule ? (rule.accepts_60_plus ? "SIM" : "NÃO") : "Não informado"} status={rule ? (rule.accepts_60_plus ? "success" : "error") : "info"} />
                        
                        <RuleItem icon={<Icons.Receipt size={18} />} label="Parcela Mínima" value={formatCurrency(installmentValue)} />
                        <RuleItem icon={<Icons.Banknote size={18} />} label="Troco Mínimo" value={formatCurrency(releaseAmount)} />
                        <RuleItem icon={<Icons.Wallet size={18} />} label="Saldo Mínimo" value={formatCurrency(minDebtBalance)} />
                        
                        <RuleItem icon={<Icons.TrendingDown size={18} />} label="Taxa Mínima Portabilidade" value={(portRateValue !== null && portRateValue !== undefined) ? `${portRateValue}%` : "Não informado"} />
                        <RuleItem icon={<Icons.RefreshCw size={18} />} label="Taxa Mínima Refin/Port" value={(refinRateValue !== null && refinRateValue !== undefined) ? `${refinRateValue}%` : "Não informado"} />
                        
                        {(() => {
                          const blockedOriginRuleObj = promotoraRules.find(r => r.rule_key === 'origin_bank_blocklist');
                          const blockedOriginBanks = blockedOriginRuleObj ? JSON.parse(blockedOriginRuleObj.rule_value) : [];

                          const hasExcludedBanks = rule?.excluded_origin_banks;
                          const hasBlockedPromoBanks = blockedOriginBanks && blockedOriginBanks.length > 0;

                          if (!hasExcludedBanks && !hasBlockedPromoBanks) return null;

                          return (
                            <div className="mt-6 pt-4 border-t border-slate-100">
                              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-3">
                                <Icons.XCircle size={16} /> Bancos Não Portados (Origem)
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {rule?.excluded_origin_banks && rule.excluded_origin_banks.split(',').map(b => (
                                  <span key={b} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[11px] font-black tracking-widest uppercase border border-red-100">{b.trim()}</span>
                                ))}
                                {blockedOriginBanks.map(b => (
                                  <span key={b + '-promo'} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-[11px] font-black tracking-widest uppercase border border-red-200 shadow-sm flex items-center gap-1">
                                    {b.trim()} <span className="text-[9px] opacity-70">(PROMOTORA)</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {(() => {
                          const originRuleObj = promotoraRules.find(r => r.rule_key === 'origin_bank_config');
                          const promoterOriginRules = originRuleObj ? JSON.parse(originRuleObj.rule_value) : [];

                          let bankSpecificItems = [];
                          if (rule?.origin_banks_min_paid) {
                            try {
                              const parsed = JSON.parse(rule.origin_banks_min_paid);
                              if (parsed && typeof parsed === 'object') {
                                bankSpecificItems = Object.entries(parsed).map(([bank, parcelas]) => `${bank} ${parcelas} pagas`);
                              } else {
                                bankSpecificItems = rule.origin_banks_min_paid.split(/,|\n/).map(item => item.replace(/^-/, '').trim()).filter(Boolean);
                              }
                            } catch (e) {
                              bankSpecificItems = rule.origin_banks_min_paid.split(/,|\n/).map(item => item.replace(/^-/, '').trim()).filter(Boolean);
                            }
                          }

                          const combinedSpecificRules = [
                            ...bankSpecificItems,
                            ...promoterOriginRules.map(r => `${r.origin_bank} ${r.min_paid} pagas (Regra da Promotora)`)
                          ];

                          if (combinedSpecificRules.length === 0) return null;

                          return (
                            <div className="mt-6 pt-4 border-t border-slate-100">
                              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-3">
                                <Icons.AlertTriangle size={16} /> Bancos com Regras Específicas
                              </h4>
                              <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                                 <ul className="text-sm text-orange-800 font-bold space-y-1">
                                   {combinedSpecificRules.map((text, idx) => (
                                      <li key={idx}>- {text}</li>
                                   ))}
                                 </ul>
                              </div>
                            </div>
                          );
                        })()}
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

      <AnimatePresence>
        {downloadState === "success" && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[9999] bg-emerald-500 text-white px-6 py-3.5 rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.3)] border border-emerald-400 flex items-center gap-3 font-bold text-sm tracking-wide"
          >
            <span className="text-lg">✨</span>
            <span>PDF baixado com sucesso!</span>
          </motion.div>
        )}
      </AnimatePresence>
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

  const getIconColor = () => {
    if (status === "success") return "text-emerald-500 bg-emerald-50/50";
    if (status === "error") return "text-red-500 bg-red-50/50";
    if (status === "warning") return "text-orange-500 bg-orange-50/50";
    return "text-blue-500 bg-blue-50/50";
  };

  const getIconHexColor = () => {
    if (status === "success") return "#10b981"; // emerald-500
    if (status === "error") return "#ef4444"; // red-500
    if (status === "warning") return "#f59e0b"; // orange-500
    return "#3b82f6"; // blue-500
  };

  const clonedIcon = React.isValidElement(icon)
    ? React.cloneElement(icon, { color: getIconHexColor() })
    : icon;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-slate-50 gap-2">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getIconColor()}`}>
          {clonedIcon}
        </div>
        <span className="text-sm font-black text-slate-600 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`px-4 py-1.5 rounded-xl text-sm font-bold border ${getStatusColor()} text-left sm:text-right w-full sm:w-auto`}>
        {value}
      </div>
    </div>
  );
}
