"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, getStaticUrl } from "@/utils/api";
import { Icons } from "@/components/Icons";
import { useToast } from "@/components/ToastProvider";

const formatBankName = (codigo, banco) => {
  if (!banco) return '';
  let codeStr = codigo ? String(codigo).replace(/['"]/g, '').trim() : '';
  codeStr = codeStr.replace(/\D/g, '');
  if (codeStr) {
    codeStr = codeStr.padStart(3, '0').substring(0, 3);
    const bancoStr = String(banco).replace(/['"]/g, '').trim();
    return `${codeStr} - ${bancoStr}`;
  }
  return String(banco).replace(/['"]/g, '').trim();
};

// Premium Custom Icons
const CrownIcon = ({ className = "w-5 h-5 text-amber-500", ...props }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
    <path d="M3 20h18" />
  </svg>
);

const MapPinIcon = ({ className = "w-5 h-5 text-amber-500", ...props }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const LockPremiumIcon = ({ className = "w-5 h-5 text-red-500", ...props }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    <circle cx="12" cy="16" r="1.5" />
    <path d="M12 17.5v2" />
  </svg>
);

const UnlockPremiumIcon = ({ className = "w-5 h-5 text-emerald-500", ...props }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    <circle cx="12" cy="16" r="1.5" />
    <path d="M12 17.5v2" />
  </svg>
);

const UserIcon = ({ className = "w-4 h-4 text-blue-500", ...props }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const CpfIcon = ({ className = "w-4 h-4 text-emerald-500", ...props }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 8h10" />
    <path d="M7 12h10" />
    <path d="M7 16h6" />
  </svg>
);

const CalendarIcon = ({ className = "w-4 h-4 text-purple-500", ...props }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const PhoneIcon = ({ className = "w-4 h-4 text-teal-500", ...props }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const FiliaçãoIcon = ({ className = "w-4 h-4 text-indigo-500", ...props }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const PremiumBadge = () => (
  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-sm uppercase">
    PREMIUM
  </span>
);

export default function ConsultaCPFPage() {
  const toast = useToast();
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState(null);
  const [activeBenefitIndex, setActiveBenefitIndex] = useState(0);
  const [subLogos, setSubLogos] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [creditos, setCreditos] = useState(null);
  const [activeProvider, setActiveProvider] = useState("promosys");
  const [loadingProvider, setLoadingProvider] = useState(false);
  const [convenio, setConvenio] = useState("INSS");
  const [downloadState, setDownloadState] = useState("idle");

  const maskCPF = (val) => val.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})/, "$1-$2").replace(/(-\d{2})\d+?$/, "$1");

  useEffect(() => {
    // Carregar logos secundários do banco
    api.get("/admin/sub-logos")
      .then(res => setSubLogos(res || []))
      .catch(err => console.error("Erro ao carregar logos secundários:", err));
    // Validar se o usuário atual é Administrador e carregar limite de créditos/config
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.role === "admin") {
          setIsAdmin(true);
          
          // Carregar config do provider
          api.get("/admin/cpf-config")
            .then(async (res) => {
              if (res && res.active_provider) {
                setActiveProvider(res.active_provider);
                await fetchBalance(res.active_provider);
              }
            })
            .catch(err => console.error("Erro ao carregar configuração de provedor:", err));
        }
      } else {
        window.location.href = "/login";
      }
    } catch (e) {
      console.error("Erro ao verificar nível de acesso do usuário:", e);
    }
  }, []);

  const fetchBalance = async (provider) => {
    setLoadingProvider(true);
    try {
      if (provider === "multicorban") {
        const res = await api.get("/consultas/multicorban/saldo");
        setCreditos({
          creditos: res.creditos_online,
          creditos_offline: res.creditos_offline,
          creditos_geracao_leads: res.geracao_leads,
          isMultiCorban: true
        });
      } else {
        const res = await api.post("/consultas/promosys/creditos");
        setCreditos({
          ...res,
          isMultiCorban: false
        });
      }
    } catch (err) {
      console.error("Erro ao carregar créditos:", err);
      if (provider === "multicorban") {
        setCreditos({
          creditos: null,
          creditos_offline: null,
          creditos_geracao_leads: null,
          isMultiCorban: true
        });
      } else {
        setCreditos(null);
      }
    } finally {
      setLoadingProvider(false);
    }
  };

  const handleProviderChange = async (provider) => {
    setLoadingProvider(true);
    try {
      await api.post("/admin/cpf-config", { active_provider: provider });
      setActiveProvider(provider);
      await fetchBalance(provider);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao alterar o provedor ativo.");
    } finally {
      setLoadingProvider(false);
    }
  };

  const handleConsultar = async (e) => {
    e.preventDefault();
    if (cpf.length < 14) {
      toast.warning("Por favor, informe um CPF válido.");
      return;
    }
    setLoading(true);
    setDados(null);
    try {
      const res = await api.post('/consultas/cpf', { 
        cpf: cpf.replace(/\D/g, ''),
        convenio: activeProvider === "multicorban" ? convenio : "INSS"
      });
      if (res && (res.cliente || res.beneficio_principal || (res.beneficios && res.beneficios.length > 0))) {
        setDados(res);
        setActiveBenefitIndex(0);
        await fetchBalance(activeProvider);
        toast.success("Consulta de CPF concluída com sucesso!");
      } else {
        toast.warning("Consulta não retornou dados.");
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.message || "Erro desconhecido";
      toast.error(`Erro ao consultar CPF: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImprimir = async () => {
    setDownloadState("loading");
    try {
      // Import html2pdf dynamically from node_modules
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `extrato-${activeBenefit.cliente?.nome || 'cliente'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const printableElement = document.createElement('div');
      
      // Build a clean, styled HTML string for PDF rendering
      // We avoid complex Tailwind v4 styles, custom colors (oklch), and SVGs to prevent html2canvas crashes.
      printableElement.innerHTML = `
        <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 800px; margin: 0 auto; background-color: white; padding: 20px;">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
            <div>
              <h1 style="font-size: 20px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase;">Extrato de Consignação</h1>
              <p style="font-size: 10px; font-weight: 700; color: #2563eb; margin: 3px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Portabilidade PRO</p>
            </div>
            <div style="text-align: right;">
              <p style="font-size: 8px; font-weight: 700; color: #64748b; margin: 0; text-transform: uppercase;">Data de Emissão</p>
              <p style="font-size: 11px; font-weight: 700; color: #0f172a; margin: 2px 0 0 0;">${new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <!-- Section: Client & Benefit Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <!-- Client Box -->
            <div style="border: 1px solid #cbd5e1; border-radius: 12px; padding: 15px; background-color: #ffffff;">
              <h3 style="font-size: 12px; font-weight: 900; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin: 0 0 10px 0; text-transform: uppercase;">Dados do Cliente</h3>
              <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b; font-weight: bold; width: 35%;">Nome:</td>
                  <td style="padding: 4px 0; color: #0f172a; font-weight: 900; text-transform: uppercase;">${activeBenefit.cliente?.nome || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b; font-weight: bold;">CPF:</td>
                  <td style="padding: 4px 0; color: #0f172a; font-weight: 900;">${activeBenefit.cliente?.cpf ? maskCPF(activeBenefit.cliente.cpf) : 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Nascimento:</td>
                  <td style="padding: 4px 0; color: #0f172a; font-weight: 900;">${activeBenefit.cliente?.data_nascimento ? formatDateBR(activeBenefit.cliente.data_nascimento) : 'N/A'}${activeBenefit.cliente?.idade ? ` (${activeBenefit.cliente.idade} anos)` : ''}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Filiação:</td>
                  <td style="padding: 4px 0; color: #0f172a; font-weight: 900; text-transform: uppercase;">${activeBenefit.cliente?.filiacao || 'Não informada'}</td>
                </tr>
                ${activeBenefit.cliente?.endereco ? `
                <tr>
                  <td style="padding: 4px 0; color: #64748b; font-weight: bold; vertical-align: top;">Endereço:</td>
                  <td style="padding: 4px 0; color: #0f172a; font-weight: 700; text-transform: uppercase; line-height: 1.2;">${activeBenefit.cliente.endereco}</td>
                </tr>` : ''}
              </table>
            </div>

            <!-- Benefit Box -->
            <div style="border: 1px solid #cbd5e1; border-radius: 12px; padding: 15px; background-color: #ffffff;">
              <h3 style="font-size: 12px; font-weight: 900; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin: 0 0 10px 0; text-transform: uppercase;">Dados do Benefício</h3>
              <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b; font-weight: bold; width: 35%;">NB:</td>
                  <td style="padding: 4px 0; color: #0f172a; font-weight: 900;">${activeBenefit.cliente?.beneficio || activeBenefit.numero || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Espécie:</td>
                  <td style="padding: 4px 0; color: #0f172a; font-weight: 900; text-transform: uppercase;">${activeBenefit.cliente?.especie || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Situação:</td>
                  <td style="padding: 4px 0; color: #0f172a; font-weight: 900; text-transform: uppercase;">${activeBenefit.beneficio?.situacao || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Concessão:</td>
                  <td style="padding: 4px 0; color: #0f172a; font-weight: 900;">${activeBenefit.beneficio?.ddb ? formatDateBR(activeBenefit.beneficio.ddb) : 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b; font-weight: bold;">UF:</td>
                  <td style="padding: 4px 0; color: #0f172a; font-weight: 900; text-transform: uppercase;">${activeBenefit.beneficio?.uf || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b; font-weight: bold; vertical-align: top;">Pagamento:</td>
                  <td style="padding: 4px 0; color: #0f172a; font-weight: 700; text-transform: uppercase; line-height: 1.2;">
                    ${formatBankName(activeBenefit.banco_pagador?.codigo, activeBenefit.banco_pagador?.nome)} 
                    ${activeBenefit.banco_pagador?.agencia ? `(Ag: ${activeBenefit.banco_pagador.agencia})` : ''}
                  </td>
                </tr>
              </table>
            </div>
          </div>

          <!-- Section: Financial Summary -->
          <div style="border: 1px solid #cbd5e1; border-radius: 12px; padding: 15px; background-color: #f8fafc; margin-bottom: 25px;">
            <h3 style="font-size: 12px; font-weight: 900; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin: 0 0 12px 0; text-transform: uppercase;">Resumo Financeiro (Margens)</h3>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; text-align: center;">
              <div style="background-color: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px;">
                <p style="font-size: 8px; font-weight: 700; color: #64748b; margin: 0 0 4px 0; text-transform: uppercase;">Salário Base</p>
                <p style="font-size: 11px; font-weight: 900; color: #0f172a; margin: 0;">${formatBRL(marginInfo.salario)}</p>
              </div>
              <div style="background-color: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px;">
                <p style="font-size: 8px; font-weight: 700; color: #64748b; margin: 0 0 4px 0; text-transform: uppercase;">Consignável</p>
                <p style="font-size: 11px; font-weight: 900; color: #0f172a; margin: 0;">${formatBRL(marginInfo.margemConsignavel)}</p>
              </div>
              <div style="background-color: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px;">
                <p style="font-size: 8px; font-weight: 700; color: #64748b; margin: 0 0 4px 0; text-transform: uppercase;">Comprometido</p>
                <p style="font-size: 11px; font-weight: 900; color: #0f172a; margin: 0;">${formatBRL(marginInfo.totalComprometido)}</p>
              </div>
              <div style="background-color: ${marginInfo.margemLivreReal < 0 ? '#fef2f2' : '#f0fdf4'}; border: 1px solid ${marginInfo.margemLivreReal < 0 ? '#fee2e2' : '#bbf7d0'}; border-radius: 8px; padding: 8px;">
                <p style="font-size: 8px; font-weight: 700; color: ${marginInfo.margemLivreReal < 0 ? '#991b1b' : '#166534'}; margin: 0 0 4px 0; text-transform: uppercase;">Margem Livre</p>
                <p style="font-size: 11px; font-weight: 900; color: ${marginInfo.margemLivreReal < 0 ? '#991b1b' : '#166534'}; margin: 0;">${marginInfo.margemLivreReal < 0 ? 'R$ 0,00' : formatBRL(marginInfo.showMargem)}</p>
              </div>
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px;">
                <p style="font-size: 8px; font-weight: 700; color: #166534; margin: 0 0 4px 0; text-transform: uppercase;">Liberado Aprox.</p>
                <p style="font-size: 11px; font-weight: 900; color: #166534; margin: 0;">${formatBRL(marginInfo.valorLiberadoMargem)}</p>
              </div>
            </div>
          </div>

          <!-- Section: Active Loans -->
          <div style="margin-bottom: 25px;">
            <h3 style="font-size: 12px; font-weight: 900; color: #0f172a; border-bottom: 2px solid #ea580c; padding-bottom: 6px; margin: 0 0 10px 0; text-transform: uppercase;">Empréstimos Consignados Ativos (${activeBenefit.emprestimos?.length || 0})</h3>
            ${activeBenefit.emprestimos && activeBenefit.emprestimos.length > 0 ? `
              <table style="width: 100%; border-collapse: collapse; font-size: 9px; border: 1px solid #e2e8f0;">
                <thead>
                  <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                    <th style="padding: 8px 10px; text-align: left; font-weight: 700; color: #475569;">Banco</th>
                    <th style="padding: 8px 10px; text-align: left; font-weight: 700; color: #475569;">Contrato</th>
                    <th style="padding: 8px 10px; text-align: right; font-weight: 700; color: #475569;">Parcela</th>
                    <th style="padding: 8px 10px; text-align: right; font-weight: 700; color: #475569;">Valor Contrato</th>
                    <th style="padding: 8px 10px; text-align: right; font-weight: 700; color: #475569;">Saldo Devedor</th>
                    <th style="padding: 8px 10px; text-align: center; font-weight: 700; color: #475569;">Prazo</th>
                    <th style="padding: 8px 10px; text-align: center; font-weight: 700; color: #475569;">Taxa</th>
                  </tr>
                </thead>
                <tbody>
                  ${activeBenefit.emprestimos.map((emp, idx) => `
                    <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                      <td style="padding: 8px 10px; color: #0f172a; font-weight: 900; text-transform: uppercase;">${formatBankName(emp.codigo, emp.banco)}</td>
                      <td style="padding: 8px 10px; color: #475569; font-weight: bold;">${emp.contrato || 'N/A'}</td>
                      <td style="padding: 8px 10px; text-align: right; color: #0f172a; font-weight: 900;">${formatBRL(emp.parcela)}</td>
                      <td style="padding: 8px 10px; text-align: right; color: #0f172a; font-weight: 700;">${formatBRL(emp.valor_contrato || emp.valor_liberado || 0)}</td>
                      <td style="padding: 8px 10px; text-align: right; color: #2563eb; font-weight: 900;">${formatBRL(emp.saldo_devedor || emp.quitacao || 0)}</td>
                      <td style="padding: 8px 10px; text-align: center; color: #0f172a; font-weight: 700;">${emp.prazo_restante} de ${emp.prazo}</td>
                      <td style="padding: 8px 10px; text-align: center; color: #166534; font-weight: 900;">${Number(emp.taxa || 0).toFixed(2)}% a.m.</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div style="padding: 15px; border: 1px dashed #cbd5e1; border-radius: 8px; text-align: center; font-size: 10px; color: #64748b; font-weight: bold;">
                Nenhum empréstimo consignado ativo encontrado.
              </div>
            `}
          </div>

          <!-- Section: Active Cards -->
          <div style="margin-bottom: 20px;">
            <h3 style="font-size: 12px; font-weight: 900; color: #0f172a; border-bottom: 2px solid #db2777; padding-bottom: 6px; margin: 0 0 10px 0; text-transform: uppercase;">Cartões de Crédito Consignado (RMC / RCC) (${activeBenefit.cartoes?.length || 0})</h3>
            ${activeBenefit.cartoes && activeBenefit.cartoes.length > 0 ? `
              <table style="width: 100%; border-collapse: collapse; font-size: 9px; border: 1px solid #e2e8f0;">
                <thead>
                  <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                    <th style="padding: 8px 10px; text-align: left; font-weight: 700; color: #475569;">Banco</th>
                    <th style="padding: 8px 10px; text-align: left; font-weight: 700; color: #475569;">Tipo</th>
                    <th style="padding: 8px 10px; text-align: right; font-weight: 700; color: #475569;">Parcela Reservada</th>
                    <th style="padding: 8px 10px; text-align: right; font-weight: 700; color: #475569;">Limite Saque</th>
                    <th style="padding: 8px 10px; text-align: right; font-weight: 700; color: #475569;">Limite Utilizado</th>
                    <th style="padding: 8px 10px; text-align: right; font-weight: 700; color: #475569;">Limite Disponível</th>
                  </tr>
                </thead>
                <tbody>
                  ${activeBenefit.cartoes.map((cartao, idx) => `
                    <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                      <td style="padding: 8px 10px; color: #0f172a; font-weight: 900; text-transform: uppercase;">${formatBankName(cartao.codigo, cartao.banco)}</td>
                      <td style="padding: 8px 10px; color: #db2777; font-weight: 900; text-transform: uppercase;">${cartao.tipo || 'Cartão Consignado'}</td>
                      <td style="padding: 8px 10px; text-align: right; color: #0f172a; font-weight: 900;">${formatBRL(cartao.parcela_promosys)}</td>
                      <td style="padding: 8px 10px; text-align: right; color: #0f172a; font-weight: 700;">${formatBRL(cartao.limite_cartao)}</td>
                      <td style="padding: 8px 10px; text-align: right; color: #b91c1c; font-weight: 700;">${formatBRL(cartao.utilizado)}</td>
                      <td style="padding: 8px 10px; text-align: right; color: #166534; font-weight: 900;">${formatBRL(cartao.disponivel)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <div style="padding: 15px; border: 1px dashed #cbd5e1; border-radius: 8px; text-align: center; font-size: 10px; color: #64748b; font-weight: bold;">
                Nenhum cartão RMC ou RCC ativo encontrado.
              </div>
            `}
          </div>
        </div>
      `;

      html2pdf().from(printableElement).set(opt).toPdf().get('pdf').then(async (pdf) => {
        const blob = pdf.output('blob');
        const blobURL = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = blobURL;
        a.download = opt.filename;
        a.click();
        setDownloadState("success");
        setTimeout(() => setDownloadState("idle"), 3000);
      }).catch(err => {
        console.error("Erro interno do html2pdf:", err);
        toast.error("Não foi possível gerar o PDF de forma automatizada por incompatibilidade no seu navegador. Por favor, utilize o botão de salvar/imprimir padrão.");
        setDownloadState("idle");
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Não foi possível carregar a biblioteca de PDF. Por favor, tente novamente.");
      setDownloadState("idle");
    }
  };

  const activeBenefit = (dados && dados.beneficios && dados.beneficios.length > 0)
    ? dados.beneficios[activeBenefitIndex]
    : dados;

  // Formatação de telefone
  const formatPhone = (phoneStr) => {
    if (!phoneStr) return "";
    let clean = phoneStr.replace(/\D/g, "");
    if (clean.startsWith("55") && clean.length > 10) {
      clean = clean.substring(2);
    }
    if (clean.length === 11) {
      return `(${clean.substring(0, 2)}) ${clean.substring(2, 7)}-${clean.substring(7)}`;
    } else if (clean.length === 10) {
      return `(${clean.substring(0, 2)}) ${clean.substring(2, 6)}-${clean.substring(6)}`;
    }
    return phoneStr;
  };

  // Formatação de data nascidos
  const formatDateBR = (dateStr) => {
    if (!dateStr) return "Não Informado";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Formatação para Moeda Brasileira (BRL)
  const formatBRL = (val) => {
    if (val === null || val === undefined || isNaN(Number(val))) return "R$ 0,00";
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val)).replace(/\s/g, " ");
  };

  const getSubLogo = (code, name) => {
    const normName = (name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
    const cleanCode = (code || "").replace(/\D/g, "");
    if (cleanCode) {
      const matchByCode = subLogos.find(l => {
        const logoName = l.name.toUpperCase();
        return logoName.startsWith(cleanCode) || logoName.includes(` ${cleanCode} `) || logoName.includes(`-${cleanCode}`) || logoName.includes(`${cleanCode}-`);
      });
      if (matchByCode) return matchByCode.logo_url;
    }
    const matchByName = subLogos.find(l => {
      const logoNameNorm = l.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
      return logoNameNorm.includes(normName) || normName.includes(logoNameNorm);
    });
    return matchByName ? matchByName.logo_url : null;
  };

  // Calculo de Margem Inteligente conforme regras de 35% LOAS e 40% Geral
  const getMarginData = () => {
    if (!activeBenefit) return null;
    const salario = Number(activeBenefit.margens?.salario || activeBenefit.cliente?.salario || 0);
    const especie = String(activeBenefit.cliente?.especie || "");
    const isLOAS = especie.includes("87") || especie.includes("88") || activeBenefit.cliente?.especie === "87" || activeBenefit.cliente?.especie === "88";
    const percent = isLOAS ? 0.35 : 0.40;
    
    // Obter dados diretamente do backend para evitar qualquer erro de arredondamento
    const margemConsignavel = Number(activeBenefit.margens?.margem_emprestimo || (salario * percent));
    const totalComprometido = Number(activeBenefit.margens?.total_comprometido || 0);
    const margemLivreReal = activeBenefit.margens && activeBenefit.margens.margem_livre !== undefined ? Number(activeBenefit.margens.margem_livre) : (margemConsignavel - totalComprometido);
    const showMargem = margemLivreReal < 0 ? 0.00 : margemLivreReal;
    const coeficienteUtilizado = Number(activeBenefit.cliente?.coeficiente_utilizado || activeBenefit.margens?.coeficiente_utilizado || 0.02270);
    const valorLiberadoMargem = Number(activeBenefit.margens?.valor_liberado_margem || (showMargem / coeficienteUtilizado));

    return {
      salario,
      isLOAS,
      percent,
      margemConsignavel,
      totalComprometido,
      margemLivreReal,
      showMargem,
      valorLiberadoMargem,
      coeficienteUtilizado
    };
  };

  const marginInfo = getMarginData();

  // Verifica se o meio de pagamento é cartão magnético ou se a conta é vazia
  const isCartaoMagnetico = (activeBenefit) => {
    if (!activeBenefit || !activeBenefit.banco_pagador) return true;
    const tipo = String(activeBenefit.banco_pagador.tipo_pagamento || "").toUpperCase();
    const conta = String(activeBenefit.banco_pagador.conta || "").trim();
    if (tipo.includes("MAGNÉTICO") || tipo.includes("MAGNETICO") || tipo === "1" || !conta) {
      return true;
    }
    return false;
  };

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-700 bg-slate-50 print:bg-white print:pb-0">
      
      <style>{`
        @media print {
          header, footer, aside, nav, .sidebar, .header, .navbar, .print-hidden, .print\\:hidden {
            display: none !important;
          }
          main, .main-content, .content-wrapper, .crm-layout, body, div[class*="max-w-"] {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            background: white !important;
            color: black !important;
          }
          @page {
            margin: 0.4cm !important;
          }
          #extrato-print-container {
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
          }
          .print\:grid-cols-2 {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            width: 100% !important;
          }
          .print\:gap-4 {
            gap: 16px !important;
          }
          .grid.grid-cols-1.md\:grid-cols-2 > div {
            width: auto !important;
            max-width: 100% !important;
            margin-bottom: 0 !important;
          }
          .print-no-break {
            page-break-inside: avoid !important;
          }
          .p-8 {
            padding: 10px 14px !important;
          }
          .p-4 {
            padding: 4px 8px !important;
          }
          .p-5 {
            padding: 6px 10px !important;
          }
          .mb-6 {
            margin-bottom: 6px !important;
          }
          .mb-8 {
            margin-bottom: 8px !important;
          }
          .bg-white {
            background-color: #fff !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 12px !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
          }
          .bg-slate-50 {
            background-color: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 8px !important;
          }
          h1, h2, h3, h4, p, span, a, div, td, th {
            line-height: 1.15 !important;
          }
          h1.text-3xl {
            font-size: 15px !important;
          }
          h3.text-lg {
            font-size: 11px !important;
          }
          .text-base {
            font-size: 10px !important;
          }
          .text-sm {
            font-size: 9px !important;
          }
          .text-xs {
            font-size: 8.5px !important;
          }
          .text-xl {
            font-size: 11px !important;
          }
          .text-2xl {
            font-size: 12px !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10 space-y-8">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 print:hidden">
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter drop-shadow-sm uppercase flex items-center gap-3">
              CONSULTA <span className="text-blue-600">CPF</span>
            </h1>
            <p className="text-slate-500 font-bold italic text-sm uppercase tracking-[0.3em]">Consulta Completa INSS & SIAPE</p>
          </div>
          
          {dados && (
            <button 
              onClick={handleImprimir} 
              disabled={downloadState === "loading"}
              className={`flex items-center gap-2 text-white px-6 py-3 rounded-2xl shadow-xl transition-all font-black uppercase text-xs tracking-wider cursor-pointer ${
                downloadState === "loading"
                  ? "bg-slate-500 cursor-not-allowed shadow-slate-200"
                  : "bg-slate-800 hover:bg-slate-900 hover:-translate-y-0.5"
              }`}
            >
              {downloadState === "loading" ? (
                <Icons.Loader2 size={16} className="animate-spin" />
              ) : (
                <Icons.FileText size={18} />
              )}
              <span>{downloadState === "loading" ? "Gerando..." : "Gerar PDF"}</span>
            </button>
          )}
        </div>

        {/* Painel do Administrador: Toggles Provedor & Saldo */}
        {isAdmin && creditos && (
          <div className="bg-gradient-to-r from-slate-900 to-blue-950 p-6 rounded-[2.5rem] shadow-xl border border-blue-900/50 text-white flex flex-col md:flex-row justify-between items-stretch md:items-center gap-6 relative overflow-hidden print:hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full -mr-12 -mt-12 pointer-events-none"></div>
            <div className="space-y-2 z-10">
              <h4 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <Icons.Shield size={16} className="text-blue-400" /> Painel de Integração de Consultas
              </h4>
              <p className="text-xs text-blue-200 font-bold">Gerencie o provedor ativo e confira o saldo de consultas da plataforma</p>
              
              {/* Seletor de Provedor Ativo */}
              <div className="flex items-center gap-2 pt-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Provedor Ativo:</span>
                <div className="flex bg-slate-950/60 p-1 rounded-xl border border-white/10">
                  <button
                    disabled={loadingProvider}
                    type="button"
                    onClick={() => handleProviderChange("promosys")}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${activeProvider === "promosys" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
                  >
                    PROMOSYS
                  </button>
                  <button
                    disabled={loadingProvider}
                    type="button"
                    onClick={() => handleProviderChange("multicorban")}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${activeProvider === "multicorban" ? "bg-amber-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
                  >
                    MULTICORBAN
                  </button>
                </div>
              </div>
            </div>
            
            {/* Contadores de Créditos */}
            <div className="flex gap-4 z-10 w-full md:w-auto self-end md:self-auto">
              <div className="flex-1 md:flex-initial px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-[9px] font-black uppercase text-blue-300 tracking-wider">Créditos Online</p>
                <p className="text-lg font-black">{creditos.creditos !== null && creditos.creditos !== undefined ? creditos.creditos : "—"}</p>
              </div>
              <div className="flex-1 md:flex-initial px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-[9px] font-black uppercase text-blue-300 tracking-wider">Créditos Offline</p>
                <p className="text-lg font-black">{creditos.creditos_offline !== null && creditos.creditos_offline !== undefined ? creditos.creditos_offline : "—"}</p>
              </div>
              <div className="flex-1 md:flex-initial px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-[9px] font-black uppercase text-blue-300 tracking-wider">Geração Leads</p>
                <p className="text-lg font-black">{creditos.creditos_geracao_leads !== null && creditos.creditos_geracao_leads !== undefined ? creditos.creditos_geracao_leads : "—"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form Consulta */}
        <form onSubmit={handleConsultar} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col md:flex-row gap-4 items-end print:hidden">
          <div className="flex-1 space-y-2 w-full">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF do Cliente</label>
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(maskCPF(e.target.value))}
              placeholder="000.000.000-00"
              className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white transition-all outline-none font-black text-slate-800 text-lg"
            />
          </div>
          {activeProvider === "multicorban" && (
            <div className="w-full md:w-48 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Convênio</label>
              <select
                value={convenio}
                onChange={(e) => setConvenio(e.target.value)}
                className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white transition-all outline-none font-black text-slate-800 text-sm"
              >
                <option value="INSS">INSS</option>
                <option value="SIAPE">SIAPE</option>
                <option value="GOVERNO">GOVERNO</option>
                <option value="CLT PRIVADO">CLT</option>
              </select>
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !cpf}
            className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 w-full md:w-auto"
          >
            {loading ? <Icons.Loader2 className="animate-spin" /> : <><Icons.Search size={18} /> Consultar</>}
          </button>
        </form>

        {/* Resultados */}
        {dados && activeBenefit && marginInfo && (
          <div id="extrato-print-container" className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Header Impressão */}
            <div className="hidden print:flex justify-between items-center border-b-4 border-blue-600 pb-4 mb-8">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">EXTRATO DE CONSIGNAÇÃO</h1>
                <p className="text-xs font-black text-blue-600 tracking-widest uppercase mt-0.5">PORTABILIDADE PRO</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 tracking-widest uppercase">Data de Emissão</p>
                <p className="text-sm font-black text-slate-800 mt-0.5">{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            {/* Abas de Benefícios Múltiplos */}
            {dados.beneficios && dados.beneficios.length > 1 && (
              <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-xl print:hidden">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center pl-2 pr-4 border-r border-slate-150">Benefícios ({dados.total_beneficios}):</span>
                <div className="flex flex-wrap gap-2">
                  {dados.beneficios.map((b, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveBenefitIndex(idx)}
                      className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                        activeBenefitIndex === idx 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      <Icons.UserCheck size={14} />
                      NB {b.numero}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Grid 1: Dados Pessoais (Cabeçalho Premium) e Dados do Benefício */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2 print:gap-4">
              
              {/* Dados do Cliente - Cabeçalho Premium com Ícone Premium Crown */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 print-no-break relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-10 -mt-10 pointer-events-none"></div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 print:bg-slate-50 print:text-amber-700 print:border-slate-200">
                      <CrownIcon className="w-5 h-5 text-amber-500 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Dados do Cliente</h3>
                  </div>
                  <PremiumBadge />
                </div>
                
                <div className="space-y-5 print:space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-100 flex items-start gap-3">
                      <UserIcon className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nome Completo</p>
                        <p className="text-sm font-black text-slate-800 uppercase print:text-xs">{activeBenefit.cliente?.nome}</p>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-100 flex items-start gap-3">
                      <CpfIcon className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CPF</p>
                        <p className="text-sm font-black text-slate-800 uppercase print:text-xs">{activeBenefit.cliente?.cpf ? maskCPF(activeBenefit.cliente.cpf) : ""}</p>
                      </div>
                    </div>
                  </div>

                  {/* Campo Filiação adicionado logo abaixo do nome e do cpf */}
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-100 flex items-start gap-3">
                    <FiliaçãoIcon className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                    <div className="w-full">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Filiação</p>
                      <p className="text-sm font-black text-slate-800 uppercase print:text-xs">{activeBenefit.cliente?.filiacao || "Não Informada"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-100 flex items-start gap-3">
                      <CalendarIcon className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data de Nascimento</p>
                        <p className="text-sm font-black text-slate-800 uppercase print:text-xs">
                          {activeBenefit.cliente?.data_nascimento ? formatDateBR(activeBenefit.cliente.data_nascimento) : "Não Informada"}
                          {activeBenefit.cliente?.idade ? ` (${activeBenefit.cliente.idade} anos)` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-100 flex items-start gap-3">
                      <PhoneIcon className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Telefone / Contato</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {activeBenefit.telefones && activeBenefit.telefones.length > 0 ? (
                            activeBenefit.telefones.map((tel, i) => (
                              <a 
                                key={i} 
                                href={`https://wa.me/${tel.replace(/\D/g, '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 rounded-lg text-[10px] font-black transition-all border border-emerald-100 print:bg-transparent print:border-none print:shadow-none print:p-0 print:text-slate-800 print:text-xs"
                              >
                                <Icons.MessageCircle size={10} className="text-emerald-500 print:hidden" />
                                <span>{formatPhone(tel)}</span>
                              </a>
                            ))
                          ) : (
                            <span className="text-xs font-bold text-slate-400">Nenhum</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {activeBenefit.cliente?.endereco && (
                    <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-100 flex items-start gap-3">
                      <MapPinIcon className="w-4.5 h-4.5 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Endereço Completo</p>
                        <p className="text-xs font-bold text-slate-700 uppercase leading-relaxed print:text-xs">{activeBenefit.cliente.endereco}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Dados do Benefício & Dados Bancários */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 print-no-break relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-10 -mt-10 pointer-events-none"></div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 print:bg-slate-50 print:text-purple-700 print:border-slate-200">
                      <Icons.UserCheck size={20} />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Dados do Benefício</h3>
                  </div>
                  
                  {/* Cadeado Premium para Empréstimo */}
                  {activeBenefit.beneficio?.bloqueio_emprestimo && (
                    <div>
                      {activeBenefit.beneficio.bloqueio_emprestimo.toLowerCase().includes("sim") || activeBenefit.beneficio.bloqueado === true ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 shadow-sm animate-pulse">
                          <LockPremiumIcon className="w-3.5 h-3.5" />
                          <span className="text-[8px] font-black uppercase tracking-wider">BLOQUEADO</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-sm">
                          <UnlockPremiumIcon className="w-3.5 h-3.5" />
                          <span className="text-[8px] font-black uppercase tracking-wider">LIBERADO</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4 print:space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
                    <div className="md:col-span-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Número (NB)</p>
                      <p className="text-sm font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xl inline-block mt-0.5 print:bg-transparent print:p-0 print:text-xs">
                        {activeBenefit.cliente?.beneficio || activeBenefit.numero}
                      </p>
                    </div>
                    
                    <div className="md:col-span-3">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Espécie</p>
                      <p className="text-sm font-black text-slate-800 mt-0.5 print:text-xs">{activeBenefit.cliente?.especie || "Não Informada"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 print:grid-cols-2 print:gap-2">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Situação</p>
                      <p className={`text-[10px] font-black uppercase inline-block px-2.5 py-1 rounded-xl mt-0.5 ${
                        (activeBenefit.beneficio?.situacao || "").toUpperCase() === "ATIVO" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
                      } print:bg-transparent print:p-0 print:text-xs`}>
                        {activeBenefit.beneficio?.situacao || "Desconhecida"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Concessão (DDB)</p>
                      <p className="text-sm font-black text-slate-800 mt-0.5 print:text-xs">
                        {activeBenefit.beneficio?.ddb ? formatDateBR(activeBenefit.beneficio.ddb) : "Não Informada"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100 print:grid-cols-3 print:gap-2">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">UF Benefício</p>
                      <p className="text-sm font-black text-slate-800 uppercase mt-0.5 print:text-xs">{activeBenefit.beneficio?.uf || "Não Informada"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor do Benefício</p>
                      <p className="text-sm font-black text-slate-800 mt-0.5 print:text-xs">{formatBRL(marginInfo.salario)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Meio Pagamento</p>
                      <p className="text-sm font-black text-slate-800 uppercase mt-0.5 print:text-xs">
                        {activeBenefit.banco_pagador?.tipo_pagamento || (isCartaoMagnetico(activeBenefit) ? "Cartão Magnético" : "Conta Corrente")}
                      </p>
                    </div>
                  </div>

                  {/* Dados Bancários Condicionais */}
                  <div className="pt-3.5 border-t border-slate-100 bg-slate-50/60 p-4 rounded-2xl border border-slate-150">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Icons.Landmark size={14} className="text-slate-500" /> DADOS BANCÁRIOS DE RECEBIMENTO
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2.5fr)_minmax(70px,0.6fr)_minmax(110px,1fr)] gap-4">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Banco</span>
                        <p className="text-xs font-black text-slate-800 uppercase leading-tight break-words">
                          {formatBankName(activeBenefit.banco_pagador?.codigo, activeBenefit.banco_pagador?.nome)}
                        </p>
                      </div>
                      
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Agência</span>
                        <p className="text-xs font-black text-slate-800">
                          {activeBenefit.banco_pagador?.agencia || "Não Informada"}
                        </p>
                      </div>

                      {/* Exibir conta somente se NÃO for cartão magnético */}
                      {!isCartaoMagnetico(activeBenefit) && (
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Conta Corrente</span>
                          <p className="text-xs font-black text-slate-800">
                            {activeBenefit.banco_pagador?.conta || "Não Informada"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumo Financeiro (Margens Inteligentes) */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 relative overflow-hidden print-no-break">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-20 -mt-20 opacity-50 pointer-events-none print:hidden"></div>
              
              <div className="flex items-center gap-3 mb-8 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 print:bg-slate-50 print:text-emerald-700 print:border-slate-200">
                  <Icons.TrendingUp size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Resumo Financeiro (Margens)</h3>
                {marginInfo.isLOAS && (
                  <span className="ml-3 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-black uppercase tracking-wider">
                    LOAS 35%
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-6 relative z-10 print:grid-cols-5">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Salário Base</p>
                  <p className="text-lg font-black text-slate-800">{formatBRL(marginInfo.salario)}</p>
                </div>
                
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Consignável ({marginInfo.percent * 100}%)</p>
                  <p className="text-lg font-black text-slate-800">{formatBRL(marginInfo.margemConsignavel)}</p>
                </div>
                
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Total Comprometido</p>
                  <p className="text-lg font-black text-slate-800">{formatBRL(marginInfo.totalComprometido)}</p>
                </div>
                
                {/* Margem Disponível (Vermelho se negativo, Verde se positivo/zero) */}
                <div className={`p-5 rounded-2xl border flex flex-col justify-center ${
                  marginInfo.margemLivreReal < 0 
                    ? 'bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-900/30' 
                    : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30'
                }`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${
                    marginInfo.margemLivreReal < 0 ? 'text-red-600' : 'text-emerald-600'
                  }`}>Margem Disponível</p>
                  
                  <p className={`text-xl font-black ${
                    marginInfo.margemLivreReal < 0 ? 'text-red-600' : 'text-emerald-700'
                  }`}>
                    {marginInfo.margemLivreReal < 0 ? "R$ 0,00" : formatBRL(marginInfo.showMargem)}
                  </p>
                  
                  {marginInfo.margemLivreReal < 0 && (
                    <span className="text-[9px] font-bold text-red-500 uppercase mt-0.5 tracking-wider">
                      Negativo: {formatBRL(marginInfo.margemLivreReal)}
                    </span>
                  )}
                </div>

                {/* Valor Liberado da Margem */}
                <div className={`p-5 rounded-2xl border flex flex-col justify-center ${
                  marginInfo.margemLivreReal < 0 
                    ? 'bg-slate-50 border-slate-200 opacity-60' 
                    : 'bg-gradient-to-tr from-emerald-500/10 to-teal-500/5 border-emerald-200'
                }`}>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Valor Liberado Aprox.</p>
                  <p className={`text-2xl font-black ${marginInfo.margemLivreReal < 0 ? 'text-slate-400' : 'text-emerald-700'}`}>
                    {formatBRL(marginInfo.valorLiberadoMargem)}
                  </p>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Coeficiente {marginInfo.coeficienteUtilizado.toFixed(5).replace('.', ',')}
                  </span>
                </div>
              </div>
            </div>

            {/* Empréstimos Ativos */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 print-no-break">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 print:bg-slate-50 print:text-orange-700 print:border-slate-200">
                  <Icons.Landmark size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Empréstimos Consignados Ativos ({activeBenefit.emprestimos?.length || 0})</h3>
              </div>

              <div className="space-y-3.5">
                {activeBenefit.emprestimos && activeBenefit.emprestimos.length > 0 ? (
                  activeBenefit.emprestimos.map((emp, idx) => {
                    const logoUrl = getSubLogo(emp.codigo, emp.banco);
                    return (
                      <div key={idx} className="p-5 rounded-2xl border border-slate-150 bg-slate-50/60 hover:bg-slate-50 hover:shadow-md transition-all flex flex-col md:flex-row gap-4 justify-between items-start md:items-center print-no-break">
                        <div className="flex items-center gap-3.5 min-w-0 pr-4 w-full md:w-80 print:w-96">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center relative">
                            {logoUrl ? (
                              <img 
                                src={getStaticUrl(logoUrl)} 
                                alt={emp.banco} 
                                className="w-full h-full object-cover absolute inset-0" 
                                data-html2canvas-ignore="true"
                              />
                            ) : (
                              <span className="text-[10px] font-black text-slate-400">
                                {(emp.banco || "B").charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Banco</p>
                            <p className="text-sm font-black text-slate-800 uppercase truncate">{formatBankName(emp.codigo, emp.banco)}</p>
                            <p className="text-xs font-bold text-slate-400 truncate">Contrato: {emp.contrato}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-8 flex-1 w-full text-left print:grid-cols-5">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Parcela</p>
                            <p className="text-sm font-black text-slate-800">{formatBRL(emp.parcela)}</p>
                          </div>

                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Contrato</p>
                            <p className="text-sm font-black text-slate-800">{formatBRL(emp.valor_contrato || emp.valor_liberado || 0)}</p>
                          </div>
                          
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Devedor</p>
                            <p className="text-sm font-black text-blue-600">{formatBRL(emp.saldo_devedor || emp.quitacao || 0)}</p>
                          </div>
                          
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Prazo Restante</p>
                            <p className="text-sm text-slate-800 font-bold">
                              <span className="text-slate-900 font-black">{emp.prazo_restante}</span> <span className="text-slate-400 font-medium">de {emp.prazo}</span>
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Taxa de Juros</p>
                            <p className="text-sm font-black text-emerald-600">{Number(emp.taxa || 0).toFixed(2)}% <span className="text-slate-400 text-[10px] font-bold">a.m.</span></p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs font-bold text-slate-400 text-center py-8 bg-slate-50/40 rounded-2xl border border-dashed border-slate-200">
                    Nenhum empréstimo consignado ativo encontrado.
                  </p>
                )}
              </div>
            </div>

            {/* Cartões RMC / RCC */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 print-no-break">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center border border-pink-100 print:bg-slate-50 print:text-pink-700 print:border-slate-200">
                  <Icons.CreditCard size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Cartões de Crédito Consignado (RMC / RCC) ({activeBenefit.cartoes?.length || 0})</h3>
              </div>

              <div className="space-y-3.5">
                {activeBenefit.cartoes && activeBenefit.cartoes.length > 0 ? (
                  activeBenefit.cartoes.map((cartao, idx) => {
                    const logoUrl = getSubLogo(cartao.codigo, cartao.banco);
                    return (
                      <div key={idx} className="p-5 rounded-2xl border border-slate-150 bg-slate-50/60 hover:bg-slate-50 hover:shadow-md transition-all flex flex-col md:flex-row gap-4 justify-between items-start md:items-center print-no-break">
                        <div className="flex items-center gap-3.5 min-w-0 pr-4 w-full md:w-80 print:w-96">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center relative">
                            {logoUrl ? (
                              <img 
                                src={getStaticUrl(logoUrl)} 
                                alt={cartao.banco} 
                                className="w-full h-full object-cover absolute inset-0" 
                                data-html2canvas-ignore="true"
                              />
                            ) : (
                              <span className="text-[10px] font-black text-slate-400">
                                {(cartao.banco || "B").charAt(0)}
                              </span>
                            )}
                          </div>
                          
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Banco</p>
                            <p className="text-sm font-black text-slate-800 uppercase truncate">{formatBankName(cartao.codigo, cartao.banco)}</p>
                            <p className="text-xs font-black text-pink-600 truncate">{cartao.tipo || "Cartão Consignado"}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 flex-1 w-full text-left print:grid-cols-4">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Parcela Reservada</p>
                            <p className="text-sm font-black text-slate-800">{formatBRL(cartao.parcela_promosys)}</p>
                          </div>
                          
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Limite de Saque</p>
                            <p className="text-sm font-black text-slate-800">{formatBRL(cartao.limite_cartao)}</p>
                          </div>
                          
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Limite Utilizado</p>
                            <p className="text-sm font-black text-red-500">{formatBRL(cartao.utilizado)}</p>
                          </div>
                          
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Limite Disponível</p>
                            <p className="text-sm font-black text-emerald-600">{formatBRL(cartao.disponivel)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs font-bold text-slate-400 text-center py-8 bg-slate-50/40 rounded-2xl border border-dashed border-slate-200">
                    Nenhum cartão RMC ou RCC ativo encontrado.
                  </p>
                )}
              </div>
            </div>

          </div>
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
    </div>
  );
}
