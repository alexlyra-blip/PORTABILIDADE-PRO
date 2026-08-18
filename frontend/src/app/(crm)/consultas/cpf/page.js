"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, getStaticUrl } from "@/utils/api";
import { Icons } from "@/components/Icons";
import { useToast } from "@/components/ToastProvider";

const BANK_NAME_BY_CODE = {
  "001": "BANCO DO BRASIL",
  "033": "SANTANDER",
  "041": "BANRISUL",
  "070": "BRB",
  "104": "CAIXA",
  "121": "AGIBANK",
  "237": "BANCO BRADESCO",
  "254": "PARANÁ BANCO",
  "318": "BANCO BMG",
  "320": "CCB BRASIL",
  "336": "C6 BANK",
  "341": "ITAÚ",
  "389": "BANCO MERCANTIL",
  "422": "BANCO SAFRA",
  "623": "BANCO PAN",
  "626": "C6 CONSIGNADO",
  "707": "BANCO DAYCOVAL",
  "739": "BANCO CETELEM",
  "756": "SICOOB",
};

const normalizeBankCode = (codigo) => {
  const digits = String(codigo || "").replace(/\D/g, "");

  if (!digits) return "";

  return digits.padStart(3, "0").slice(0, 3);
};

const formatBankName = (codigo, banco) => {
  const codeStr = normalizeBankCode(codigo);

  const receivedName = String(banco || "")
    .replace(/['"]/g, "")
    .trim();

  const canonicalName = BANK_NAME_BY_CODE[codeStr] || receivedName;

  if (codeStr && canonicalName) {
    return `${codeStr} - ${canonicalName}`;
  }

  return canonicalName;
};

const SECONDARY_LOGOS_CACHE_KEY = "cached_sub_logos";

const normalizeSecondaryLogos = (logos) => (
  Array.isArray(logos)
    ? logos
      .filter((logo) => logo && typeof logo === "object")
      .map((logo) => ({
        ...logo,
        name: String(logo.name || "").trim(),
        logo_url: String(logo.logo_url || "").trim(),
      }))
      .filter((logo) => logo.name)
    : []
);

/*
 * Carrega e decodifica as imagens antes de liberar o resultado da consulta.
 * Assim o navegador pinta o cartão já com a logo secundária pronta, sem
 * mostrar primeiro o avatar genérico.
 */
const preloadSecondaryLogoImages = async (logos) => {
  if (typeof window === "undefined") return;

  const sources = Array.from(new Set(
    normalizeSecondaryLogos(logos)
      .map((logo) => getStaticUrl(logo.logo_url))
      .filter(Boolean)
  ));

  await Promise.all(sources.map((src) => new Promise((resolve) => {
    const image = new window.Image();
    let settled = false;
    let timeoutId = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      image.onload = null;
      image.onerror = null;
      resolve();
    };

    image.onload = () => {
      if (typeof image.decode === "function") {
        image.decode().catch(() => {}).finally(finish);
      } else {
        finish();
      }
    };
    image.onerror = finish;
    timeoutId = window.setTimeout(finish, 3500);
    image.src = src;

    if (image.complete) {
      image.onload();
    }
  })));
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

const BankFallbackIcon = ({ className = "w-6 h-6" }) => (
  <svg className={`${className} text-slate-400`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 10h18" />
    <path d="M5 10v8" />
    <path d="M9 10v8" />
    <path d="M15 10v8" />
    <path d="M19 10v8" />
    <path d="M3 18h18" />
    <path d="M2 21h20" />
    <path d="m12 3 9 4H3l9-4Z" />
  </svg>
);

const BankLogo = ({ src, alt, className = "w-full h-full object-cover" }) => {
  const [failedSrc, setFailedSrc] = useState(null);
  const resolvedSrc = getStaticUrl(src);

  if (!resolvedSrc || failedSrc === resolvedSrc) {
    return <BankFallbackIcon />;
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt || "Logo do banco"}
      className={className}
      loading="eager"
      fetchPriority="high"
      decoding="async"
      onError={() => setFailedSrc(resolvedSrc)}
      data-html2canvas-ignore="true"
    />
  );
};

const C6BankLogo = ({ className = "w-9 h-9" }) => (
  <div className={`${className} rounded-lg bg-black text-white flex flex-col items-center justify-center shadow-sm border border-slate-700 leading-none`} aria-label="C6 Bank">
    <span className="text-[11px] font-black tracking-tight">C6</span>
    <span className="text-[4px] font-bold tracking-[0.12em] mt-0.5">BANK</span>
  </div>
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
  const secondaryLogosLoadRef = useRef(Promise.resolve([]));
  const [isAdmin, setIsAdmin] = useState(false);
  const [creditos, setCreditos] = useState(null);
  const [activeProvider, setActiveProvider] = useState(null);
  const [loadingProvider, setLoadingProvider] = useState(false);
  const [providerConfigLoaded, setProviderConfigLoaded] = useState(false);
  const [convenio, setConvenio] = useState("INSS");
  const [searchType, setSearchType] = useState("CPF");
  const [downloadState, setDownloadState] = useState("idle");
  const [recentQueries, setRecentQueries] = useState([]);
  const [c6RefinByContract, setC6RefinByContract] = useState({});
  const [c6RefinLoading, setC6RefinLoading] = useState({});
  const [c6RefinOpen, setC6RefinOpen] = useState({});
  const [
    c6RefinSelectedByContract,
    setC6RefinSelectedByContract,
  ] = useState({});
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const response = await api.get(`/consultas/historico?convenio=${encodeURIComponent(convenio)}`);
        setRecentQueries(response || []);
      } catch (err) {
        console.error("Erro ao buscar historico:", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [convenio]);
  const maskCpfCnpj = (val) => {
    if (!val) return "";
    let v = String(val).replace(/\D/g, "");
    if (v.length <= 11) {
      return v
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else {
      v = v.slice(0, 14);
      return v
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadSecondaryLogos = async () => {
      let cachedLogos = [];
      let cachedImagesReady = Promise.resolve();

      try {
        cachedLogos = normalizeSecondaryLogos(
          JSON.parse(localStorage.getItem(SECONDARY_LOGOS_CACHE_KEY) || "[]")
        );

        if (cachedLogos.length > 0) {
          if (!cancelled) setSubLogos(cachedLogos);
          cachedImagesReady = preloadSecondaryLogoImages(cachedLogos);
        }
      } catch (cacheError) {
        console.warn("Cache de logos secundárias inválido:", cacheError);
        localStorage.removeItem(SECONDARY_LOGOS_CACHE_KEY);
      }

      try {
        const response = await api.get("/admin/sub-logos");
        const freshLogos = normalizeSecondaryLogos(response);

        try {
          localStorage.setItem(
            SECONDARY_LOGOS_CACHE_KEY,
            JSON.stringify(freshLogos)
          );
        } catch (storageError) {
          console.warn(
            "Não foi possível atualizar o cache de logos secundárias:",
            storageError
          );
        }

        await Promise.all([
          cachedImagesReady,
          preloadSecondaryLogoImages(freshLogos),
        ]);

        if (!cancelled) setSubLogos(freshLogos);
        return freshLogos;
      } catch (error) {
        console.error("Erro ao carregar logos secundárias:", error);
        await cachedImagesReady;

        if (!cancelled) setSubLogos(cachedLogos);
        return cachedLogos;
      }
    };

    secondaryLogosLoadRef.current = loadSecondaryLogos();

    const loadPageConfiguration = async () => {
      try {
        const userStr = localStorage.getItem("user");

        if (!userStr) {
          window.location.href = "/login";
          return;
        }
        const user = JSON.parse(userStr);
        const adminUser = user.role === "admin";

        const allowedRoles = [
          "admin",
          "promotora",
          "corretor",
          "vendedor",
        ];

        const isAllowed = allowedRoles.includes(user.role);

        setIsAdmin(adminUser);

        if (!isAllowed) {
          window.location.href = "/simulador";
          return;
        }

        const response = await api.get(
          "/admin/cpf-config"
        );

        const provider = [
          "promosys",
          "multicorban",
        ].includes(response?.active_provider)
          ? response.active_provider
          : null;

        setActiveProvider(provider);

        if (adminUser && provider) {
          await fetchBalance(provider);
        } else {
          setCreditos(null);
        }
      } catch (error) {
        console.error(
          "Erro ao carregar configuração de provedor:",
          error
        );

        setActiveProvider(null);
        setCreditos(null);
      } finally {
        setProviderConfigLoaded(true);
      }
    };

    void loadPageConfiguration();

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchBalance = async (provider) => {
    setLoadingProvider(true);
    try {
      if (provider === "multicorban") {
        // Saldo MultiCorban disponivel apenas para administradores.
        // Usuarios nao-admin podem consultar CPF normalmente,
        // mas nao devem chamar a rota protegida de saldo.
        if (!isAdmin) {
          setCreditos({
            creditos: 0,
            creditos_offline: 0,
            creditos_geracao_leads: 0,
            isMultiCorban: true
          });
          return;
        }

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
      const response = await api.post(
        "/admin/cpf-config",
        {
          active_provider: provider
        }
      );

      const savedProvider =
        response?.active_provider;

      if (savedProvider !== provider) {
        throw new Error(
          "O banco não confirmou a configuração."
        );
      }

      setActiveProvider(savedProvider);
      setDados(null);

      await fetchBalance(savedProvider);

      toast.success(
        savedProvider === "multicorban"
          ? "MultiCorban definido como provedor ativo."
          : "Promosys definido como provedor ativo."
      );
    } catch (error) {
      console.error(error);

      toast.error(
        "Erro ao alterar o provedor ativo."
      );
    } finally {
      setLoadingProvider(false);
    }
  };

  const handleHistoryClick = async (query) => {
    const formattedCpf = maskCpfCnpj(query.documento);
    setCpf(formattedCpf);

    // Auto submit
    setLoading(true);
    setDados(null);
    try {
      const payload = {
        cpf: formattedCpf.replace(/\D/g, ""),
        convenio: query.convenio,
      };

      const endpoint = activeProvider === "multicorban"
        ? "/consultas/cpf"
        : "/consultas/promosys/cpf";

      const response = await api.post(endpoint, payload);
      await secondaryLogosLoadRef.current;
      setDados(response);
      setActiveBenefitIndex(0);

      if (isAdmin && activeProvider) {
        fetchBalance(activeProvider);
      }

      toast.success("Consulta recuperada com sucesso!");
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.message || "Erro desconhecido";
      toast.error(`Erro ao carregar consulta: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConsultar = async (e) => {
    e.preventDefault();

    if (!providerConfigLoaded) {
      toast.warning("Aguarde o carregamento da configuração.");
      return;
    }

    if (!activeProvider) {
      toast.warning("Provedor de consulta CPF não configurado pelo administrador.");
      return;
    }

    const cleanDoc = cpf.replace(/\D/g, '');
    const isCnpj = searchType === "CNPJ" || cleanDoc.length > 11;
    if (isCnpj && cleanDoc.length < 14) {
      toast.warning("Por favor, informe um CNPJ válido com 14 dígitos.");
      return;
    }
    if (!isCnpj && cleanDoc.length < 11) {
      toast.warning("Por favor, informe um CPF válido com 11 dígitos.");
      return;
    }

    setLoading(true);
    setDados(null);
    try {
      const res = await api.post('/consultas/cpf', {
        cpf: cleanDoc,
        convenio: isCnpj ? "CNPJ" : (activeProvider === "multicorban" ? convenio : "INSS")
      });
      if (res && (res.cliente || res.beneficio_principal || (res.beneficios && res.beneficios.length > 0))) {
        await secondaryLogosLoadRef.current;
        setDados(res);
        setActiveBenefitIndex(0);
        await fetchBalance(activeProvider);
        toast.success(isCnpj ? "Consulta de CNPJ concluída com sucesso!" : "Consulta de CPF concluída com sucesso!");
      } else {
        toast.warning("Consulta não retornou dados.");
      }
    } catch (err) {
      console.error(err);

      const rawMsg =
        err.response?.data?.detail
        || err.message
        || "Erro desconhecido";

      const normalizedMsg = String(rawMsg)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      if (
        normalizedMsg.includes("licenca da multicorban expirada")
        || normalizedMsg.includes("licenca multicorban expirada")
      ) {
        toast.error(
          "Licença da MultiCorban expirada. Regularize a licença para realizar novas consultas."
        );
      } else {
        toast.error(`Erro ao consultar: ${rawMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const getC6RefinKey = (emp) => {
    const documento = String(
      activeBenefit?.cliente?.cpf
        || dados?.cpf
        || ""
    ).replace(/\D/g, "");

    const beneficio = String(
      activeBenefit?.cliente?.beneficio
        || activeBenefit?.numero
        || ""
    ).replace(/\D/g, "");

    const contrato = String(
      emp?.contrato || ""
    ).trim();

    return [
      documento,
      beneficio,
      contrato,
    ].join(":");
  };

  const isC6RefinLoan = (emp) => {
    const beneficioConvenio = String(
      activeBenefit?.convenio
        || convenio
        || "INSS"
    ).trim().toUpperCase();

    if (beneficioConvenio !== "INSS") {
      return false;
    }

    const bankCode = normalizeBankCode(
      emp?.codigo
    );

    const bankName = String(
      emp?.banco || ""
    ).trim().toUpperCase();

    return (
      bankCode === "626"
      || bankName.includes("C6")
    );
  };

  const formatC6Rate = (value) => {
    let rate = Number(value || 0);

    if (
      rate > 0
      && rate < 1
    ) {
      rate *= 100;
    }

    return `${rate
      .toFixed(2)
      .replace(".", ",")}%`;
  };

  const handleC6Refin = async (emp) => {
    if (!isC6RefinLoan(emp)) {
      return;
    }

    const key = getC6RefinKey(emp);

    const existingResult =
      c6RefinByContract[key];

    /*
     * Se ja temos uma simulacao valida,
     * apenas abre/fecha o painel.
     */
    if (existingResult?.success) {
      setC6RefinOpen((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
      return;
    }

    const cliente =
      activeBenefit?.cliente || {};

    const margens =
      activeBenefit?.margens || {};

    const payload = {
      cpf:
        cliente.cpf
        || dados?.cpf
        || cpf,
      beneficio:
        cliente.beneficio
        || activeBenefit?.numero
        || "",
      contrato:
        emp?.contrato
        || "",
      data_nascimento:
        cliente.data_nascimento
        || "",
      renda: Number(
        cliente.salario
          || margens.salario
          || 0
      ),
      parcela: Number(
        emp?.parcela
          || 0
      ),
      prazo: 108,
    };

    if (
      !String(payload.cpf).replace(/\D/g, "")
      || !String(payload.beneficio).replace(/\D/g, "")
      || !String(payload.contrato).trim()
      || !payload.data_nascimento
      || payload.renda <= 0
      || payload.parcela <= 0
    ) {
      toast.error(
        "Os dados deste contrato est\\u00e3o incompletos para consultar o Refin C6."
      );
      return;
    }

    setC6RefinLoading((prev) => ({
      ...prev,
      [key]: true,
    }));

    setC6RefinOpen((prev) => ({
      ...prev,
      [key]: true,
    }));

    try {
      const result = await api.post(
        "/consultas/c6/refin",
        payload
      );

      setC6RefinByContract((prev) => ({
        ...prev,
        [key]: result,
      }));

      setC6RefinSelectedByContract((prev) => ({
        ...prev,
        [key]: 0,
      }));

      setC6RefinOpen((prev) => ({
        ...prev,
        [key]: true,
      }));

      toast.success(
        "Refin C6 consultado com sucesso."
      );
    } catch (error) {
      console.error(
        "Erro ao consultar Refin C6:",
        error
      );

      setC6RefinByContract((prev) => ({
        ...prev,
        [key]: {
          success: false,
          status: "erro",
          mensagem: "Refin C6 indisponível",
        },
      }));

      setC6RefinOpen((prev) => ({
        ...prev,
        [key]: true,
      }));

      toast.error(
        "N\\u00e3o foi poss\\u00edvel consultar o Refin C6."
      );
    } finally {
      setC6RefinLoading((prev) => ({
        ...prev,
        [key]: false,
      }));
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
                  <td style="padding: 4px 0; color: #0f172a; font-weight: 900;">${activeBenefit.cliente?.cpf ? maskCpfCnpj(activeBenefit.cliente.cpf) : 'N/A'}</td>
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
                    <td style="padding: 4px 0; color: #64748b; font-weight: bold;">Meio de pagamento:</td>
                    <td style="padding: 4px 0; color: ${isCartaoMagnetico(activeBenefit) ? '#b45309' : '#166534'}; font-weight: 900; text-transform: uppercase;">
                      ${isCartaoMagnetico(activeBenefit)
                        ? 'Cartão Magnético'
                        : 'Conta Corrente'}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; font-weight: bold; vertical-align: top;">Banco pagador:</td>
                    <td style="padding: 4px 0; color: #0f172a; font-weight: 700; text-transform: uppercase; line-height: 1.35;">
                      ${formatBankName(
                        activeBenefit.banco_pagador?.codigo,
                        activeBenefit.banco_pagador?.nome
                      )}
                      ${activeBenefit.banco_pagador?.agencia
                        ? `<br>Agência: ${activeBenefit.banco_pagador.agencia}`
                        : ''}
                      ${!isCartaoMagnetico(activeBenefit) &&
                        activeBenefit.banco_pagador?.conta
                        ? `<br>Conta: ${activeBenefit.banco_pagador.conta}`
                        : ''}
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
                <p style="font-size: 8px; font-weight: 700; color: ${marginInfo.margemLivreReal < 0 ? '#991b1b' : '#166534'}; margin: 0 0 4px 0; text-transform: uppercase;">Margem Disponível</p>
                <p style="font-size: 11px; font-weight: 900; color: ${marginInfo.margemLivreReal < 0 ? '#991b1b' : '#166534'}; margin: 0;">${formatBRL(marginInfo.margemLivreReal)}</p>
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
              <table style="width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 8px;">
              <thead>
                <tr style="background-color: #f8fafc; border-bottom: 1px solid #cbd5e1;">
                  <th style="width: 20%; padding: 8px 6px; text-align: left; font-size: 7px; font-weight: 900; color: #64748b; text-transform: uppercase;">
                    Banco
                  </th>

                  <th style="width: 12%; padding: 8px 5px; text-align: left; font-size: 7px; font-weight: 900; color: #64748b; text-transform: uppercase;">
                    Valor Contrato
                  </th>

                  <th style="width: 11%; padding: 8px 5px; text-align: left; font-size: 7px; font-weight: 900; color: #64748b; text-transform: uppercase;">
                    Data Início
                  </th>

                  <th style="width: 11%; padding: 8px 5px; text-align: left; font-size: 7px; font-weight: 900; color: #64748b; text-transform: uppercase;">
                    Data Final
                  </th>

                  <th style="width: 10%; padding: 8px 5px; text-align: left; font-size: 7px; font-weight: 900; color: #64748b; text-transform: uppercase;">
                    Parcela
                  </th>

                  <th style="width: 9%; padding: 8px 5px; text-align: left; font-size: 7px; font-weight: 900; color: #64748b; text-transform: uppercase;">
                    Taxa
                  </th>

                  <th style="width: 12%; padding: 8px 5px; text-align: left; font-size: 7px; font-weight: 900; color: #64748b; text-transform: uppercase;">
                    Prazo Restante
                  </th>

                  <th style="width: 15%; padding: 8px 5px; text-align: left; font-size: 7px; font-weight: 900; color: #64748b; text-transform: uppercase;">
                    Saldo Devedor
                  </th>
                </tr>
              </thead>

              <tbody>
                ${(activeBenefit.emprestimos || []).map((emp) => `
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 9px 6px; vertical-align: top;">
                      <div style="font-size: 8px; font-weight: 900; color: #0f172a; text-transform: uppercase; line-height: 1.15; word-break: break-word;">
                        ${formatBankName(
                          emp.codigo
                            || emp.banco_codigo
                            || emp.Banco,
                          emp.banco
                            || emp.nome_banco
                            || emp.NomeBanco
                            || ""
                        )}
                      </div>

                      <div style="font-size: 6.5px; font-weight: 700; color: #94a3b8; margin-top: 3px; line-height: 1.1; word-break: break-word;">
                        Contrato: ${emp.contrato
                          || emp.numero_contrato
                          || emp.Contrato
                          || "Não Informado"}
                      </div>
                    </td>

                    <td style="padding: 9px 5px; vertical-align: top; font-size: 8px; font-weight: 800; color: #0f172a;">
                      ${formatBRL(
                        emp.valor_contrato
                          ?? emp.valor_emprestimo
                          ?? emp.ValorEmprestimo
                          ?? 0
                      )}
                    </td>

                    <td style="padding: 9px 5px; vertical-align: top; font-size: 8px; font-weight: 800; color: #0f172a;">
                      ${formatDateBR(getLoanStartDate(emp))}
                    </td>

                    <td style="padding: 9px 5px; vertical-align: top; font-size: 8px; font-weight: 800; color: #0f172a;">
                      ${formatDateBR(getLoanEndDate(emp))}
                    </td>

                    <td style="padding: 9px 5px; vertical-align: top; font-size: 8px; font-weight: 900; color: #0f172a;">
                      ${formatBRL(
                        emp.parcela
                          ?? emp.valor_parcela
                          ?? emp.ValorParcela
                          ?? 0
                      )}
                    </td>

                    <td style="padding: 9px 5px; vertical-align: top; font-size: 8px; font-weight: 900; color: #15803d;">
                      ${Number(emp.taxa || 0)
                        .toFixed(2)
                        .replace(".", ",")}% a.m.
                    </td>

                    <td style="padding: 9px 5px; vertical-align: top; font-size: 8px; font-weight: 900; color: #0f172a;">
                      ${emp.prazo_restante
                        ?? emp.parcelas_restantes
                        ?? emp.ParcelasRestantes
                        ?? 0} de ${emp.prazo
                        ?? emp.Prazo
                        ?? 0}
                    </td>

                    <td style="padding: 9px 5px; vertical-align: top; font-size: 8px; font-weight: 900; color: #2563eb;">
                      ${formatBRL(
                        emp.saldo_devedor
                          ?? emp.quitacao
                          ?? emp.Quitacao
                          ?? 0
                      )}
                    </td>
                  </tr>
                `).join("")}
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
            <h3 style="font-size: 12px; font-weight: 900; color: #0f172a; border-bottom: 2px solid #db2777; padding-bottom: 6px; margin: 0 0 10px 0; text-transform: uppercase;">Cartões de Crédito Consignado - RMC / RCC</h3>
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

  const availableBeneficios = dados?.beneficios || [];

  const activeBenefit = availableBeneficios.length > 0
    ? availableBeneficios[Math.min(activeBenefitIndex, availableBeneficios.length - 1)]
    : dados;

  const getBenefitClientName = (benefit, index) => {
    const fullName = String(benefit?.cliente?.nome || "").trim();
    if (fullName) return fullName.split(/\s+/).slice(0, 2).join(" ");
    return benefit?.numero ? `NB ${benefit.numero}` : `Registro ${index + 1}`;
  };

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
  const formatDateBR = (dateValue) => {
    if (
      dateValue === null
      || dateValue === undefined
      || dateValue === ""
    ) {
      return "Não Informado";
    }

    try {
      const value = String(dateValue).trim();

      // Formato YYYYMM.
      // 202408 -> 08/2024
      if (/^\d{6}$/.test(value)) {
        const year = value.slice(0, 4);
        const month = value.slice(4, 6);

        if (
          Number(month) >= 1
          && Number(month) <= 12
        ) {
          return `${month}/${year}`;
        }
      }

      // Formato YYYYMMDD.
      // 20240815 -> 15/08/2024
      if (/^\d{8}$/.test(value)) {
        const year = value.slice(0, 4);
        const month = value.slice(4, 6);
        const day = value.slice(6, 8);

        if (
          Number(month) >= 1
          && Number(month) <= 12
          && Number(day) >= 1
          && Number(day) <= 31
        ) {
          return `${day}/${month}/${year}`;
        }
      }

      // Formato ISO YYYY-MM-DD
      // Também aceita timestamp começando por YYYY-MM-DD.
      const isoDate = value.match(
        /^(\d{4})-(\d{2})-(\d{2})/
      );

      if (isoDate) {
        return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;
      }

      return value;
    } catch {
      return String(dateValue);
    }
  };

  const firstFilledValue = (...values) => values.find((value) => (
    value !== null && value !== undefined && String(value).trim() !== ""
  ));

  const getLoanStartDate = (loan) => firstFilledValue(
    loan?.inicio_desconto,
    loan?.InicioDesconto,
    loan?.data_inicio,
    loan?.dataInicio,
    loan?.data_inicio_contrato,
    loan?.inicio,
    loan?.DataInicio
  );

  const getLoanEndDate = (loan) => firstFilledValue(
    loan?.final_desconto,
    loan?.FinalDesconto,
    loan?.data_final,
    loan?.dataFinal,
    loan?.data_fim,
    loan?.dataFim,
    loan?.fim,
    loan?.DataFinal
  );

  const formatBRL = (val) => {
    if (val === null || val === undefined || isNaN(Number(val))) return "R$ 0,00";
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val)).replace(/\s/g, " ");
  };

  const getSubLogo = (code, name) => {
    const extractBankCode = (value) => {
      const text = String(value || "").trim();
      const isolatedCode = text.match(/(?:^|\D)(\d{3})(?:\D|$)/)?.[1];

      if (isolatedCode) return isolatedCode;
      if (/^\d{1,3}$/.test(text)) return text.padStart(3, "0");
      return "";
    };

    const normalizeBankLogoName = (value) => String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/\b\d{3}\b/g, " ")
      .replace(
        /\b(BANCO|BANK|CONSIGNADO|CONSIGNADA|CONSIG|FINANCEIRA|CFI|S\.?A\.?|SA|LTDA|CREDITO|SOCIEDADE)\b/g,
        " "
      )
      .replace(/[^A-Z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    let cleanCode = extractBankCode(code) || extractBankCode(name);
    const upperName = String(name || "").toUpperCase().trim();

    if (!cleanCode && (upperName === "CEF" || upperName.includes("CEF"))) {
      cleanCode = "104";
    }

    /*
     * Fonte exclusiva: cadastro de Logos Secundárias.
     * As logos principais de /admin/banks continuam reservadas à animação.
     */
    const availableLogos = normalizeSecondaryLogos(subLogos)
      .map((logo) => ({
        name: logo.name,
        code:
          logo.codigo
          || logo.code
          || logo.bank_code
          || "",
        logo_url: logo.logo_url,
      }))
      .filter((logo) => logo.logo_url);

    if (cleanCode) {
      const matchByCode = availableLogos.find((logo) => (
        (extractBankCode(logo.code) || extractBankCode(logo.name)) === cleanCode
      ));

      if (matchByCode) return matchByCode.logo_url;
    }

    const aliasesByCode = {
      "001": ["BANCO DO BRASIL", "BRASIL"],
      "033": ["SANTANDER"],
      "041": ["BANRISUL"],
      "070": ["BRB", "BANCO DE BRASILIA"],
      "104": ["CAIXA", "CEF", "CAIXA ECONOMICA FEDERAL"],
      "121": ["AGIBANK"],
      "237": ["BRADESCO"],
      "254": ["PARANA BANCO", "PARANA"],
      "318": ["BMG"],
      "320": ["CCB BRASIL", "CCB"],
      "336": ["C6", "C6 BANK"],
      "341": ["ITAU", "ITAU UNIBANCO"],
      "386": ["NUBANK", "NU FINANCEIRA"],
      "389": ["MERCANTIL"],
      "422": ["SAFRA"],
      "465": ["CAPITAL CONSIG", "CAPITAL CONSIGNADO", "CAPITAL"],
      "623": ["PAN", "BANCO PAN"],
      "626": ["C6", "C6 BANK", "C6 CONSIGNADO", "BANCO FICSA"],
      "707": ["DAYCOVAL"],
      "739": ["CETELEM"],
      "748": ["SICREDI", "SICRED"],
      "756": ["SICOOB"],
      "925": ["BRB", "BRB CREDITO", "BANCO DE BRASILIA"],
    };

    const requestedNames = [
      BANK_NAME_BY_CODE[cleanCode],
      name,
      ...(aliasesByCode[cleanCode] || []),
    ]
      .map(normalizeBankLogoName)
      .filter(Boolean);

    const matchByName = availableLogos.find((logo) => {
      const candidateName = normalizeBankLogoName(logo.name);
      if (!candidateName) return false;

      return requestedNames.some((requestedName) => (
        candidateName === requestedName
        || (
          candidateName.length >= 2
          && requestedName.length >= 2
          && (
            candidateName.includes(requestedName)
            || requestedName.includes(candidateName)
          )
        )
      ));
    });

    return matchByName?.logo_url || null;
  };

  const isSiape = String(
    activeBenefit?.convenio || convenio || ""
  ).trim().toUpperCase() === "SIAPE";

  const isBenefitBlocked = activeBenefit?.beneficio?.bloqueado === true
    || String(activeBenefit?.beneficio?.bloqueio_emprestimo || "")
      .trim()
      .toLowerCase()
      .includes("sim");

  const getMarginData = () => {
    if (!activeBenefit) return null;

    const margens = activeBenefit.margens || {};
    const cliente = activeBenefit.cliente || {};

    if (isSiape) {
      const salarioBruto = Number(
        margens.salario_bruto ??
        margens.salario ??
        cliente.salario ??
        0
      );

      const valorLiquido = Number(
        margens.valor_liquido ?? 0
      );

      const descontos = Number(
        margens.descontos ?? 0
      );

      const margemDisponivel = Number(
        margens.margem_disponivel ??
        margens.margem_livre ??
        cliente.margem_livre ??
        0
      );

      const showMargem = Math.max(
        0,
        margemDisponivel
      );

      const coeficienteUtilizado = Number(
        cliente.coeficiente_utilizado ??
        margens.coeficiente_utilizado ??
        0
      );

      const valorBackend = Number(
        margens.valor_liberado_margem ??
        cliente.valor_liberado_margem ??
        0
      );

      const valorLiberadoMargem =
        valorBackend > 0
          ? valorBackend
          : coeficienteUtilizado > 0
            ? showMargem / coeficienteUtilizado
            : 0;

      return {
        isSiape: true,
        salario: salarioBruto,
        salarioBruto,
        valorLiquido,
        descontos,
        isLOAS: false,
        percent: 0,
        margemConsignavel: 0,
        totalComprometido: descontos,
        margemLivreReal: margemDisponivel,
        showMargem,
        valorLiberadoMargem,
        coeficienteUtilizado
      };
    }

    const salario = Number(
      margens.salario ||
      cliente.salario ||
      0
    );

    const especie = String(
      cliente.especie || ""
    );

    const isLOAS =
      especie.includes("87") ||
      especie.includes("88") ||
      cliente.especie === "87" ||
      cliente.especie === "88";

    const percent = isLOAS ? 0.35 : 0.40;

    const margemConsignavel = Number(
      margens.margem_emprestimo ||
      salario * percent
    );

    const totalComprometido = Number(
      margens.total_comprometido || 0
    );

    const margemLivreReal =
      margens.margem_livre !== undefined
        ? Number(margens.margem_livre)
        : margemConsignavel - totalComprometido;

    const showMargem = Math.max(
      0,
      margemLivreReal
    );

    const coeficienteUtilizado = Number(
      cliente.coeficiente_utilizado ||
      margens.coeficiente_utilizado ||
      0.02270
    );

    const valorLiberadoMargem = Number(
      margens.valor_liberado_margem ||
      (
        coeficienteUtilizado > 0
          ? showMargem / coeficienteUtilizado
          : 0
      )
    );

    return {
      isSiape: false,
      salario,
      salarioBruto: salario,
      valorLiquido: 0,
      descontos: 0,
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
        {isAdmin && (
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
                    disabled={loadingProvider || !providerConfigLoaded}
                    type="button"
                    onClick={() => handleProviderChange("promosys")}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${activeProvider === "promosys" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
                  >
                    PROMOSYS
                  </button>
                  <button
                    disabled={loadingProvider || !providerConfigLoaded}
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
                <p className="text-lg font-black">{creditos?.creditos !== null && creditos?.creditos !== undefined ? creditos?.creditos : "—"}</p>
              </div>
              <div className="flex-1 md:flex-initial px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-[9px] font-black uppercase text-blue-300 tracking-wider">Créditos Offline</p>
                <p className="text-lg font-black">{creditos?.creditos_offline !== null && creditos?.creditos_offline !== undefined ? creditos?.creditos_offline : "—"}</p>
              </div>
              <div className="flex-1 md:flex-initial px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-[9px] font-black uppercase text-blue-300 tracking-wider">Geração Leads</p>
                <p className="text-lg font-black">{creditos?.creditos_geracao_leads !== null && creditos?.creditos_geracao_leads !== undefined ? creditos?.creditos_geracao_leads : "—"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form Consulta */}
        <form onSubmit={handleConsultar} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col md:flex-row gap-4 items-end print:hidden">
          <div className="flex-1 space-y-2 w-full">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{searchType === "CNPJ" ? "CNPJ da Empresa" : "CPF do Cliente"}</label>
              {(convenio === "GOVERNO" || convenio === "CLT PRIVADO") && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => {setSearchType("CPF"); setCpf("");}} className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest transition-all ${searchType === "CPF" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>CPF</button>
                  <button type="button" onClick={() => {setSearchType("CNPJ"); setCpf("");}} className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest transition-all ${searchType === "CNPJ" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>CNPJ</button>
                </div>
              )}
            </div>
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(maskCpfCnpj(e.target.value))}
              placeholder={searchType === "CNPJ" ? "00.000.000/0000-00" : "000.000.000-00"}
              maxLength={searchType === "CNPJ" ? 18 : 14}
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
            disabled={
              loading ||
              !cpf ||
              !providerConfigLoaded ||
              !activeProvider
            }
            className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 w-full md:w-auto"
          >
            {loading ? <Icons.Loader2 className="animate-spin" /> : <><Icons.Search size={18} /> Consultar</>}
          </button>
        </form>

        {/* Histórico de Consultas */}
        {recentQueries.length > 0 && (
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 print:hidden mt-4 animate-in fade-in">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Icons.History className="text-blue-500 w-4 h-4" />
              Últimas Consultas
            </h3>
            {loadingHistory ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Icons.Loader2 className="w-4 h-4 animate-spin" /> Carregando histórico...
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {recentQueries.map((query) => (
                  <button
                    key={query.id}
                    type="button"
                    onClick={() => handleHistoryClick(query)}
                    className="px-4 py-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all text-left group"
                  >
                    <p className="text-xs font-black text-slate-700 group-hover:text-blue-700 uppercase">{query.nome || "DESCONHECIDO"}</p>
                    <p className="text-[10px] font-bold text-slate-500 group-hover:text-blue-500">{maskCpfCnpj(query.documento)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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

            {/* Dados do Empregador/Convênio */}
            {(() => {
              const emp = activeBenefit?.cliente?.empresa || dados?.cliente?.empresa || dados?.empresa_data;
              let razaoSocial = emp?.razao_social || dados?.razao_social || dados?.cliente?.razao_social;
              let cnpjEmpresa = emp?.cnpj || dados?.cnpj || dados?.cnpj_empresa || (dados?.is_cnpj_query ? dados?.cpf : "");
              const totalRegs = emp?.quantidade_funcionarios || dados?.quantidade_funcionarios || dados?.total_beneficios || (dados?.beneficios?.length || 0);

              if (isSiape) {
                if (!razaoSocial || razaoSocial === "Não Informada") {
                  razaoSocial = "GOVERNO FEDERAL";
                }
              } else if (!dados?.is_cnpj_query) {
                if (!razaoSocial || razaoSocial === "Não Informada") {
                  razaoSocial = "INSTITUTO NACIONAL DO SEGURO SOCIAL (INSS)";
                }
                if (!cnpjEmpresa || cnpjEmpresa === "Não Informado") {
                  cnpjEmpresa = "29.979.036/0001-40";
                }
              }

              if (!razaoSocial && !cnpjEmpresa && !totalRegs && !dados?.is_cnpj_query) return null;

              return (
                <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 print-no-break mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                      <Icons.Briefcase size={20} className="text-indigo-500" />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Dados do Empregador</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Razão Social</p>
                      <p className="text-sm font-black text-slate-800 uppercase">{razaoSocial || "Não Informada"}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CNPJ do Empregador</p>
                      <p className="text-sm font-black text-slate-800">{cnpjEmpresa ? maskCpfCnpj(cnpjEmpresa) : "Não Informado"}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Registros (Funcionários)</p>
                      <p className="text-sm font-black text-slate-800">{totalRegs || 0}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Seletor exibido somente quando existem múltiplos benefícios */}
            {(dados.beneficios && dados.beneficios.length > 1) ? (
              <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-xl mb-6 print:hidden">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="bg-emerald-100 text-emerald-700 font-black px-3 py-1.5 rounded-full text-xs uppercase tracking-widest">
                    {dados.is_cnpj_query ? "Servidor" : "Benefício"} {availableBeneficios.length > 0 ? activeBenefitIndex + 1 : 0} de {availableBeneficios.length}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setActiveBenefitIndex((prev) => Math.max(0, prev - 1))} disabled={activeBenefitIndex === 0 || availableBeneficios.length === 0} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-all text-slate-700" aria-label="Benefício anterior">
                      <Icons.ChevronLeft size={20} />
                    </button>
                    <button onClick={() => setActiveBenefitIndex((prev) => Math.min(availableBeneficios.length - 1, prev + 1))} disabled={activeBenefitIndex >= availableBeneficios.length - 1 || availableBeneficios.length === 0} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-all text-slate-700" aria-label="Próximo benefício">
                      <Icons.ChevronRight size={20} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 pt-2 border-t border-slate-100 scrollbar-thin">
                  {availableBeneficios.map((benefit, index) => (
                    <button
                      key={benefit?.cliente?.beneficio || benefit?.numero || index}
                      type="button"
                      onClick={() => setActiveBenefitIndex(index)}
                      className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
                        activeBenefitIndex === index
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      <Icons.User size={14} />
                      <span className="text-xs font-black uppercase tracking-wide">{getBenefitClientName(benefit, index)}</span>
                      <span className="text-[10px] font-bold opacity-80">NB {benefit.cliente?.beneficio || benefit.numero || "Não informado"}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Grid 1: Dados Pessoais (Cabeçalho Premium) e Dados do Benefício/Trabalho */}
            {/* RESUMO_FINANCEIRO_SUPERIOR */}
            <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-6 md:p-7 print-no-break">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <Icons.TrendingUp size={20} />
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                    Resumo Financeiro
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Margens e disponibilidade
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                <div className="flex items-center gap-3 bg-slate-50 rounded-2xl border border-slate-100 p-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0"><Icons.Wallet size={20} /></div>
                  <div className="min-w-0"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight">Salário do Benefício</p><p className="text-sm md:text-base font-black text-slate-800 mt-1 whitespace-nowrap">{formatBRL(marginInfo.salario)}</p></div>
                </div>
                <div className="flex items-center gap-3 bg-blue-50/60 rounded-2xl border border-blue-100 p-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Icons.BarChartUp size={20} /></div>
                  <div className="min-w-0"><p className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-tight">Margem Consignável</p><p className="text-sm md:text-base font-black text-blue-700 mt-1 whitespace-nowrap">{formatBRL(marginInfo.margemConsignavel)}</p></div>
                </div>
                <div className="flex items-center gap-3 bg-amber-50/60 rounded-2xl border border-amber-100 p-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0"><Icons.Activity size={20} /></div>
                  <div className="min-w-0"><p className="text-[9px] font-black text-amber-600 uppercase tracking-widest leading-tight">Total Comprometido</p><p className="text-sm md:text-base font-black text-amber-700 mt-1 whitespace-nowrap">{formatBRL(marginInfo.totalComprometido)}</p></div>
                </div>
                <div className={`flex items-center gap-3 rounded-2xl border p-4 ${marginInfo.margemLivreReal < 0 ? "bg-red-50/60 border-red-100" : "bg-emerald-50/60 border-emerald-100"}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${marginInfo.margemLivreReal < 0 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}><Icons.ShieldCheck size={20} /></div>
                  <div className="min-w-0"><p className={`text-[9px] font-black uppercase tracking-widest leading-tight ${marginInfo.margemLivreReal < 0 ? "text-red-500" : "text-emerald-600"}`}>Margem Disponível</p><p className={`text-sm md:text-base font-black mt-1 whitespace-nowrap ${marginInfo.margemLivreReal < 0 ? "text-red-700" : "text-emerald-700"}`}>{formatBRL(marginInfo.margemLivreReal)}</p></div>
                </div>
                <div className="flex items-center gap-3 bg-emerald-50 rounded-2xl border border-emerald-200 p-4 sm:col-span-2 xl:col-span-1">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><Icons.Banknote size={20} /></div>
                  <div className="min-w-0"><p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-tight">Valor Liberado</p><p className="text-sm md:text-base font-black text-emerald-700 mt-1 whitespace-nowrap">{formatBRL(marginInfo.valorLiberadoMargem)}</p></div>
                </div>
              </div>
            </div>

            <div className={`grid grid-cols-1 gap-6 ${
              convenio === "GOVERNO" || convenio === "CLT PRIVADO"
                ? "md:grid-cols-2 print:grid-cols-2"
                : "xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] print:grid-cols-[5fr_7fr]"
            } print:gap-4`}>

              {/* Dados do Cliente */}
              <div className="bg-white p-6 md:p-7 rounded-[2rem] shadow-xl border border-slate-100 print-no-break relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-10 -mt-10 pointer-events-none" />
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                    <Icons.User size={20} />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Dados do Cliente</h3>
                </div>

                <div className="space-y-3.5 print:space-y-2">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-start gap-3 min-w-0">
                    <UserIcon className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <div className="min-w-0 w-full">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nome Completo</p>
                      <p className="text-sm font-black text-slate-800 uppercase whitespace-nowrap overflow-hidden text-ellipsis print:text-xs">{activeBenefit.cliente?.nome || "Não Informado"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 print:grid-cols-2 print:gap-2">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-start gap-3">
                      <CpfIcon className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CPF</p>
                        <p className="text-sm font-black text-slate-800 print:text-xs">{activeBenefit.cliente?.cpf ? maskCpfCnpj(activeBenefit.cliente.cpf) : "Não Informado"}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-start gap-3">
                      <CalendarIcon className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data de Nascimento</p>
                        <p className="text-sm font-black text-slate-800 uppercase print:text-xs">
                          {activeBenefit.cliente?.data_nascimento ? formatDateBR(activeBenefit.cliente.data_nascimento) : "Não Informada"}
                          {activeBenefit.cliente?.idade ? ` (${activeBenefit.cliente.idade} anos)` : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  {(convenio === "GOVERNO" || convenio === "CLT PRIVADO") && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 print:grid-cols-3 print:gap-2">
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">RG</p><p className="text-xs font-black text-slate-800 uppercase">{activeBenefit.cliente?.rg || "Não Informado"}</p></div>
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Título de Eleitor</p><p className="text-xs font-black text-slate-800 uppercase">{activeBenefit.cliente?.titulo_eleitor || "Não Informado"}</p></div>
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sexo</p><p className="text-xs font-black text-slate-800 uppercase">{activeBenefit.cliente?.sexo || "Não Informado"}</p></div>
                    </div>
                  )}

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-start gap-3 min-w-0">
                    <FiliaçãoIcon className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                    <div className="min-w-0 w-full">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nome da Mãe</p>
                      <p className="text-sm font-black text-slate-800 uppercase whitespace-nowrap overflow-hidden text-ellipsis print:text-xs">{activeBenefit.cliente?.filiacao || activeBenefit.cliente?.nome_mae || "Não Informada"}</p>
                    </div>
                  </div>

                  {(convenio === "GOVERNO" || convenio === "CLT PRIVADO") && activeBenefit.cliente?.nome_pai && (
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-start gap-3">
                      <FiliaçãoIcon className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nome do Pai</p><p className="text-sm font-black text-slate-800 uppercase">{activeBenefit.cliente.nome_pai}</p></div>
                    </div>
                  )}

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-start gap-3 min-w-0">
                    <MapPinIcon className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="min-w-0 w-full">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Endereço</p>
                      <p className="text-xs font-bold text-slate-700 uppercase leading-relaxed break-words">{activeBenefit.cliente?.endereco || "Não Informado"}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-start gap-3">
                    <PhoneIcon className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                    <div className="min-w-0 w-full">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Telefone</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(() => {
                          const telefonesList = activeBenefit.telefones?.length ? activeBenefit.telefones : (dados.telefones?.length ? dados.telefones : (activeBenefit.cliente?.telefones?.length ? activeBenefit.cliente.telefones : (dados.cliente?.telefones?.length ? dados.cliente.telefones : [])));
                          if (telefonesList.length > 0) {
                            return telefonesList.map((telefone, index) => (
                              <a key={`${telefone}-${index}`} href={`https://wa.me/${String(telefone).replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black transition-all border border-emerald-100 print:bg-transparent print:border-none print:p-0 print:text-slate-800 print:text-xs">
                                <Icons.MessageCircle size={10} className="text-emerald-500 print:hidden" />
                                <span>{formatPhone(telefone)}</span>
                              </a>
                            ));
                          }
                          return <span className="text-xs font-bold text-slate-400">Nenhum</span>;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {(convenio === "GOVERNO" || convenio === "CLT PRIVADO") && (
                <div className="flex flex-col h-full bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 print-no-break">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 print:bg-slate-50 print:text-teal-700 print:border-slate-200">
                      <Icons.Briefcase size={20} />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                      {convenio === "GOVERNO" ? "Informações do Servidor" : "Informações Trabalhistas"}
                    </h3>
                  </div>

                  <div className="space-y-4 print:space-y-2 flex-grow">
                    <div className="grid grid-cols-2 gap-4 print:gap-2">
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data de Admissão</p>
                        <p className="text-sm font-black text-slate-800 uppercase mt-1">{activeBenefit.cliente?.data_admissao ? formatDateBR(activeBenefit.cliente.data_admissao) : "Não Informada"}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Data de Desligamento</p>
                        <p className="text-sm font-black text-slate-800 uppercase mt-1">{activeBenefit.cliente?.data_desligamento ? formatDateBR(activeBenefit.cliente.data_desligamento) : "Não Informado"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 print:gap-2">
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tempo de Contribuição</p>
                        <p className="text-sm font-black text-slate-800 uppercase mt-1">
                          {activeBenefit.cliente?.tempo_contribuicao_meses ? `${activeBenefit.cliente.tempo_contribuicao_meses} meses` : "Não Informado"}
                        </p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Situação</p>
                        <p className="text-sm font-black text-slate-800 uppercase mt-1">{activeBenefit.cliente?.situacao_trabalhista || "Não Informada"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 print:gap-2 mt-auto">
                      <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-2xl border border-emerald-100">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Renda</p>
                        <p className="text-xl font-black text-emerald-700 uppercase mt-1">
                          {formatBRL(activeBenefit.cliente?.salario || 0)}
                        </p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Saldo Aproximado</p>
                        <p className="text-xl font-black text-blue-700 uppercase mt-1">
                          {formatBRL(activeBenefit.cliente?.saldo_aproximado || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dados do Benefício e Pagamento unificados */}
              {!(convenio === "GOVERNO" || convenio === "CLT PRIVADO") && (
                <div className="bg-white p-6 md:p-7 rounded-[2rem] shadow-xl border border-slate-100 print-no-break relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-10 -mt-10 pointer-events-none" />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <Icons.CreditCard size={20} />
                      </div>
                      <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                        Dados do Benefício
                      </h3>
                    </div>

                    <div className={`inline-flex self-start sm:self-auto items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm ${
                      isBenefitBlocked
                        ? "bg-red-50 border-red-200 text-red-600"
                        : "bg-emerald-50 border-emerald-200 text-emerald-600"
                    }`}>
                      {isBenefitBlocked ? <LockPremiumIcon className="w-3.5 h-3.5" /> : <UnlockPremiumIcon className="w-3.5 h-3.5" />}
                      <span className="text-[9px] font-black uppercase tracking-wider">{isBenefitBlocked ? "Bloqueado" : "Liberado"}</span>
                    </div>
                  </div>

                  <div className="space-y-3.5 print:space-y-2">
                    {isSiape ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 print:grid-cols-2 print:gap-2">
                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Matrícula</p><p className="text-sm font-black text-amber-600 mt-1">{activeBenefit.beneficio?.matricula || activeBenefit.cliente?.beneficio || activeBenefit.numero || "Não Informada"}</p></div>
                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Regime Jurídico</p><p className="text-sm font-black text-slate-800 uppercase mt-1">{activeBenefit.beneficio?.regime_juridico || "Não Informado"}</p></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 print:grid-cols-2 print:gap-2">
                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Órgão</p><p className="text-sm font-black text-slate-800 uppercase mt-1">{activeBenefit.beneficio?.orgao || "Não Informado"}</p></div>
                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Instituto</p><p className="text-sm font-black text-slate-800 uppercase mt-1">{activeBenefit.beneficio?.instituto || "Não Informado"}</p></div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] gap-3.5 print:grid-cols-2 print:gap-2">
                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Número do Benefício (NB)</p><p className="text-sm font-black text-blue-600 mt-1">{activeBenefit.cliente?.beneficio || activeBenefit.numero || "Não Informado"}</p></div>
                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Situação</p><span className={`inline-flex mt-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${String(activeBenefit.beneficio?.situacao || "").toUpperCase() === "ATIVO" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"}`}>{activeBenefit.beneficio?.situacao || "Desconhecida"}</span></div>
                        </div>

                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Espécie / Benefício</p>
                          <p className="text-sm font-black text-slate-800 uppercase mt-1 break-words">{activeBenefit.cliente?.especie || activeBenefit.beneficio?.especie || "Não Informada"}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 print:grid-cols-4 print:gap-2">
                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Concessão</p><p className="text-sm font-black text-slate-800 mt-1">{activeBenefit.beneficio?.ddb ? formatDateBR(activeBenefit.beneficio.ddb) : "Não Informada"}</p></div>
                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">UF</p><p className="text-sm font-black text-slate-800 uppercase mt-1">{activeBenefit.beneficio?.uf || "Não Informada"}</p></div>
                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor do Benefício</p><p className="text-sm font-black text-emerald-700 mt-1">{formatBRL(marginInfo.salario)}</p></div>
                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Meio de Pagamento</p><p className="text-xs font-black text-slate-800 uppercase mt-1">{activeBenefit.banco_pagador?.tipo_pagamento || (isCartaoMagnetico(activeBenefit) ? "Cartão Magnético" : "Conta Corrente")}</p></div>
                        </div>
                      </>
                    )}

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(90px,0.55fr)_minmax(120px,0.7fr)] gap-4 items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-16 h-14 rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                          <BankLogo src={getSubLogo(activeBenefit.banco_pagador?.codigo, activeBenefit.banco_pagador?.nome)} alt={activeBenefit.banco_pagador?.nome || "Banco pagador"} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Banco</p><p className="text-sm font-black text-slate-800 uppercase leading-tight break-words mt-1">{formatBankName(activeBenefit.banco_pagador?.codigo, activeBenefit.banco_pagador?.nome) || "Não Informado"}</p></div>
                      </div>
                      <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Agência</p><p className="text-sm font-black text-slate-800 mt-1">{activeBenefit.banco_pagador?.agencia || "Não Informada"}</p></div>
                      <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Conta</p><p className="text-sm font-black text-slate-800 mt-1 break-all">{activeBenefit.banco_pagador?.conta || (isCartaoMagnetico(activeBenefit) ? "Cartão" : "Não Informada")}</p></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Resumo Financeiro, Empréstimos e Cartões (Ocultar para GOVERNO e CLT PRIVADO) */}
            {!(convenio === "GOVERNO" || convenio === "CLT PRIVADO") && (
              <>
                {/* Resumo Financeiro (Margens Inteligentes) */}
            <div className="bg-white p-6 md:p-7 rounded-[2rem] shadow-xl border border-slate-100 print-no-break">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 print:bg-slate-50 print:text-orange-700 print:border-slate-200">
                    <Icons.Landmark size={20} />
                  </div>

                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                    Empréstimos Consignados Ativos
                  </h3>
                </div>

                <div className="inline-flex self-start sm:self-auto items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-50 border border-orange-100">
                  <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">
                    Total Contratos
                  </span>
                  <span className="text-sm font-black text-orange-700">
                    {activeBenefit.emprestimos?.length || 0}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                {activeBenefit.emprestimos && activeBenefit.emprestimos.length > 0 ? (
                  activeBenefit.emprestimos.map((emp, idx) => {
                    const logoUrl = getSubLogo(emp.codigo, emp.banco);

                    const showC6Refin = isC6RefinLoan(emp);
                    const c6RefinKey = getC6RefinKey(emp);
                    const c6RefinResult = c6RefinByContract[c6RefinKey];
                    const isC6RefinLoading = Boolean(
                      c6RefinLoading[c6RefinKey]
                    );
                    const isC6RefinOpen = Boolean(
                      c6RefinOpen[c6RefinKey]
                    );

                    const c6RefinConditions = (
                      Array.isArray(
                        c6RefinResult?.condicoes
                      )
                      && c6RefinResult.condicoes.length > 0
                    )
                      ? c6RefinResult.condicoes
                      : (
                          c6RefinResult?.success
                            ? [c6RefinResult]
                            : []
                        );

                    const requestedC6Index = Number(
                      c6RefinSelectedByContract[
                        c6RefinKey
                      ] ?? 0
                    );

                    const c6RefinSelectedIndex = (
                      Number.isInteger(
                        requestedC6Index
                      )
                      && requestedC6Index >= 0
                      && requestedC6Index
                        < c6RefinConditions.length
                    )
                      ? requestedC6Index
                      : 0;

                    const c6RefinDisplay = (
                      c6RefinConditions[
                        c6RefinSelectedIndex
                      ]
                      || c6RefinResult
                    );

                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-md transition-all px-4 py-3.5 print-no-break"
                      >
                        <div className="flex flex-col xl:flex-row xl:items-center gap-4">
                          <div className="flex items-center gap-3 min-w-0 xl:w-[245px] xl:flex-shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center relative">
                              <BankLogo src={logoUrl} alt={emp.banco || formatBankName(emp.codigo, emp.banco)} />
                            </div>

                            <div className="min-w-0">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                Banco
                              </p>

                              <p className="text-sm font-black text-slate-800 uppercase truncate">
                                {formatBankName(emp.codigo, emp.banco)}
                              </p>

                              <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5">
                                Contrato: {emp.contrato}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-x-4 gap-y-3 flex-1 min-w-0">
                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                Valor Contrato
                              </p>
                              <p className="text-xs font-black text-slate-800 mt-0.5 whitespace-nowrap">
                                {formatBRL(Math.abs(Number(emp.valor_contrato || 0)))}
                              </p>
                            </div>

                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                Data Início
                              </p>
                              <p className="text-xs font-black text-slate-800 mt-0.5 whitespace-nowrap">
                                {formatDateBR(getLoanStartDate(emp))}
                              </p>
                            </div>

                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                Data Final
                              </p>
                              <p className="text-xs font-black text-slate-800 mt-0.5 whitespace-nowrap">
                                {formatDateBR(getLoanEndDate(emp))}
                              </p>
                            </div>

                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                Parcela
                              </p>
                              <p className="text-xs font-black text-slate-800 mt-0.5 whitespace-nowrap">
                                {formatBRL(emp.parcela)}
                              </p>
                            </div>

                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                Taxa
                              </p>
                              <p className="text-xs font-black text-emerald-600 mt-0.5 whitespace-nowrap">
                                {Number(emp.taxa || 0).toFixed(2)}%
                                <span className="text-slate-400 text-[9px] font-bold"> a.m.</span>
                              </p>
                            </div>

                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                Prazo Restante
                              </p>
                              <p className="text-sm text-slate-800 font-bold mt-0.5 whitespace-nowrap">
                                <span className="text-slate-900 font-black">
                                  {emp.prazo_restante}
                                </span>{" "}
                                <span className="text-slate-400 font-medium">
                                  de {emp.prazo}
                                </span>
                              </p>
                            </div>

                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                Saldo Devedor
                              </p>
                              <p className="text-xs font-black text-blue-600 mt-0.5 whitespace-nowrap">
                                {formatBRL(Math.abs(Number(emp.saldo_devedor || emp.quitacao || 0)))}
                              </p>
                            </div>
                          </div>
                        </div>

                        {showC6Refin && (
                          <div
                            className="mt-3 pt-3 border-t border-slate-200 print:hidden"
                            data-html2canvas-ignore="true"
                            data-c6-refin-compact="true"
                          >
                            <button
                              type="button"
                              onClick={() => handleC6Refin(emp)}
                              disabled={isC6RefinLoading}
                              className={`w-full flex items-center justify-between gap-4 rounded-xl px-3.5 py-3 border transition-all ${
                                isC6RefinLoading
                                  ? "bg-slate-50 border-slate-200 cursor-wait"
                                  : c6RefinResult?.success
                                    ? "bg-emerald-50/40 border-emerald-100 hover:bg-emerald-50/70"
                                    : "bg-slate-50/70 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <C6BankLogo className="w-8 h-8 flex-shrink-0" />

                                <div className="text-left min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-[11px] font-black text-slate-800">
                                      Refinanciamento C6
                                    </p>

                                    {c6RefinResult?.success && (
                                      <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-emerald-700">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        {"Dispon\u00edvel"}
                                      </span>
                                    )}
                                  </div>

                                  {isC6RefinLoading ? (
                                    <p className="text-[10px] font-semibold text-blue-600 mt-0.5">
                                      Consultando condi\u00e7\u00f5es...
                                    </p>
                                  ) : c6RefinResult?.success ? (
                                    <p className="text-[10px] font-bold text-slate-500 mt-0.5 truncate">
                                      <span className="font-black text-emerald-700">
                                        {formatBRL(
                                          Number(
                                            c6RefinDisplay.valor_liberado
                                              || c6RefinDisplay.valor_cliente
                                              || 0
                                          )
                                        )}
                                      </span>
                                      {" liberado \u2022 "}
                                      {Number(c6RefinDisplay.prazo || 0)}x
                                      {" \u2022 "}
                                      {formatC6Rate(c6RefinDisplay.taxa)} a.m.
                                    </p>
                                  ) : (
                                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                                      {"Consulte as condi\u00e7\u00f5es dispon\u00edveis para este contrato"}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span
                                  className={`text-[9px] font-black uppercase tracking-wider ${
                                    c6RefinResult?.success
                                      ? "text-emerald-700"
                                      : "text-blue-600"
                                  }`}
                                >
                                  {isC6RefinLoading
                                    ? "Consultando"
                                    : c6RefinResult?.success
                                      ? (
                                          isC6RefinOpen
                                            ? "Ocultar"
                                            : "Detalhes"
                                        )
                                      : c6RefinResult
                                        ? "Consultar novamente"
                                        : "Consultar"}
                                </span>

                                {c6RefinResult?.success && (
                                  <span
                                    className={`text-[10px] text-slate-400 transition-transform ${
                                      isC6RefinOpen
                                        ? "rotate-180"
                                        : ""
                                    }`}
                                  >
                                    {"\u25BC"}
                                  </span>
                                )}
                              </div>
                            </button>

                            {isC6RefinOpen && (
                              <div className="mt-2">
                                {isC6RefinLoading ? (
                                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-4 h-4 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />

                                      <p className="text-[10px] font-bold text-blue-700">
                                        Consultando Refin C6...
                                      </p>
                                    </div>
                                  </div>
                                ) : c6RefinResult?.success ? (
                                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                                    {c6RefinConditions.length > 1 ? (
                                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
                                        <div>
                                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                            {c6RefinConditions.length} {"TABELAS DISPON\u00cdVEIS"}
                                          </p>

                                          <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                                            {"Selecione a condi\u00e7\u00e3o que deseja visualizar"}
                                          </p>
                                        </div>

                                        <select
                                          value={c6RefinSelectedIndex}
                                          onChange={(event) => {
                                            setC6RefinSelectedByContract(
                                              (prev) => ({
                                                ...prev,
                                                [c6RefinKey]: Number(
                                                  event.target.value
                                                ),
                                              })
                                            );
                                          }}
                                          className="w-full sm:w-auto sm:min-w-[300px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                                        >
                                          {c6RefinConditions.map(
                                            (
                                              condition,
                                              conditionIndex
                                            ) => (
                                              <option
                                                key={`${
                                                  condition.tabela_codigo
                                                    || "c6"
                                                }-${conditionIndex}`}
                                                value={conditionIndex}
                                              >
                                                {condition.tabela
                                                  || `Tabela ${
                                                    conditionIndex + 1
                                                  }`}
                                              </option>
                                            )
                                          )}
                                        </select>
                                      </div>
                                    ) : (
                                      <div className="pb-3 border-b border-slate-100">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                          Tabela
                                        </p>

                                        <p className="text-[10px] font-black text-slate-700 mt-1">
                                          {c6RefinDisplay.tabela
                                            || "Refinanciamento C6"}
                                        </p>
                                      </div>
                                    )}

                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-3">
                                      <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                                        <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">
                                          Valor Liberado
                                        </p>

                                        <p className="text-sm font-black text-emerald-700 mt-1">
                                          {formatBRL(
                                            Number(
                                              c6RefinDisplay.valor_liberado
                                                || c6RefinDisplay.valor_cliente
                                                || 0
                                            )
                                          )}
                                        </p>
                                      </div>

                                      <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                                        <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">
                                          Parcela
                                        </p>

                                        <p className="text-sm font-black text-slate-700 mt-1">
                                          {formatBRL(
                                            Number(
                                              c6RefinDisplay.parcela
                                                || 0
                                            )
                                          )}
                                        </p>
                                      </div>

                                      <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                                        <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">
                                          Prazo
                                        </p>

                                        <p className="text-sm font-black text-slate-700 mt-1">
                                          {Number(
                                            c6RefinDisplay.prazo
                                              || 0
                                          )}x
                                        </p>
                                      </div>

                                      <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                                        <p className="text-[7px] font-black uppercase tracking-widest text-slate-400">
                                          Taxa
                                        </p>

                                        <p className="text-sm font-black text-emerald-700 mt-1">
                                          {formatC6Rate(
                                            c6RefinDisplay.taxa
                                          )} a.m.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ) : c6RefinResult ? (
                                  <div className="rounded-xl border border-red-100 bg-red-50/60 px-4 py-3">
                                    <p className="text-[9px] font-black text-red-700 uppercase">
                                      {"Refin C6 indispon\u00edvel"}
                                    </p>

                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        )}
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
            {isSiape ? (
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 print-no-break">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                    <Icons.CreditCard size={20} />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                    Margens de Cartão Disponíveis
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      key: "RMC",
                      title: "Reserva de Margem Consignável",
                      value: Number(activeBenefit.margens_cartao?.rmc_disponivel || 0)
                    },
                    {
                      key: "RCC",
                      title: "Reserva de Cartão Consignado",
                      value: Number(activeBenefit.margens_cartao?.rcc_disponivel || 0)
                    }
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="p-5 rounded-2xl border border-amber-100 bg-amber-50/40"
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest">
                          {item.key}
                        </span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Informativo
                        </span>
                      </div>

                      <p className="text-xs font-black text-slate-700 uppercase mb-2">
                        {item.title}
                      </p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Margem disponível
                      </p>
                      <p className="text-xl font-black text-emerald-700 mt-1">
                        {formatBRL(item.value)}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-[10px] font-bold text-slate-400 leading-relaxed">
                  As margens RMC e RCC são apenas informativas. Elas não representam cartões ativos,
                  contratos ou operações disponíveis para portabilidade.
                </p>
              </div>
            ) : (
            <div className="bg-white p-6 md:p-7 rounded-[2rem] shadow-xl border border-slate-100 print-no-break">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center border border-pink-100"><Icons.CreditCard size={20} /></div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Cartões de Crédito Consignado - RMC / RCC</h3>
                </div>
                <div className="inline-flex self-start sm:self-auto items-center gap-2 px-3.5 py-2 rounded-xl bg-pink-50 border border-pink-100">
                  <span className="text-[9px] font-black text-pink-500 uppercase tracking-widest">Total Cartões</span>
                  <span className="text-sm font-black text-pink-700">{activeBenefit.cartoes?.length || 0}</span>
                </div>
              </div>

              <div className="space-y-3.5">
                {activeBenefit.cartoes && activeBenefit.cartoes.length > 0 ? (
                  activeBenefit.cartoes.map((cartao, idx) => {
                    const logoUrl = getSubLogo(cartao.codigo, cartao.banco);
                    return (
                      <div key={idx} className="p-5 rounded-2xl border border-slate-150 bg-slate-50/60 hover:bg-slate-50 hover:shadow-md transition-all flex flex-col md:flex-row gap-4 justify-between items-start md:items-center print-no-break">
                        <div className="flex items-center gap-3.5 min-w-0 pr-4 w-full md:w-80 print:w-96">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center relative">
                            <BankLogo src={logoUrl} alt={cartao.banco || formatBankName(cartao.codigo, cartao.banco)} />
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
            )}

            </>
            )}

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
