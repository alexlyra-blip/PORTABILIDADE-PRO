"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { api, getStaticUrl } from "@/utils/api";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { inssBanks } from "@/utils/constants";
import { useToast } from "@/components/ToastProvider";

import { Icons } from "@/components/Icons";

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

function SimuladorPageContent() {
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [dbBanks, setDbBanks] = useState([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [subLogos, setSubLogos] = useState([]);
  const [logoIdx, setLogoIdx] = useState(0);
  const [banksForAnim, setBanksForAnim] = useState([]);
  const [cpfStatus, setCpfStatus] = useState(null); // 'valid', 'invalid', or null
  const [bankSearch, setBankSearch] = useState("");
  const [speciesSearch, setSpeciesSearch] = useState("");
  const [agreementSearch, setAgreementSearch] = useState("");
  const [subAgreementSearch, setSubAgreementSearch] = useState("");
  const norm = s => {
    if (!s) return "";
    let clean = s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    // Replace any Unicode corruptions or wildcards
    clean = clean.replace(/ITA[\uFFFD\?]/g, "ITAU").replace(/OL[\uFFFD\?]/g, "OLE").replace(/PARAN[\uFFFD\?]/g, "PARANA");
    return clean;
  };

  const formatBRL = (val) => {
    if (val === null || val === undefined || isNaN(Number(val))) return "R$ 0,00";
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val)).replace(/\s/g, " ");
  };

  const getAgreementLogoUrl = (agreement) => {
    if (!agreement) return null;
    const logoObj = (subLogos || []).find(l => {
      const n = norm(l.name);
      return n && (n === norm(agreement) || n === "INSS" && norm(agreement) === "INSS");
    });
    return logoObj?.logo_url ? getStaticUrl(logoObj.logo_url) : null;
  };

  const getSubAgreementLogoUrl = (subAgreement, agreement) => {
    if (!subAgreement) return null;
    const logoObj = (subLogos || []).find(l => {
      const nL = norm(l.name);
      const nS = norm(subAgreement);

      // Exact match
      if (nL === nS) return true;

      // Suffix match (e.g. for SIAPE "01- ATIVO" and "SIAPE - ATIVO")
      if ((nS.endsWith("ATIVO") && nL.endsWith("ATIVO")) ||
          (nS.endsWith("APOSENTADO") && nL.endsWith("APOSENTADO")) ||
          (nS.endsWith("PENSIONISTA") && nL.endsWith("PENSIONISTA"))) {
        return true;
      }

      // Prefix/abbreviation match for states under GOVERNOS (e.g., l.name is "SP", subAgreement is "SP - SÃO PAULO")
      if (agreement === "GOVERNOS") {
        const stateCode = subAgreement.split(" - ")[0].trim();
        if (nL === norm(stateCode)) return true;
      }

      return false;
    });
    return logoObj?.logo_url ? getStaticUrl(logoObj.logo_url) : null;
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

  // Mock de logos caso o DB esteja vazio
  const defaultLogos = [
    "https://logouol.com/itau/itau-logo.png",
    "https://logos-world.net/wp-content/uploads/2021/02/PicPay-Logo.png",
    "https://logodownload.org/wp-content/uploads/2019/08/c6-bank-logo.png",
    "https://logodownload.org/wp-content/uploads/2018/07/banco-pan-logo.png"
  ];

  const [formData, setFormData] = useState({
    nome_cliente: "",
    cpf: "",
    idade: "",
    agreement: "",
    sub_agreement: "",
    benefit_species: "",
    analfabeto: "nao",
    is_60_plus: false,
    data_concessao: ""
  });

  const [contracts, setContracts] = useState([{
    id: 1, banco: "", parcela: "", saldoDevedor: "", prazoTotal: "", prazoRestante: "", parcelasPagas: "", taxaAtual: "", taxaAjustada: ""
  }]);
  const [possuiDoisCartoes, setPossuiDoisCartoes] = useState("nao");
  const [valorMargemNegativa, setValorMargemNegativa] = useState("R$ 81,05");
  const [activeContractIndex, setActiveContractIndex] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState({});
  const [subDropdownOpen, setSubDropdownOpen] = useState(false);

  const [extractModalOpen, setExtractModalOpen] = useState(false);
  const [extractLoading, setExtractLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [selectedExtractLoanIndices, setSelectedExtractLoanIndices] = useState([]);

  // Novos estados para o Modal CPF
  const [cpfModalOpen, setCpfModalOpen] = useState(false);
  const [cpfData, setCpfData] = useState(null);
  const [selectedCpfLoanIndices, setSelectedCpfLoanIndices] = useState([]);
  const [activeBenefitIndex, setActiveBenefitIndex] = useState(0);

  // Normaliza os diferentes formatos que podem ser retornados pela API.
  const beneficiosCpf = (() => {
    if (!cpfData) {
      return [];
    }

    /*
     * A resposta multi-benefício possui também dados do primeiro
     * benefício na raiz. Por isso, precisamos priorizar explicitamente
     * o array "beneficios" antes de considerar o objeto raiz.
     */
    const listasPossiveis = [
      cpfData?.beneficios,
      cpfData?.data?.beneficios,
      cpfData?.resultado?.beneficios,
      cpfData?.response?.beneficios,
    ];

    let listaEncontrada = listasPossiveis.find(
      (lista) => Array.isArray(lista) && lista.length > 0
    );

    if (!listaEncontrada && cpfData?.beneficio_principal) {
      listaEncontrada = [
        cpfData.beneficio_principal,
        ...(Array.isArray(cpfData?.beneficios_adicionais)
          ? cpfData.beneficios_adicionais
          : []),
      ];
    }

    if (!Array.isArray(listaEncontrada) || listaEncontrada.length === 0) {
      listaEncontrada = [cpfData];
    }

    const obterNumeroBeneficio = (item) => {
      const numero =
        item?.numero ??
        item?.numero_beneficio ??
        item?.nb ??
        item?.cliente?.beneficio ??
        item?.cliente?.numero_beneficio ??
        item?.cliente?.nb ??
        item?.beneficio?.numero ??
        item?.beneficio?.numero_beneficio ??
        item?.beneficio?.nb ??
        "";

      return String(numero || "").replace(/\D/g, "");
    };

    /*
     * Remove apenas duplicidades reais de NB.
     * Benefícios diferentes permanecem disponíveis nas abas.
     */
    const beneficiosUnicos = [];
    const numerosVistos = new Set();

    listaEncontrada.forEach((beneficioItem, idx) => {
      if (!beneficioItem || typeof beneficioItem !== "object") {
        return;
      }

      const numero = obterNumeroBeneficio(beneficioItem);
      const chave = numero || `beneficio-sem-numero-${idx}`;

      if (numerosVistos.has(chave)) {
        return;
      }

      numerosVistos.add(chave);
      beneficiosUnicos.push(beneficioItem);
    });

    return beneficiosUnicos;
  })();

  const totalBeneficiosInformado =
    Number(
      cpfData?.total_beneficios ??
      cpfData?.data?.total_beneficios ??
      cpfData?.totalBeneficios ??
      cpfData?.quantidade_beneficios ??
      beneficiosCpf.length
    ) || beneficiosCpf.length;

  const activeBenefit =
    beneficiosCpf[activeBenefitIndex] ||
    beneficiosCpf[0] ||
    cpfData;

  useEffect(() => {
    if (
      beneficiosCpf.length > 0 &&
      activeBenefitIndex >= beneficiosCpf.length
    ) {
      setActiveBenefitIndex(0);
      setSelectedCpfLoanIndices([]);
    }
  }, [activeBenefitIndex, beneficiosCpf.length]);
  const [lastQueriedCpf, setLastQueriedCpf] = useState("");

  const [isLoadingCpf, setIsLoadingCpf] = useState(false);
  const [consultaConvenio, setConsultaConvenio] = useState("INSS");

  useEffect(() => {
    if (formData.agreement !== "INSS" || !formData.benefit_species) {
      setPossuiDoisCartoes("nao");
    }
  }, [formData.agreement, formData.benefit_species]);

  const isInvalidezSpecies = ["04", "05", "06", "32", "92", "87"].includes(formData.benefit_species);
  const is60Plus = parseInt(formData.idade || 0) >= 60;
  const showDataConcessao = isInvalidezSpecies && !is60Plus;

  // Efeito para carregar dados iniciais
  useEffect(() => {
    const init = async () => {
      try {
        const u = localStorage.getItem('user');
        if (u) setUser(JSON.parse(u));

        const cachedLogos = localStorage.getItem('cached_sub_logos');
        if (cachedLogos) {
            try { setSubLogos(JSON.parse(cachedLogos)); } catch (e) {}
        }

        // Carregar Logos de Convênio (com retry e log)
        try {
          const logos = await api.get("/admin/sub-logos");
          const mappedLogos = (logos || []).map(l => {
            // Derive parent if not present in backend database
            if (!l.parent) {
              const uName = (l.name || "").toUpperCase();
              if (uName.startsWith("INSS")) {
                l.parent = "INSS";
              } else if (uName.startsWith("SIAPE")) {
                l.parent = "SIAPE";
              } else if (uName.includes("EXERCITO") || uName.includes("EXÉRCITO") || uName.includes("MARINHA") || uName.includes("AERONAUTICA") || uName.includes("AERONÁUTICA")) {
                l.parent = "FORÇAS ARMADAS";
              } else if (uName.includes("SP -") || uName.includes("MG -") || uName.includes("RJ -") || uName.includes("GOVERNOS") || uName.includes("ESTADO") || uName.includes("GOV_EST") || ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"].some(state => uName === state || uName.startsWith(state + " -"))) {
                l.parent = "GOVERNOS";
              } else if (uName.startsWith("CLT")) {
                l.parent = "CLT PRIVADO";
              }
            }

            if (l.name === "FORCAS") l.name = "FORÇAS ARMADAS";
            if (l.name === "GOV_EST") l.name = "GOVERNOS";
            if (l.name === "CLT_PRIVADO") l.name = "CLT PRIVADO";
            if (l.parent === "FORCAS") l.parent = "FORÇAS ARMADAS";
            if (l.parent === "GOV_EST") l.parent = "GOVERNOS";
            if (l.parent === "CLT_PRIVADO") l.parent = "CLT PRIVADO";
            return l;
          });
          setSubLogos(mappedLogos);
          try {
            localStorage.setItem('cached_sub_logos', JSON.stringify(mappedLogos));
          } catch (storageErr) {
            console.warn("Aviso: Limite do LocalStorage excedido, os logos não serão cacheados no navegador.");
          }
        } catch(err) {
          console.error("Erro logos:", err);
          const cached = localStorage.getItem('cached_sub_logos');
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              setSubLogos(Array.isArray(parsed) ? parsed : []);
            } catch (e) {
              setSubLogos([]);
            }
          }
        }

        // Carregar Bancos do DB
        try {
          const banks = await api.get("/admin/banks");
          const safeBanks = Array.isArray(banks) ? banks : [];
          setDbBanks(safeBanks);

          const originBanksToExclude = ["BCV", "ALFA", "CIFRA", "PINE", "SEGURO", "BARIGUI", "BRB", "PARANÁ", "PARATI", "PAULISTA", "PICPAY", "QI SOCIEDADE", "SABEMI", "ZEMA"];
          const active = safeBanks.filter(b =>
            b.active &&
            !originBanksToExclude.some(o => (b.name || "").toUpperCase().includes(o))
          );
          setBanksForAnim(active.length > 0 ? active : []);
        } catch (err) {
          console.error("Erro ao carregar bancos:", err);
          setDbBanks([]);
        }
      } catch (err) {
        console.error("Erro na inicialização do simulador:", err);
      }
    };
    init();
  }, []);

  // Lógica de Animação de Logos
  useEffect(() => {
    let interval;
    if (loading) {
       interval = setInterval(() => {
          setLogoIdx(prev => (prev + 1) % (banksForAnim.length || defaultLogos.length));
       }, 700);
    }
    return () => clearInterval(interval);
  }, [loading, banksForAnim]);

  const getLogo = (offset) => {
    const listCount = banksForAnim.length;
    if (listCount > 0) {
      const item = banksForAnim[(logoIdx + offset) % listCount];
      return getStaticUrl(item.logo_url);
    }
    return defaultLogos[(logoIdx + offset) % defaultLogos.length];
  };

  const calculateTaxa = (pmt, pv, n) => {
    if (!pmt || !pv || !n || n <= 0) return "";
    let i = 0.01;
    try {
      for (let j = 0; j < 50; j++) {
        let pow = Math.pow(1 + i, n);
        let f = pv * i * pow / (pow - 1) - pmt;
        let df = pv * (Math.pow(1 + i, n - 1) * (i * n + pow - 1)) / Math.pow(pow - 1, 2);
        let nextI = i - f / df;
        if (Math.abs(nextI - i) < 0.0000001) return (nextI * 100).toFixed(2);
        i = nextI;
      }
    } catch (e) { return (i * 100).toFixed(2); }
    return (i * 100).toFixed(2);
  };

  const extrairCodigoEspecie = (especie) => {
    if (!especie) return "";
    const match = String(especie).match(/^(\d{1,2})/);
    return match ? match[1].padStart(2, "0") : "";
  };

  const handleConsultarCPF = async () => {
    if (cpfStatus !== 'valid') {
       toast.warning("Por favor, informe um CPF válido primeiro.");
       return;
    }
    setIsLoadingCpf(true);
    try {
        const dados = await api.post('/consultas/cpf', {
          cpf: formData.cpf.replace(/\D/g, ''),
          convenio: consultaConvenio
        });
        console.log("PROMOSYS", dados);

       if (!dados || (!dados.cliente && !dados.beneficio_principal && (!dados.beneficios || dados.beneficios.length === 0))) {
           throw new Error("Dados inválidos da API");
       }

       setCpfData(dados);
       setSelectedCpfLoanIndices([]);
       setActiveBenefitIndex(0);
       setLastQueriedCpf(formData.cpf.replace(/\D/g, ''));
       setCpfModalOpen(true);
    } catch (err) {
       console.error(err);
       toast.error("Não foi possível consultar este CPF.");
    } finally {
       setIsLoadingCpf(false);
    }
  };

  const handleCpfButtonClick = () => {
    const cleanCpfInput = formData.cpf.replace(/\D/g, '');
    if (cleanCpfInput === lastQueriedCpf && lastQueriedCpf !== "") {
      setCpfModalOpen(true);
    } else {
      handleConsultarCPF();
    }
  };

  const handleContractChange = (id, e) => {
    const { name, value } = e.target;
    let val = value;
    if (name === "parcela" || name === "saldoDevedor") val = maskCurrency(value);
    if (name === "prazoTotal" || name === "parcelasPagas") val = value.replace(/\D/g, "").slice(0, 3);
    if (name === "taxaAjustada") val = value.replace(/[^0-9,.]/g, "").replace(",", ".");

    setContracts(contracts.map(c => {
      if (c.id !== id) return c;
      let newC = { ...c, [name]: val };
      if (formData.agreement === "SIAPE") {
        newC.parcelasPagas = "0";
      }
      if (["parcela", "saldoDevedor", "parcelasPagas", "prazoTotal"].includes(name)) {
        const pmt = parseCurrency(newC.parcela);
        const pv = parseCurrency(newC.saldoDevedor);
        const nt = parseInt(newC.prazoTotal || 0);
        const pp = parseInt(newC.parcelasPagas || 0);
        const n = nt - pp;
        newC.prazoRestante = n > 0 ? n : 0;
        if (pmt > 0 && pv > 0 && n > 0) {
           const taxaCalc = calculateTaxa(pmt, pv, n);
           newC.taxaAtual = taxaCalc;
           newC.taxaAjustada = taxaCalc;
        }
      }
      return newC;
    }));
  };

  const addContract = () => {
    if (contracts.length >= 5) return;
    const isSiape = formData.agreement === "SIAPE";
    setContracts([...contracts, {
      id: Date.now(), banco: "", parcela: "", saldoDevedor: "", prazoTotal: "", prazoRestante: "", parcelasPagas: isSiape ? "0" : "", taxaAtual: "", taxaAjustada: ""
    }]);
    setActiveContractIndex(contracts.length);
  };

  const removeContract = (id) => {
    if (contracts.length <= 1) return;
    const filtered = contracts.filter(c => c.id !== id);
    setContracts(filtered);
    setActiveContractIndex(Math.max(0, activeContractIndex - 1));
  };

  const handleFileUpload = async (e) => {
    let file = null;
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      file = e.dataTransfer.files[0];
    } else if (e.target.files && e.target.files.length > 0) {
      file = e.target.files[0];
    }
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.warning("Por favor, selecione um arquivo PDF.");
      return;
    }
    setExtractLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.postFormData("/pdf-extractor/inss", fd);
      if (res.success && res.data) {
        if (res.data.data_extrato) {
          const [dia, mes, ano] = res.data.data_extrato.split('/');
          const extratoDate = new Date(`${ano}-${mes}-${dia}T00:00:00`);
          const today = new Date();
          const diffTime = today.getTime() - extratoDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays > 30) {
            toast.error(`Extrato inválido! A data do extrato (${res.data.data_extrato}) é superior a 30 dias. O prazo máximo aceito é de 30 dias.`);
            setExtractLoading(false);
            e.target.value = null;
            return;
          } else if (diffDays > 15) {
            const proceed = window.confirm(`Atenção: O extrato foi gerado há ${diffDays} dias (${res.data.data_extrato}). Extratos com mais de 15 dias podem estar desatualizados. Deseja continuar mesmo assim?`);
            if (!proceed) {
              setExtractLoading(false);
              e.target.value = null;
              return;
            }
          }
        }

        setExtractedData(res.data);
        setExtractModalOpen(true);
      }
    } catch (err) {
      console.error(err);
      const msg = err.message || "Erro ao ler o PDF. Tente novamente.";
      toast.error(msg);
    } finally {
      setExtractLoading(false);
    }
    if (e.target && e.target.value) {
      e.target.value = null; // reset input
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileUpload(e);
  };

  const getMatchedSpecies = (spStr) => {
    if (!spStr) return "";
    const spClean = norm(spStr);
    let val = "";
    if (spClean === "APOSENTADORIA POR IDADE" || spClean === "41") val = "41";
    else if (spClean === "APOSENTADORIA POR TEMPO DE CONTRIBUICAO" || spClean === "42") val = "42";
    else if (spClean.includes("PENSAO") && spClean.includes("MORTE")) val = "21";
    else if (spClean.includes("INVALIDEZ")) val = "32";
    else if (spClean.includes("RURAL") && spClean.includes("IDADE")) val = "07";
    else if (spClean.includes("IDADE")) val = "41";
    else if (spClean.includes("TEMPO")) val = "42";
    else if (spClean.includes("BPC") || spClean.includes("LOAS")) val = "87";
    else {
      const found = inssSpecies.find(s => norm(s.label).includes(spClean) || spClean.includes(norm(s.label).replace(/^\d+\s*-?\s*/, '').trim()));
      if (found) val = found.value;
    }
    const matchedLabel = inssSpecies.find(s => s.value === val)?.label;
    return matchedLabel || spStr;
  };

  const handleUseLoan = () => {
    if (selectedExtractLoanIndices.length === 0 || !extractedData) return;

    // Tenta encontrar a espécie correspondente
    let matchedSpecies = "";
    if (extractedData.especie) {
      const matchedLabel = getMatchedSpecies(extractedData.especie);
      const found = inssSpecies.find(s => s.label === matchedLabel);
      if (found) matchedSpecies = found.value;
    }

    setFormData(prev => ({
      ...prev,
      nome_cliente: extractedData.cliente || prev.nome_cliente,
      agreement: "INSS",
      benefit_species: matchedSpecies || prev.benefit_species
    }));

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0).replace(/\s/g, " ");

    const newContracts = [...contracts];
    let addedCount = 0;
    let firstAddedIndex = null;

    const isLoanAlreadyImported = (loan) => {
      const cleanLoanParcela = loan.parcela.toFixed(2).replace(/\D/g, '');
      return newContracts.some(c => {
        if (c.numeroContrato && loan.contrato && c.numeroContrato === loan.contrato) return true;
        if (!c.parcela) return false;
        const cleanContractParcela = c.parcela.replace(/\D/g, '');
        return cleanContractParcela === cleanLoanParcela;
      });
    };

    for (const idx of selectedExtractLoanIndices) {
      const selectedLoan = extractedData.emprestimos_ativos[idx];
      if (isLoanAlreadyImported(selectedLoan)) {
        continue;
      }

      if (newContracts.length >= 5 && newContracts.every(c => c.banco || c.parcela)) {
        break; // Max tabs reached
      }

      let matchedBank = "";
      let rawBankName = selectedLoan.banco;
      if (rawBankName.includes('-')) rawBankName = rawBankName.substring(rawBankName.indexOf('-') + 1);
      const bClean = norm(rawBankName);

      let bankNameToSearch = bClean;
      const heuristics = ["C6", "PAN", "DAYCOVAL", "ITA", "BRADESCO", "MERCANTIL", "SAFRA", "BMG", "OLE", "OLÉ"];
      for (const h of heuristics) {
        if (bClean.includes(norm(h))) {
          bankNameToSearch = norm(h);
          break;
        }
      }

      const extractedCodeMatch = selectedLoan.banco.match(/^(\d{3})/);
      const extractedCode = extractedCodeMatch ? extractedCodeMatch[1] : null;

      const bankNameUpper = String(selectedLoan.banco || "").toUpperCase();
      if (extractedCode === "329" || bankNameUpper.includes("FINANTO") || bankNameUpper.includes("HAPPI") || bankNameUpper.includes("ICRED")) {
        matchedBank = "329";
      } else {
        let foundInssBank = inssBanks.find(b => extractedCode && b.value === extractedCode);
        if (!foundInssBank) {
          foundInssBank = inssBanks.find(b => {
            const bankLabelNameOnly = b.label.includes('-') ? b.label.substring(b.label.indexOf('-') + 1) : b.label;
            const bn = norm(bankLabelNameOnly);
            return bn.includes(bankNameToSearch) || bankNameToSearch.includes(bn);
          });
        }
        if (foundInssBank) matchedBank = foundInssBank.value;
      }

      // Find target index
      let targetIndex = newContracts.findIndex(c => !c.banco && !c.parcela);
      if (targetIndex === -1 && newContracts.length < 5) {
        targetIndex = newContracts.length;
        newContracts.push({
          id: Date.now() + targetIndex, banco: "", parcela: "", saldoDevedor: "", prazoTotal: "", prazoRestante: "", parcelasPagas: "", taxaAtual: "", taxaAjustada: ""
        });
      }

      if (targetIndex !== -1) {
        newContracts[targetIndex] = {
          ...newContracts[targetIndex],
          numeroContrato: selectedLoan.contrato,
          banco: matchedBank,
          parcela: formatCurrency(selectedLoan.parcela),
          saldoDevedor: formatCurrency(selectedLoan.saldo_devedor),
          prazoTotal: selectedLoan.prazo_total.toString(),
          prazoRestante: selectedLoan.prazo_restante.toString(),
          parcelasPagas: (selectedLoan.prazo_total - selectedLoan.prazo_restante).toString(),
          taxaAtual: Number(selectedLoan.taxa_mensal).toFixed(2).replace(".", ","),
          taxaAjustada: Number(selectedLoan.taxa_mensal).toFixed(2).replace(".", ",")
        };
        addedCount++;
        if (firstAddedIndex === null) {
          firstAddedIndex = targetIndex;
        }
      }
    }

    if (extractedData.margem_disponivel < 0) {
      setPossuiDoisCartoes("sim");
      setValorMargemNegativa(formatCurrency(Math.abs(extractedData.margem_disponivel)));
    } else {
      setPossuiDoisCartoes("nao");
      setValorMargemNegativa("");
    }

    setContracts(newContracts);
    if (firstAddedIndex !== null) {
      setActiveContractIndex(firstAddedIndex);
    }
    setExtractModalOpen(false);
  };

  const handleUseCpfLoans = () => {
    if (selectedCpfLoanIndices.length === 0 || !activeBenefit) return;

    const activeConvention = String(
      activeBenefit?.convenio || "INSS"
    ).trim().toUpperCase();

    const isSiapeBenefit = activeConvention === "SIAPE";

    const margemDisponivelAtiva = Number(
      activeBenefit.margens?.margem_disponivel ??
      activeBenefit.margens?.margem_livre ??
      0
    );

    setFormData(prev => ({
       ...prev,
       nome_cliente: activeBenefit.cliente?.nome || prev.nome_cliente,
       cpf: maskCPF(activeBenefit.cliente?.cpf || formData.cpf),
       idade: activeBenefit.cliente?.idade ? activeBenefit.cliente.idade.toString() : prev.idade,
       agreement: activeConvention,
       benefit_species: isSiapeBenefit
         ? ""
         : extrairCodigoEspecie(activeBenefit.cliente?.especie) || prev.benefit_species,
       margem_livre: margemDisponivelAtiva,
       margem_consignavel: isSiapeBenefit
         ? 0
         : activeBenefit.margens?.margem_emprestimo || 0,
       total_comprometido: isSiapeBenefit
         ? 0
         : activeBenefit.margens?.total_comprometido || 0,
       coeficiente_utilizado: activeBenefit.margens?.coeficiente_utilizado ?? 0.02270,
       valor_liberado_margem: activeBenefit.margens?.valor_liberado_margem ?? 0
    }));

    if (activeBenefit.margens) {
        if (margemDisponivelAtiva < 0) {
            const valorNegativo = Math.abs(margemDisponivelAtiva);
            setValorMargemNegativa(`R$ ${valorNegativo.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
        }
        if (
            !isSiapeBenefit &&
            activeBenefit.cartoes &&
            activeBenefit.cartoes.length >= 2
          ) {
            setPossuiDoisCartoes("sim");
        } else {
            setPossuiDoisCartoes("nao");
        }
    }

    const formatCurrencyConsult = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0).replace(/\s/g, " ");

    const newContracts = [...contracts];
    let addedCount = 0;
    let firstAddedIndex = null;

    const isCpfLoanAlreadyImported = (loan) => {
      const cleanLoanParcela = Number(loan.parcela).toFixed(2).replace(/\D/g, '');
      return newContracts.some(c => {
        if (c.numeroContrato && loan.contrato && c.numeroContrato === loan.contrato) return true;
        if (!c.parcela) return false;
        const cleanContractParcela = c.parcela.replace(/\D/g, '');
        return cleanContractParcela === cleanLoanParcela;
      });
    };

    for (const idx of selectedCpfLoanIndices) {
      const emp = activeBenefit.emprestimos[idx];
      if (isCpfLoanAlreadyImported(emp)) {
        continue;
      }

      if (newContracts.length >= 5 && newContracts.every(c => c.banco || c.parcela)) {
        break;
      }

      let targetIndex = newContracts.findIndex(c => !c.banco && !c.parcela);
      if (targetIndex === -1 && newContracts.length < 5) {
        targetIndex = newContracts.length;
        newContracts.push({
          id: Date.now() + targetIndex, banco: "", parcela: "", saldoDevedor: "", prazoTotal: "", prazoRestante: "", parcelasPagas: isSiapeBenefit ? "0" : "", taxaAtual: "", taxaAjustada: ""
        });
      }

      if (targetIndex !== -1) {
        let matchedBank = "";
        const paddedCode = (emp.codigo || "").padStart(3, "0");
        const bankNameUpper = String(emp.banco || "").toUpperCase();
        if (paddedCode === "329" || bankNameUpper.includes("FINANTO") || bankNameUpper.includes("HAPPI") || bankNameUpper.includes("ICRED")) {
          matchedBank = "329";
        } else {
          const foundInssBank = inssBanks.find(b => b.value === paddedCode);
          if (foundInssBank) {
            matchedBank = foundInssBank.value;
          } else {
          const bClean = norm(emp.banco || "");
          const heuristics = ["C6", "PAN", "DAYCOVAL", "ITA", "BRADESCO", "MERCANTIL", "SAFRA", "BMG", "OLE", "OLÉ", "SANTANDER", "FACTA", "AGIBANK"];
          let bankNameToSearch = bClean;
          for (const h of heuristics) {
            if (bClean.includes(norm(h))) {
              bankNameToSearch = norm(h);
              break;
            }
          }
          const foundByName = inssBanks.find(b => {
            const bankLabelNameOnly = b.label.includes('-') ? b.label.substring(b.label.indexOf('-') + 1) : b.label;
            const bn = norm(bankLabelNameOnly);
            return bn.includes(bankNameToSearch) || bankNameToSearch.includes(bn);
          });
          if (foundByName) matchedBank = foundByName.value;
          }
        }

        const pTotal = emp.prazo ? emp.prazo.toString() : "";
        newContracts[targetIndex] = {
          ...newContracts[targetIndex],
          numeroContrato: emp.contrato,
          banco: matchedBank,
          parcela: emp.parcela ? formatCurrencyConsult(emp.parcela) : "",
          saldoDevedor: Number(
            emp.saldo_devedor || emp.quitacao || 0
          )
            ? formatCurrencyConsult(
                Math.abs(
                  Number(
                    emp.saldo_devedor ||
                    emp.quitacao ||
                    0
                  )
                )
              )
            : "",
          prazoTotal: pTotal,
          prazoRestante: isSiapeBenefit ? pTotal : (emp.prazo_restante ? emp.prazo_restante.toString() : ""),
          parcelasPagas: isSiapeBenefit ? "0" : (emp.parcelas_pagas ? emp.parcelas_pagas.toString() : ""),
          taxaAtual: emp.taxa ? Number(emp.taxa).toFixed(2).replace('.', ',') : "",
          taxaAjustada: emp.taxa ? Number(emp.taxa).toFixed(2).replace('.', ',') : ""
        };
        addedCount++;
        if (firstAddedIndex === null) {
          firstAddedIndex = targetIndex;
        }
      }
    }

    setContracts(newContracts);
    if (firstAddedIndex !== null) {
      setActiveContractIndex(firstAddedIndex);
    }
    setCpfModalOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let val = value;
    if (name === "cpf") {
       val = maskCPF(value);
       if (val.length === 14) {
          setCpfStatus(validateCPF(val) ? 'valid' : 'invalid');
       } else {
          setCpfStatus(null);
       }
    }
    if (name === "idade") val = value.replace(/\D/g, "").slice(0, 3);
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const maskCPF = (val) => val.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})/, "$1-$2").replace(/(-\d{2})\d+?$/, "$1");
  const maskCurrency = (val) => {
    let clean = val.replace(/\D/g, "");
    if (!clean) return "";
    let value = (Number(clean) / 100).toFixed(2);
    let parts = value.split(".");
    let intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `R$ ${intPart},${parts[1]}`;
  };
  const parseCurrency = (val) => {
    if (!val) return 0;
    return parseFloat(val.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
  };

  const validateCPF = (cpf) => {
    cpf = cpf.replace(/[^\d]+/g, "");
    if (cpf === "") return false;
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    let sum = 0, rest;
    for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(cpf.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(cpf.substring(10, 11))) return false;
    return true;
  };

  const handleSimular = async (e) => {
    e.preventDefault();
    if (formData.cpf && !validateCPF(formData.cpf)) {
      toast.warning("CPF informado é inválido.");
      return;
    }
    const invalid = contracts.filter(c => !c.banco || !c.parcela || !c.saldoDevedor);
    if (invalid.length > 0) {
      toast.warning("Preencha todos os campos obrigatórios dos contratos.");
      return;
    }

    setLoading(true);
    try {
      let maxParcelaId = null;
      let maxParcelaValue = -1;
      contracts.forEach(c => {
         const pVal = parseCurrency(c.parcela);
         if (pVal > maxParcelaValue) {
            maxParcelaValue = pVal;
            maxParcelaId = c.id;
         }
      });

      const promises = contracts.map(c => {
        const payload = {
          nome_cliente: formData.nome_cliente,
          cpf: formData.cpf.replace(/\D/g, ""),
          idade: parseInt(formData.idade),
          convenio: formData.agreement === "CLT PRIVADO" ? "CLT_PRIVADO" : formData.agreement,
          sub_convenio: formData.sub_agreement ? formData.sub_agreement.split(' - ')[0] : "",
          benefit_species: formData.benefit_species,
          banco: c.banco,
          parcela: parseCurrency(c.parcela),
          saldo_devedor: parseCurrency(c.saldoDevedor),
          taxa_atual: parseFloat((c.taxaAjustada || c.taxaAtual || 0).toString().replace(',', '.')),
          total_term: parseInt(c.prazoTotal),
          remaining_term: parseInt(c.prazoRestante),
          data_concessao: formData.data_concessao || null,
          is_60_plus: formData.is_60_plus || (["04", "05", "06", "32", "92", "87"].includes(formData.benefit_species) && parseInt(formData.idade || 0) < 60),
          is_invalidez_60_plus: parseInt(formData.idade || 0) >= 60,
          analfabeto: formData.analfabeto === "sim",
          possui_dois_cartoes: possuiDoisCartoes === "sim",
          valor_margem_negativa: (possuiDoisCartoes === "sim" && c.id === maxParcelaId) ? parseCurrency(valorMargemNegativa) : 0.0
        };
        return api.post('/simular', payload).then(res => ({ contrato_id: c.id, ...res }));
      });

      const [results] = await Promise.all([
        Promise.all(promises),
        new Promise(resolve => setTimeout(resolve, 4000))
      ]);

      const combinedOfertas = [];
      const combinedRejeitados = [];
      results.forEach(res => {
        if (res.ofertas) combinedOfertas.push(...res.ofertas.map(o => ({ ...o, _contrato_id: res.contrato_id })));
        if (res.rejeitados) combinedRejeitados.push(...res.rejeitados.map(r => ({ ...r, _contrato_id: res.contrato_id })));
      });

      const finalData = {
        cliente: results[0]?.cliente || {},
        ofertas: combinedOfertas,
        rejeitados: combinedRejeitados,
        total_bancos_analisados: results.reduce((acc, r) => acc + (r.total_bancos_analisados || 0), 0),
        total_aprovados: combinedOfertas.length,
        total_rejeitados: combinedRejeitados.length
      };

      const mappedContracts = contracts.map(c => {
         const found = inssBanks.find(b => b.value === c.banco);
         let finalParcela = c.parcela;
         if (possuiDoisCartoes === "sim" && c.id === maxParcelaId) {
            const reduced = Math.max(0, parseCurrency(c.parcela) - parseCurrency(valorMargemNegativa));
            finalParcela = maskCurrency(reduced.toFixed(2));
         }
         return { ...c, banco_nome: found ? found.label : c.banco, parcela: finalParcela, original_parcela: c.parcela };
      });
      sessionStorage.setItem("simulation_input", JSON.stringify({
        ...formData,
        possui_dois_cartoes: possuiDoisCartoes === "sim",
        valor_margem_negativa: possuiDoisCartoes === "sim" ? parseCurrency(valorMargemNegativa) : 0.0,
        contracts: mappedContracts
      }));
      sessionStorage.setItem("simulation_results", JSON.stringify(finalData));

      // Sincronizar taxa calculada para o Admin Preview
      const rateToSync = contracts[0].taxaAjustada || contracts[0].taxaAtual || 0;
      localStorage.setItem("last_simulation_rate", rateToSync.toString());

      setShowSuccess(true);
      setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => { router.push("/ofertas"); }, 700);
      }, 1500);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar simulação.");
      setLoading(false);
    }
  };

  const inssSpecies = [
    { value: "01", label: "01 - PENSÃO POR MORTE ACIDENTE TRABALHO" },
    { value: "02", label: "02 - PENSÃO POR MORTE ACIDENTE DO TRABALHO RURAL" },
    { value: "03", label: "03 - PENSÃO POR MORTE EMPREGADOR RURAL" },
    { value: "04", label: "04 - APOSENTADORIA POR INVALIDEZ ACIDENTE TRABALHO" },
    { value: "05", label: "05 - APOSENTADORIA POR INVALIDEZ RURAL" },
    { value: "06", label: "06 - APOSENTADORIA POR INVALIDEZ EMPREGADOR RURAL" },
    { value: "07", label: "07 - APOSENTADORIA POR IDADE RURAL" },
    { value: "08", label: "08 - APOSENTADORIA POR IDADE EMPREGADOR RURAL" },
    { value: "19", label: "19 - PENSÃO DE ESTUDANTE (LEI 7004/82)" },
    { value: "21", label: "21 - PENSÃO POR MORTE PREVIDENCIÁRIA" },
    { value: "22", label: "22 - PENSÃO POR MORTE ESTATUTÁRIA" },
    { value: "23", label: "23 - PENSÃO POR MORTE DE EX-COMBATENTE" },
    { value: "24", label: "24 - PENSÃO ESPECIAL (ATO INSTITUCIONAL)" },
    { value: "26", label: "26 - PENSÃO ESPECIAL (LEI 593/48)" },
    { value: "27", label: "27 - PENSÃO POR MORTE SERVIDOR PÚBLICO FEDERAL" },
    { value: "28", label: "28 - PENSÃO POR MORTE DO REGIME GERAL" },
    { value: "29", label: "29 - PENSÃO POR MORTE EX-COMBATENTE MARÍTIMO" },
    { value: "32", label: "32 - APOSENTADORIA POR INVALIDEZ PREVIDENCIÁRIA" },
    { value: "33", label: "33 - APOSENTADORIA POR INVALIDEZ DE AERONAUTA" },
    { value: "34", label: "34 - APOSENTADORIA POR INVALIDEZ DE EX-COMBATENTE MARÍTIMO" },
    { value: "41", label: "41 - APOSENTADORIA POR IDADE" },
    { value: "42", label: "42 - APOSENTADORIA POR TEMPO DE CONTRIBUIÇÃO" },
    { value: "43", label: "43 - APOSENTADORIA POR TEMPO DE CONTRIBUIÇÃO DE EX-COMBATENTE" },
    { value: "44", label: "44 - APOSENTADORIA POR TEMPO DE CONTRIBUIÇÃO DE AERONAUTA" },
    { value: "45", label: "45 - APOSENTADORIA POR TEMPO DE CONTRIBUIÇÃO DE JORNALISTA PROFISSIONAL" },
    { value: "46", label: "46 - APOSENTADORIA ESPECIAL" },
    { value: "49", label: "49 - APOSENTADORIA POR TEMPO DE CONTRIBUIÇÃO ORDINÁRIA" },
    { value: "51", label: "51 - APOSENTADORIA POR INVALIDEZ ESTATUTÁRIA" },
    { value: "52", label: "52 - APOSENTADORIA POR IDADE ESTATUTÁRIA" },
    { value: "54", label: "54 - PENSÃO ESPECIAL VITALÍCIA (LEI 9796/99)" },
    { value: "55", label: "55 - PENSÃO POR MORTE ESTATUTÁRIA" },
    { value: "56", label: "56 - PENSÃO POR MORTE ESTATUTÁRIA VITALÍCIA" },
    { value: "57", label: "57 - APOSENTADORIA POR TEMPO DE CONTRIBUIÇÃO DE PROFESSOR" },
    { value: "58", label: "58 - APOSENTADORIA POR TEMPO DE CONTRIBUIÇÃO EM NOME DA EXCEPCIONALIDADE" },
    { value: "59", label: "59 - PENSÃO POR MORTE DE EXCEPCIONAL" },
    { value: "60", label: "60 - PENSÃO ESPECIAL MENSAL VITALÍCIA" },
    { value: "87", label: "87 - AMPARO SOCIAL DEFICIENTE (LOAS)" },
    { value: "88", label: "88 - AMPARO SOCIAL IDOSO (LOAS)" },
    { value: "89", label: "89 - PENSÃO ESPECIAL AOS DEPENDENTES DE VÍTIMAS DE HEMODIÁLISE" },
    { value: "92", label: "92 - APOSENTADORIA POR INVALIDEZ POR ACIDENTE DE TRABALHO" },
    { value: "93", label: "93 - PENSÃO POR MORTE POR ACIDENTE DE TRABALHO" }
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const primaryColor = user?.brand_color || "#2563eb";
    document.documentElement.style.setProperty('--brand-primary', primaryColor);
    document.documentElement.style.setProperty('--brand-primary-rgb', hexToRgb(primaryColor));
  }, [user]);

  const hexToRgb = (hex) => {
    if (!hex || typeof hex !== 'string') return "37, 99, 235";
    try {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      if (isNaN(r) || isNaN(g) || isNaN(b)) return "37, 99, 235";
      return `${r}, ${g}, ${b}`;
    } catch (e) { return "37, 99, 235"; }
  };

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-700 brand-themed">
      <style dangerouslySetInnerHTML={{ __html: `
        .brand-themed .text-blue-600, .brand-themed .text-blue-500 { color: var(--brand-primary) !important; }
        .brand-themed .bg-blue-600, .brand-themed .bg-blue-500 { background-color: var(--brand-primary) !important; }
        .brand-themed .border-blue-600, .brand-themed .border-blue-500 { border-color: var(--brand-primary) !important; }
        .brand-themed .bg-blue-50 { background-color: rgba(var(--brand-primary-rgb), 0.1) !important; }
        .brand-themed .focus\\:border-blue-500:focus { border-color: var(--brand-primary) !important; }
        .brand-themed .focus\\:ring-blue-500\\/10:focus { --tw-ring-color: rgba(var(--brand-primary-rgb), 0.1) !important; }
        .brand-themed .hover\\:bg-blue-700:hover { filter: brightness(0.9); background-color: var(--brand-primary) !important; }
        .brand-themed .shadow-blue-500\\/30 { --tw-shadow-color: rgba(var(--brand-primary-rgb), 0.3) !important; }
        .brand-themed .shadow-blue-500\\/20 { --tw-shadow-color: rgba(var(--brand-primary-rgb), 0.2) !important; }
      ` }} />
      {/* Loading Overlay */}
      {loading && (
        <div className={`fixed inset-0 z-[1000] flex flex-col items-center justify-center transition-all duration-700 ${isExiting ? "opacity-0 scale-110 blur-2xl" : "bg-black/80 backdrop-blur-md opacity-100"}`}>

           {/* Foguete no Topo */}
           <div className="relative z-40 flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl shadow-[0_0_40px_rgba(37,99,235,0.6)] flex items-center justify-center animate-bounce">
                 <Icons.Rocket size={32} className="text-white" />
              </div>
           </div>

            {/* Carrossel de Círculos */}
           <div className="relative w-full max-w-lg h-56 flex items-center justify-center">
              {[...Array(3)].map((_, i) => {
                const animations = [
                  { x: [0, -180, 180, 0], scale: [1.6, 0.6, 0.6, 1.6], zIndex: [30, 10, 10, 30] },
                  { x: [-180, 180, 0, -180], scale: [0.6, 0.6, 1.6, 0.6], zIndex: [10, 10, 30, 10] },
                  { x: [180, 0, -180, 180], scale: [0.6, 1.6, 0.6, 0.6], zIndex: [10, 30, 10, 10] }
                ];
                return (
                    <motion.div
                    key={i}
                    className="absolute w-28 h-28 rounded-full border-[3px] border-white flex items-center justify-center bg-white shadow-2xl overflow-hidden"
                    animate={animations[i]}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", times: [0, 0.33, 0.66, 1] }}
                  >
                     <img src={getLogo(i)} loading="eager" fetchPriority="high" className="w-full h-full object-cover" />
                  </motion.div>
                );
              })}
           </div>

           {/* Texto Embaixo */}
           <div className="relative z-40 flex flex-col items-center mt-12">
              <AnimatePresence mode="wait">
                {!showSuccess ? (
                  <motion.h2
                    key="analyzing"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="text-2xl font-black text-white tracking-widest uppercase text-center drop-shadow-lg"
                  >
                    Analisando<br/><span className="text-blue-400">Oportunidades</span>
                  </motion.h2>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.4)]">
                       <Icons.Check size={40} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-widest uppercase text-center drop-shadow-lg">
                      Análise<br/><span className="text-emerald-400">Concluída!</span>
                    </h2>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10 space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter drop-shadow-sm uppercase">Nova <span className="text-blue-600">Simulação</span></h1>
            <p className="text-slate-500 font-bold italic text-sm uppercase tracking-[0.3em]">Portabilidade PRO & Análise de Crédito</p>
          </div>
          <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl shadow-xl border border-slate-100">
             <div className="w-10 h-10 rounded-[1.25rem] bg-blue-600 flex items-center justify-center text-white shadow-lg">
                <Icons.Rocket />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Módulo</p>
                <p className="text-sm font-black text-slate-800 uppercase leading-none">Inteligência Artificial</p>
             </div>
          </div>
        </div>

        <form onSubmit={handleSimular} className="grid grid-cols-1 xl:grid-cols-12 gap-10">

          {/* Lado Esquerdo: Dados do Cliente */}
          <div className="xl:col-span-5 space-y-8">

            {/* INSS PDF Extractor Dropzone */}
            <div className="bg-blue-600 p-1 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
              <div
                className={`bg-white dark:bg-slate-900 rounded-[2.25rem] p-6 relative z-10 flex flex-col items-center justify-center text-center border-4 border-dashed transition-all ${isDragging ? 'border-emerald-500 bg-emerald-50/50 scale-[1.02]' : 'border-blue-100 dark:border-blue-900/50 hover:border-blue-400'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
                  <Icons.FileText size={28} />
                </div>
                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-1">Extrato INSS</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-4">Envie o PDF para preencher automático</p>

                <div className="flex items-center justify-center gap-3 w-full mt-2">
                  <label className="relative cursor-pointer group/btn flex-1 max-w-[200px]">
                    <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} disabled={extractLoading} />
                    <div className={`w-full px-4 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-center ${extractLoading ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/30'}`}>
                      {extractLoading ? 'Processando...' : (extractedData ? 'Novo PDF' : 'Selecionar PDF')}
                    </div>
                  </label>

                  {extractedData && !extractLoading && (
                    <button type="button" onClick={() => setExtractModalOpen(true)} className="flex-1 max-w-[200px] px-4 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2">
                      <Icons.Eye size={14} /> Ver Dados
                    </button>
                  )}
                </div>

                {extractLoading && (
                  <div className="w-full mt-5 max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex justify-between items-center px-1 mb-2">
                      <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest animate-pulse flex items-center gap-1.5">
                        <Icons.CheckCircle size={10} className="animate-spin-slow" /> Inteligência Artificial trabalhando...
                      </span>
                    </div>
                    <div className="w-full bg-emerald-50 dark:bg-emerald-900/20 rounded-full h-1.5 overflow-hidden relative shadow-inner">
                      <div className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)] loading-bar-slide">
                        <div className="absolute inset-0 bg-white/40 w-full h-full animate-pulse"></div>
                      </div>
                    </div>
                    <style>{`
                      .loading-bar-slide {
                        animation: slideRight 1.8s ease-in-out infinite;
                      }
                      @keyframes slideRight {
                        0% { transform: translateX(-100%); width: 20%; }
                        50% { width: 40%; }
                        100% { transform: translateX(500%); width: 20%; }
                      }
                    `}</style>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/5 rounded-full -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-1000"></div>

              <div className="flex items-center gap-3 mb-8 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 border border-blue-500/20">
                  <Icons.User />
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Dados Pessoais</h3>
              </div>

              <div className="space-y-5 relative z-10">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input
                    type="text"
                    name="nome_cliente"
                    value={formData.nome_cliente}
                    onChange={handleChange}
                    placeholder="DIGITE O NOME DO CLIENTE"
                    className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-bold text-slate-800 placeholder:text-slate-300 uppercase"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center mb-1.5 ml-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CPF</label>
                      <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setConsultaConvenio("INSS")}
                          className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all ${consultaConvenio === "INSS" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                          INSS
                        </button>
                        <button
                          type="button"
                          onClick={() => setConsultaConvenio("SIAPE")}
                          className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all ${consultaConvenio === "SIAPE" ? "bg-amber-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                          SIAPE
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 relative">
                        <div className="relative flex-1">
                            <input
                              type="text"
                              name="cpf"
                              value={formData.cpf}
                              onChange={handleChange}
                              placeholder="000.000.000-00"
                              className={`w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 transition-all outline-none font-bold text-slate-800 ${cpfStatus === 'valid' ? 'border-emerald-500 bg-emerald-50' : cpfStatus === 'invalid' ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-blue-500 focus:bg-white'}`}
                            />
                            {cpfStatus === 'valid' && (
                               <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600 animate-in zoom-in">
                                  <Icons.Check size={20} />
                               </div>
                            )}
                        </div>
                        <button
                          type="button"
                          onClick={handleCpfButtonClick}
                          disabled={isLoadingCpf || !formData.cpf}
                          className={`h-14 px-4 font-black text-[11px] uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center min-w-[110px] shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${
                            isLoadingCpf
                              ? 'bg-slate-300 text-slate-500'
                              : (formData.cpf.replace(/\D/g, '') === lastQueriedCpf && lastQueriedCpf !== "")
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-700 hover:to-emerald-900 text-white shadow-emerald-500/30 hover:shadow-emerald-500/40'
                                : 'bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white shadow-blue-500/30 hover:shadow-blue-500/40'
                          }`}
                        >
                          {isLoadingCpf ? (
                             <Icons.Loader2 className="animate-spin" size={20} />
                          ) : (formData.cpf.replace(/\D/g, '') === lastQueriedCpf && lastQueriedCpf !== "") ? (
                             <div className="flex items-center gap-2">
                                <Icons.Eye size={16} />
                                <span>Ver Dados</span>
                             </div>
                          ) : (
                             <div className="flex items-center gap-2">
                                <Icons.Search size={16} />
                                <span>Consultar</span>
                             </div>
                          )}
                        </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Idade</label>
                       <input
                          type="text"
                          name="idade"
                          value={formData.idade}
                          onChange={handleChange}
                          placeholder="80"
                          className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white transition-all outline-none font-bold text-slate-800 text-center"
                          required
                       />
                    </div>
                    <div className="flex flex-col space-y-1.5 justify-end">
                       <div className="flex items-center justify-start h-14 px-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer group/opt" onClick={() => setFormData(p => ({...p, analfabeto: p.analfabeto === "sim" ? "nao" : "sim"}))}>
                          <div className="flex items-center gap-3">
                             <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${formData.analfabeto === "sim" ? "bg-blue-600 border-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]" : "border-slate-300 group-hover/opt:border-blue-400"}`}>
                                {formData.analfabeto === "sim" && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                             </div>
                             <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Cliente Analfabeto?</span>
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Regra Condicional: Invalidez ou 60+ */}
                  {(isInvalidezSpecies || is60Plus) && (
                    <div className={`flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-colors ${isInvalidezSpecies && !is60Plus ? 'opacity-80 pointer-events-none' : 'hover:border-blue-200 cursor-pointer group/opt'}`} onClick={() => { if (!(isInvalidezSpecies && !is60Plus)) setFormData(p => ({...p, is_60_plus: !p.is_60_plus})) }}>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${formData.is_60_plus || (isInvalidezSpecies && !is60Plus) ? "bg-blue-600 border-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]" : "border-slate-300 group-hover/opt:border-blue-400"}`}>
                            {(formData.is_60_plus || (isInvalidezSpecies && !is60Plus)) && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                           {is60Plus ? "Cliente 60+ anos?" : "Benefício por Invalidez"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Campo Data de Concessão (Condicional) */}
                  {showDataConcessao && (
                    <div className="space-y-1.5 pt-2 animate-in slide-in-from-top-2 duration-500">
                      <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                        <Icons.FileText size={12} /> Data de Concessão (Obrigatório)
                      </label>
                      <input
                        type="date"
                        name="data_concessao"
                        value={formData.data_concessao}
                        onChange={handleChange}
                        className="w-full h-14 px-5 rounded-2xl bg-blue-50 border border-blue-200 focus:border-blue-500 focus:bg-white transition-all outline-none font-bold text-slate-800"
                        required
                      />
                      <p className="text-[9px] font-bold text-blue-400 italic px-2">Necessário para validar regra de invalidez antes dos 60 anos.</p>
                    </div>
                  )}

                  {/* Novo campo: Cliente possui 2 cartões ativos? (Exclusivo INSS + espécie selecionada) */}
                  {formData.agreement === "INSS" && formData.benefit_species && (
                    <div className="pt-4 border-t border-slate-100 space-y-3 animate-in slide-in-from-top-2 duration-500">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                          Cliente possui 2 cartões ativos?
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setPossuiDoisCartoes("sim")}
                            className={`h-12 rounded-xl font-black text-xs uppercase tracking-wider border-2 transition-all flex items-center justify-center gap-2 ${
                              possuiDoisCartoes === "sim"
                                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100 cursor-pointer"
                            }`}
                          >
                            {possuiDoisCartoes === "sim" && <Icons.Check size={14} />}
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setPossuiDoisCartoes("nao")}
                            className={`h-12 rounded-xl font-black text-xs uppercase tracking-wider border-2 transition-all flex items-center justify-center gap-2 ${
                              possuiDoisCartoes === "nao"
                                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100 cursor-pointer"
                            }`}
                          >
                            {possuiDoisCartoes === "nao" && <Icons.Check size={14} />}
                            Não
                          </button>
                        </div>
                      </div>

                      {possuiDoisCartoes === "sim" && (
                        <div className="space-y-1.5 pt-2 animate-in slide-in-from-top-2 duration-300">
                          <label className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">
                            Valor da Margem Negativa do Beneficiário
                          </label>
                          <input
                            type="text"
                            value={valorMargemNegativa}
                            onChange={(e) => setValorMargemNegativa(maskCurrency(e.target.value))}
                            className="w-full h-14 px-5 rounded-2xl bg-red-50/50 border border-red-200 focus:border-red-500 focus:bg-white transition-all outline-none font-black text-red-600 text-lg shadow-sm"
                          />
                          <p className="text-[9px] font-bold text-red-400 italic px-2">
                            Esse abatimento será deduzido do valor da parcela no cálculo do troco e Refin.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Informações de Margem Disponível (SIAPE ou quando houver margem_livre) */}
                  {formData.margem_livre !== undefined && formData.margem_livre > 0 && (
                    <div className="pt-4 border-t border-slate-100 space-y-3 animate-in slide-in-from-top-2 duration-500">
                      <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/80">
                        <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <Icons.Sparkles size={12} className="text-emerald-500 animate-pulse" /> Margem Disponível Importada
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="block text-[8px] font-black text-slate-400 uppercase">Margem Livre</span>
                            <span className="text-sm font-black text-slate-800">{formatBRL(formData.margem_livre)}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-black text-slate-400 uppercase">Liberado Aproximado</span>
                            <span className="text-sm font-black text-emerald-700">
                              {formatBRL(formData.valor_liberado_margem || (formData.margem_livre / (formData.coeficiente_utilizado || 0.02270)))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-white">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <div className="relative z-10 flex flex-col gap-4">
                 <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-xl backdrop-blur-md">
                    <Icons.Sparkles />
                 </div>
                 <h4 className="text-xl font-black uppercase tracking-tighter">Motor de Decisão</h4>
                 <p className="text-xs text-white/50 font-bold italic leading-relaxed uppercase">Analisando centenas de regras bancárias em tempo real.</p>
              </div>
            </div>
          </div>

          {/* Lado Direito: Dados da Simulação */}
          <div className="xl:col-span-7 space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20">
                    <Icons.FileText />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Convênio Origem</h3>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                  {/* Dropdown de Convênio */}
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selecione o Convênio</label>
                    <button
                      type="button"
                      onClick={() => setDropdownOpen({ ...dropdownOpen, agreement: !dropdownOpen.agreement })}
                      className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between font-black text-slate-800 hover:bg-slate-100 transition-all uppercase text-sm"
                    >
                      <div className="flex items-center gap-3">
                         {(() => {
                           const url = getAgreementLogoUrl(formData.agreement);
                           if (url) return <img src={url} loading="eager" fetchPriority="high" className="w-8 h-8 rounded-lg object-cover bg-white shadow-sm" />;
                           if (formData.agreement) {
                             return (
                               <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                 {formData.agreement.substring(0, 2).toUpperCase()}
                               </div>
                             );
                           }
                           return null;
                         })()}
                         {formData.agreement || "SELECIONAR CONVÊNIO"}
                      </div>
                      <Icons.ChevronDown />
                    </button>
                    <AnimatePresence>
                      {dropdownOpen.agreement && (
                        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:10}} className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 z-[100] max-h-[400px] overflow-hidden flex flex-col">
                           <div className="mb-3 sticky top-0 bg-white z-10">
                              <input
                                type="text"
                                placeholder="BUSCAR CONVÊNIO..."
                                value={agreementSearch}
                                onChange={(e) => setAgreementSearch(e.target.value)}
                                className="w-full h-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase outline-none focus:border-blue-500"
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                              />
                           </div>
                           <div className="overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                             {["INSS", "SIAPE", "FORÇAS ARMADAS", "GOVERNOS", "CLT PRIVADO"]
                               .filter(name => !agreementSearch || (name || "").toUpperCase().includes(agreementSearch.toUpperCase()))
                               .map(name => (
                                 <button key={name} type="button" onClick={() => {
                                    setFormData(p => {
                                      const newD = { ...p, agreement: name, sub_agreement: "" };
                                      if (name === "SIAPE" && !newD.margem_livre) {
                                        newD.margem_livre = 0;
                                        newD.valor_liberado_margem = 0;
                                      }
                                      return newD;
                                    });
                                    setDropdownOpen(p => ({ ...p, agreement: false }));
                                    setAgreementSearch("");
                                    if (name === "SIAPE") {
                                      setContracts(prev => prev.map(c => ({
                                        ...c,
                                        parcelasPagas: "0",
                                        prazoRestante: c.prazoTotal || c.prazoRestante
                                      })));
                                    }
                                  }} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border ${formData.agreement === name ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30' : 'bg-slate-50 text-slate-700 border-slate-100 hover:border-blue-300'}`}>
                                   <div className="w-10 h-10 bg-white rounded-xl shrink-0 flex items-center justify-center border shadow-sm overflow-hidden">
                                     {(() => {
                                        const logoUrl = getAgreementLogoUrl(name);
                                        return logoUrl ? (
                                          <img src={logoUrl} loading="eager" fetchPriority="high" className="w-full h-full object-cover" />
                                        ) : (
                                          <span className="text-xs font-black text-slate-400">{(name || "").substring(0, 2).toUpperCase()}</span>
                                        );
                                     })()}
                                   </div>
                                   <span className="text-[10px] font-black uppercase text-left">{name}</span>
                                 </button>
                               ))}
                           </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Campo Extra (Espécie ou Sub-Convênio) */}
                  {formData.agreement !== "CLT PRIVADO" && (
                    <div className="space-y-1.5">
                      {formData.agreement === "INSS" ? (
                        <>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Espécie do Benefício</label>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setDropdownOpen({ ...dropdownOpen, species: !dropdownOpen.species })}
                              className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between font-black text-slate-800 hover:bg-slate-100 transition-all uppercase text-xs"
                            >
                              {inssSpecies.find(s => s.value === formData.benefit_species)?.label || "SELECIONE A ESPÉCIE"}
                              <Icons.ChevronDown />
                            </button>
                            <AnimatePresence>
                              {dropdownOpen.species && (
                                <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:10}} className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 z-[110] max-h-[350px] overflow-hidden flex flex-col">
                                   <div className="mb-3 sticky top-0 bg-white z-10">
                                      <input
                                        type="text"
                                        placeholder="BUSCAR ESPÉCIE..."
                                        value={speciesSearch}
                                        onChange={(e) => setSpeciesSearch(e.target.value)}
                                        className="w-full h-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase outline-none focus:border-blue-500"
                                        onClick={(e) => e.stopPropagation()}
                                        autoFocus
                                      />
                                   </div>
                                   <div className="overflow-y-auto space-y-1">
                                      {inssSpecies
                                        .filter(s => !speciesSearch || (s.label || "").toUpperCase().includes(speciesSearch.toUpperCase()))
                                        .map(s => (
                                          <button
                                            key={s.value}
                                            type="button"
                                            onClick={() => { setFormData(p => ({ ...p, benefit_species: s.value })); setDropdownOpen(p => ({ ...p, species: false })); setSpeciesSearch(""); }}
                                            className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-bold uppercase transition-all ${formData.benefit_species === s.value ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 text-slate-700'}`}
                                          >
                                            {s.label}
                                          </button>
                                      ))}
                                   </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </>
                      ) : (
                        <div className="relative">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            {formData.agreement === "SIAPE" ? "SITUAÇÃO FUNCIONAL" : formData.agreement === "FORÇAS ARMADAS" ? "CATEGORIA" : formData.agreement === "GOVERNOS" ? "ESTADOS" : "Força / Sub-Convênio"}
                          </label>
                          <button
                            type="button"
                            onClick={() => setSubDropdownOpen(!subDropdownOpen)}
                            className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between font-black text-slate-800 hover:bg-slate-100 transition-all uppercase text-sm disabled:opacity-50"
                            disabled={!formData.agreement}
                          >
                            <div className="flex items-center gap-3">
                               {(() => {
                                 const url = getSubAgreementLogoUrl(formData.sub_agreement, formData.agreement);
                                 if (url) return <img src={url} loading="eager" fetchPriority="high" className="w-8 h-8 rounded-lg object-cover bg-white shadow-sm" />;
                                 if (formData.sub_agreement) {
                                   const parts = formData.sub_agreement.split("-");
                                   const monogram = (parts.length > 1 && parts[1]) ? parts[1].trim().substring(0, 2).toUpperCase() : formData.sub_agreement.substring(0, 2).toUpperCase();
                                   return (
                                     <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                                       {monogram}
                                     </div>
                                   );
                                 }
                                 return null;
                               })()}
                               {formData.sub_agreement || (formData.agreement === "SIAPE" ? "SITUAÇÃO FUNCIONAL" : formData.agreement === "FORÇAS ARMADAS" ? "CATEGORIA" : formData.agreement === "GOVERNOS" ? "ESTADOS" : "SUB-CONVÊNIO")}
                            </div>
                          <Icons.ChevronDown />
                          </button>
                        <AnimatePresence>
                          {subDropdownOpen && (
                            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:10}} className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 z-[100] max-h-[400px] overflow-hidden flex flex-col">
                               <div className="mb-3 sticky top-0 bg-white z-10">
                                  <input
                                    type="text"
                                    placeholder="BUSCAR..."
                                    value={subAgreementSearch}
                                    onChange={(e) => setSubAgreementSearch(e.target.value)}
                                    className="w-full h-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase outline-none focus:border-blue-500"
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                  />
                               </div>
                               <div className="overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                                 {(() => {
                                    const filterList = (list) => list.filter(item => {
                                      const text = typeof item === 'string' ? item : (item.label || "");
                                      return !subAgreementSearch || text.toUpperCase().includes(subAgreementSearch.toUpperCase());
                                    });

                                    const subLogosFiltered = (subLogos || []).filter(l => norm(l.parent) === norm(formData.agreement));

                                    if (formData.agreement === "INSS") {
                                       return filterList(["INSS - APOSENTADO", "INSS - PENSIONISTA", "INSS - BPC / LOAS"]).map(name => {
                                           const logoUrl = getSubAgreementLogoUrl(name, "INSS");
                                           return (
                                             <button key={name} type="button" onClick={() => { setFormData(p => ({ ...p, sub_agreement: name })); setSubDropdownOpen(false); setSubAgreementSearch(""); }} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border font-black text-[10px] uppercase ${formData.sub_agreement === name ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30' : 'bg-slate-50 text-slate-700 border-slate-100 hover:border-blue-300'}`}>
                                               <div className="w-10 h-10 bg-white rounded-xl shrink-0 flex items-center justify-center border shadow-sm overflow-hidden">
                                                 {logoUrl ? <img src={logoUrl} loading="eager" fetchPriority="high" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-400">IN</div>}
                                               </div>
                                               <span className="text-[10px] font-black uppercase text-left">{name}</span>
                                             </button>
                                           );
                                       });
                                    } else if (formData.agreement === "FORÇAS ARMADAS") {
                                       return filterList(["EXÉRCITO", "MARINHA", "AERONÁUTICA"]).map(name => {
                                           const logoObj = (subLogos || []).find(l => norm(l.name) === norm(name));
                                           return (
                                             <button key={name} type="button" onClick={() => { setFormData(p => ({ ...p, sub_agreement: name })); setSubDropdownOpen(false); setSubAgreementSearch(""); }} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border font-black text-[10px] uppercase ${formData.sub_agreement === name ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30' : 'bg-slate-50 text-slate-700 border-slate-100 hover:border-blue-300'}`}>
                                               <div className="w-10 h-10 bg-white rounded-xl shrink-0 flex items-center justify-center border shadow-sm overflow-hidden">
                                                 {logoObj?.logo_url ? <img src={getStaticUrl(logoObj.logo_url)} loading="eager" fetchPriority="high" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-400">FO</div>}
                                               </div>
                                               <span className="text-[10px] font-black uppercase text-left">{name}</span>
                                             </button>
                                           );
                                       });
                                    } else if (formData.agreement === "SIAPE") {
                                       return filterList(["01- ATIVO", "02- APOSENTADO", "03- PENSIONISTA"]).map(name => {
                                           const logoObj = (subLogos || []).find(l => norm(l.name) === norm(name));
                                           return (
                                             <button key={name} type="button" onClick={() => { setFormData(p => ({ ...p, sub_agreement: name })); setSubDropdownOpen(false); setSubAgreementSearch(""); }} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border font-black text-[10px] uppercase ${formData.sub_agreement === name ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30' : 'bg-slate-50 text-slate-700 border-slate-100 hover:border-blue-300'}`}>
                                               <div className="w-10 h-10 bg-white rounded-xl shrink-0 flex items-center justify-center border shadow-sm overflow-hidden">
                                                 {logoObj?.logo_url ? <img src={getStaticUrl(logoObj.logo_url)} loading="eager" fetchPriority="high" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100"></div>}
                                               </div>
                                               {name}
                                             </button>
                                           );
                                       });
                                    } else if (formData.agreement === "GOVERNOS") {
                                       const govList = [
                                         { value: "AC", label: "AC - ACRE" }, { value: "AL", label: "AL - ALAGOAS" }, { value: "AP", label: "AP - AMAPÁ" },
                                         { value: "AM", label: "AM - AMAZONAS" }, { value: "BA", label: "BA - BAHIA" }, { value: "CE", label: "CE - CEARÁ" },
                                         { value: "DF", label: "DF - DISTRITO FEDERAL" }, { value: "ES", label: "ES - ESPÍRITO SANTO" }, { value: "GO", label: "GO - GOIÁS" },
                                         { value: "MA", label: "MA - MARANHÃO" }, { value: "MT", label: "MT - MATO GROSSO" }, { value: "MS", label: "MS - MATO GROSSO DO SUL" },
                                         { value: "MG", label: "MG - MINAS GERAIS" }, { value: "PA", label: "PA - PARÁ" }, { value: "PB", label: "PB - PARAÍBA" },
                                         { value: "PR", label: "PR - PARANÁ" }, { value: "PE", label: "PE - PERNAMBUCO" }, { value: "PI", label: "PI - PIAUÍ" },
                                         { value: "RJ", label: "RJ - RIO DE JANEIRO" }, { value: "RN", label: "RN - RIO GRANDE DO NORTE" }, { value: "RS", label: "RS - RIO GRANDE DO SUL" },
                                         { value: "RO", label: "RO - RONDÔNIA" }, { value: "RR", label: "RR - RORAIMA" }, { value: "SC", label: "SC - SANTA CATARINA" },
                                         { value: "SP", label: "SP - SÃO PAULO" }, { value: "SE", label: "SE - SERGIPE" }, { value: "TO", label: "TO - TOCANTINS" }
                                       ];
                                       return filterList(govList).map(state => {
                                           const logoObj = (subLogos || []).find(l => {
                                               const nL = norm(l.name);
                                               return nL && (nL === norm(state.value) || nL === norm(state.label));
                                           });
                                           return (
                                             <button key={state.value} type="button" onClick={() => { setFormData(p => ({ ...p, sub_agreement: state.label })); setSubDropdownOpen(false); setSubAgreementSearch(""); }} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border font-black text-[10px] uppercase ${formData.sub_agreement === state.label ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30' : 'bg-slate-50 text-slate-700 border-slate-100 hover:border-blue-300'}`}>
                                               <div className="w-10 h-10 bg-white rounded-xl shrink-0 flex items-center justify-center border shadow-sm overflow-hidden">
                                                 {logoObj?.logo_url ? <img src={getStaticUrl(logoObj.logo_url)} loading="eager" fetchPriority="high" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-400">{state.value}</div>}
                                               </div>
                                               <span className="text-[10px] font-black uppercase text-left">{state.label}</span>
                                             </button>
                                           );
                                       });
                                    } else if (subLogosFiltered.length > 0) {
                                       return filterList(subLogosFiltered).map(l => {
                                         const safeName = l.name || "";
                                         return (
                                           <button key={l.id} type="button" onClick={() => { setFormData(p => ({ ...p, sub_agreement: safeName })); setSubDropdownOpen(false); setSubAgreementSearch(""); }} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border ${norm(formData.sub_agreement) === norm(safeName) ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30' : 'bg-slate-50 text-slate-700 border-slate-100 hover:border-blue-300'}`}>
                                             <div className="w-10 h-10 bg-white rounded-xl shrink-0 flex items-center justify-center border shadow-sm overflow-hidden">
                                                {l.logo_url ? (
                                                  <img src={getStaticUrl(l.logo_url)} loading="eager" fetchPriority="high" className="w-full h-full object-cover" />
                                                ) : (
                                                  <span className="text-xs font-black text-slate-400">{safeName.substring(0, 2).toUpperCase()}</span>
                                                )}
                                             </div>
                                             <span className="text-[10px] font-black uppercase text-left">{safeName}</span>
                                           </button>
                                         );
                                       });
                                    } else {
                                       return <div className="col-span-2 py-4 text-center text-[10px] font-black text-slate-400 uppercase italic">Nenhum sub-convênio encontrado</div>;
                                    }
                                 })()}
                               </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                  )}
               </div>
            </div>

            {/* Contratos */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 border border-orange-500/20">
                      <Icons.CreditCard />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Contratos Ativos</h3>
                  </div>
                  <button type="button" onClick={addContract} disabled={contracts.length >= 5} className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50">
                    <Icons.Plus /> Novo Contrato
                  </button>
               </div>

               <div className="flex flex-wrap gap-2 mb-8 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                  {contracts.map((c, idx) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveContractIndex(idx)}
                      className={`flex items-center gap-3 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeContractIndex === idx ? 'bg-white text-blue-600 shadow-xl border border-slate-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                    >
                      Contrato {idx + 1}
                      {contracts.length > 1 && (
                        <div onClick={(e) => { e.stopPropagation(); removeContract(c.id); }} className="hover:text-red-500 transition-colors p-1">
                           <Icons.Trash size={12} />
                        </div>
                      )}
                    </button>
                  ))}
               </div>

               <AnimatePresence mode="wait">
                  {contracts[activeContractIndex] && (
                    <motion.div
                      key={contracts[activeContractIndex].id}
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                       <div className="space-y-1.5 relative md:col-span-2 lg:col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Banco Origem</label>
                          <button
                            type="button"
                            onClick={() => setDropdownOpen({ ...dropdownOpen, [contracts[activeContractIndex].id]: !dropdownOpen[contracts[activeContractIndex].id] })}
                            className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between font-black text-slate-800 hover:bg-slate-100 transition-all uppercase text-[11px]"
                          >
                            <div className="flex-1 text-left truncate pr-2 flex items-center gap-3">
                               {contracts[activeContractIndex].banco ? (() => {
                                  const selectedBank = inssBanks.find(b => b.value === contracts[activeContractIndex].banco);
                                  if (!selectedBank) return "SELECIONAR BANCO";
                                  const bankLabel = selectedBank.label || "";
                                  const bankName = bankLabel.includes('-') ? bankLabel.substring(bankLabel.indexOf('-') + 1).trim() : bankLabel;
                                  const dbBank = (dbBanks || []).find(db => db.name && norm(bankLabel).includes(norm(db.name)));
                                  const subLogoObj = (subLogos || []).find(l => {
                                    const nL = norm(l.name);
                                    return nL && (nL === norm(bankName) || norm(bankLabel).includes(nL));
                                  });
                                  const logoUrl = subLogoObj?.logo_url || dbBank?.logo_url;
                                  return (
                                    <>
                                      <div className="w-6 h-6 rounded-md bg-white border border-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center relative">
                                        {logoUrl ? (
                                          <>
                                            <img
                                              src={getStaticUrl(logoUrl)}
                                              onError={(e) => { e.target.style.display = 'none'; const f = e.target.parentNode.querySelector('.img-fallback'); if (f) f.style.display = 'flex'; }}
                                              className="w-full h-full object-cover"
                                            />
                                            <div className="img-fallback hidden w-full h-full items-center justify-center font-bold text-[8px] text-slate-400 bg-slate-100 uppercase">
                                              {bankName.substring(0, 2)}
                                            </div>
                                          </>
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center font-bold text-[8px] text-slate-400 bg-slate-100 uppercase">
                                            {bankName.substring(0, 2)}
                                          </div>
                                        )}
                                      </div>
                                      {bankLabel}
                                    </>
                                  );
                               })() : "SELECIONAR BANCO"}
                            </div>
                            <Icons.ChevronDown />
                          </button>
                          {dropdownOpen[contracts[activeContractIndex].id] && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-4 z-[100] max-h-[400px] overflow-hidden flex flex-col">
                               <div className="mb-3 sticky top-0 bg-white z-10">
                                  <input
                                    type="text"
                                    placeholder="BUSCAR BANCO..."
                                    value={bankSearch}
                                    onChange={(e) => setBankSearch(e.target.value)}
                                    className="w-full h-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-black uppercase outline-none focus:border-blue-500"
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                  />
                               </div>
                               <div className="overflow-y-auto space-y-1">
                                 {inssBanks
                                   .filter(bank => !bankSearch || bank.label.toUpperCase().includes(bankSearch.toUpperCase()))
                                   .map(bank => {
                                      const bankName = bank.label.substring(bank.label.indexOf('-') + 1).trim();
                                      const dbBank = dbBanks.find(db => db.name && norm(bank.label).includes(norm(db.name)));
                                      const subLogoObj = (subLogos || []).find(l => {
                                        const nL = norm(l.name);
                                        return nL && (nL === norm(bankName) || norm(bank.label).includes(nL));
                                      });
                                      const logoUrl = subLogoObj?.logo_url || dbBank?.logo_url;
                                      return (
                                        <button key={bank.value} type="button" onClick={() => { setContracts(contracts.map((c, i) => i === activeContractIndex ? { ...c, banco: bank.value } : c)); setDropdownOpen(p => ({ ...p, [contracts[activeContractIndex].id]: false })); setBankSearch(""); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-[11px] font-bold text-slate-700 hover:bg-blue-50 transition-all uppercase">
                                          <div className="w-6 h-6 rounded-md bg-white border border-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center relative">
                                            {logoUrl ? (
                                              <>
                                                <img
                                                  src={getStaticUrl(logoUrl)}
                                                  onError={(e) => { e.target.style.display = 'none'; const f = e.target.parentNode.querySelector('.img-fallback'); if (f) f.style.display = 'flex'; }}
                                                  className="w-full h-full object-cover"
                                                />
                                                <div className="img-fallback hidden w-full h-full items-center justify-center font-bold text-[8px] text-slate-400 bg-slate-100 uppercase">
                                                  {bankName.substring(0, 2)}
                                                </div>
                                              </>
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center font-bold text-[8px] text-slate-400 bg-slate-100 uppercase">
                                                {bankName.substring(0, 2)}
                                              </div>
                                            )}
                                          </div>
                                          {bank.label}
                                        </button>
                                      );
                                   })}
                               </div>
                            </div>
                          )}
                       </div>

                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor da Parcela</label>
                          <input type="text" name="parcela" value={contracts[activeContractIndex].parcela} onChange={(e) => handleContractChange(contracts[activeContractIndex].id, e)} placeholder="R$ 0,00" className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white transition-all outline-none font-black text-slate-800" required />
                       </div>

                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Saldo Devedor</label>
                          <input type="text" name="saldoDevedor" value={contracts[activeContractIndex].saldoDevedor} onChange={(e) => handleContractChange(contracts[activeContractIndex].id, e)} placeholder="R$ 0,00" className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white transition-all outline-none font-black text-slate-800" required />
                       </div>

                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prazo Total (Meses)</label>
                          <input type="text" name="prazoTotal" value={contracts[activeContractIndex].prazoTotal} onChange={(e) => handleContractChange(contracts[activeContractIndex].id, e)} placeholder="84" className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white transition-all outline-none font-black text-slate-800 text-center" required />
                       </div>

                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parcelas Pagas</label>
                          <input
                            type="text"
                            name="parcelasPagas"
                            value={formData.agreement === "SIAPE" ? "0" : contracts[activeContractIndex].parcelasPagas}
                            onChange={(e) => handleContractChange(contracts[activeContractIndex].id, e)}
                            placeholder="12"
                            disabled={formData.agreement === "SIAPE"}
                            className={`w-full h-14 px-6 rounded-2xl border transition-all outline-none font-black text-center ${
                              formData.agreement === "SIAPE"
                                ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                : "bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white text-slate-800"
                            }`}
                            required
                          />
                       </div>

                       <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-4 pt-4 border-t border-slate-100">
                          <div className="flex items-center gap-2 mb-4">
                             <span className="text-lg">🔬</span>
                             <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Preview de Cálculo (Como o Motor Vai Ler)</h4>
                          </div>
                          <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                             <div className="space-y-1 w-full md:w-auto">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Taxa Portabilidade HP-12C (Cliente)</label>
                                <p className="text-[9px] text-slate-400 font-bold uppercase italic">Cálculo automático baseado nos dados do contrato</p>
                             </div>
                             <div className="relative w-full md:w-48">
                                <input type="text" value={contracts[activeContractIndex].taxaAtual || "0.00"} readOnly className="w-full h-14 pl-6 pr-12 rounded-2xl bg-slate-50 border border-blue-200 transition-all outline-none font-black text-blue-600 text-xl shadow-inner text-center cursor-not-allowed" />
                                <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-blue-400 text-lg">%</span>
                             </div>
                          </div>
                       </div>
                    </motion.div>
                  )}
               </AnimatePresence>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-end pt-8">
               <button type="button" onClick={() => router.back()} className="px-10 py-5 rounded-2xl bg-white text-slate-500 font-black uppercase tracking-[0.2em] text-xs border border-slate-200 hover:bg-slate-50 transition-all shadow-xl">Cancelar</button>
               <button type="submit" disabled={loading} className="px-12 py-5 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-[0.2em] text-sm hover:bg-blue-700 transition-all shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] flex items-center gap-3 relative overflow-hidden group">
                  {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <Icons.Rocket />}
                  {loading ? "PROCESSANDO..." : "INICIAR ANÁLISE MASTER"}
               </button>
            </div>
          </div>
        </form>
      </div>

      {/* EXTRACT MODAL */}
      {extractModalOpen && extractedData && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 999999 }}>
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setExtractModalOpen(false)}></div>
          <div className="relative bg-slate-50 rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-up" style={{ zIndex: 999999 }}>

            <div className="px-8 py-6 bg-white border-b border-slate-100 flex justify-between items-center z-10 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Icons.FileText size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-xl uppercase tracking-tight">{extractedData.cliente || "Cliente Não Identificado"}</h3>
                  <div className="flex flex-col gap-1 mt-1.5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Nº DO BENEFÍCIO: <span className="text-blue-600 font-black bg-blue-50 px-2 py-0.5 rounded-md ml-1">{extractedData.beneficio}</span>
                    </p>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-md inline-block w-fit mt-0.5">
                      {getMatchedSpecies(extractedData.especie)}
                    </p>
                    {extractedData.bloqueado_emprestimo !== undefined && extractedData.bloqueado_emprestimo !== null && (
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md w-fit mt-0.5 ${extractedData.bloqueado_emprestimo ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {extractedData.bloqueado_emprestimo ? <Icons.Lock size={12} /> : <Icons.Unlock size={12} />}
                        <span className="text-[9px] font-black uppercase tracking-widest">
                          {extractedData.bloqueado_emprestimo ? 'BLOQUEADO PARA EMPRÉSTIMO' : 'LIBERADO PARA EMPRÉSTIMO'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setExtractModalOpen(false)} className="w-10 h-10 bg-slate-100 hover:bg-red-100 hover:text-red-500 text-slate-400 rounded-xl flex items-center justify-center transition-colors text-xl font-black">×</button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 flex flex-col gap-8 custom-scrollbar">
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 opacity-10 ${extractedData.margem_disponivel >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Resumo da Margem</h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 items-center">
                    <div className="flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6">
                      <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Margem Consignável</span>
                      <span className="text-xl font-black text-slate-800">{formatBRL(extractedData.margem_maxima)}</span>
                    </div>
                    <div className="flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6 md:pl-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Utilizado</span>
                      <span className="text-xl font-black text-slate-800">{formatBRL(extractedData.margem_comprometida)}</span>
                    </div>
                    <div className={`p-4 rounded-2xl ${extractedData.margem_disponivel >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} border flex flex-col justify-center relative`}>
                      <span className={`block text-[9px] font-black uppercase tracking-widest mb-1 ${extractedData.margem_disponivel >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Margem Disponível</span>
                      <span className={`block text-2xl font-black ${extractedData.margem_disponivel >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {extractedData.margem_disponivel >= 0 ? '' : '- '}
                        {formatBRL(Math.abs(extractedData.margem_disponivel))}
                      </span>
                      {extractedData.margem_disponivel > 20 && (
                        <span className="block mt-1 text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                          Libera Aprox. {formatBRL(extractedData.valor_liberado_margem || 0)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 pl-2">Empréstimos Ativos ({extractedData.emprestimos_ativos?.length || 0})</h4>
                <div className="space-y-4">
                  {extractedData.emprestimos_ativos?.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhum empréstimo ativo encontrado.</p>
                    </div>
                  ) : (
                      (extractedData.emprestimos_ativos || []).map((loan, idx) => {
                        const loanIsUsed = contracts.some(c => {
                          if (c.numeroContrato && loan.contrato && c.numeroContrato === loan.contrato) return true;
                          return c.parcela && c.parcela.replace(/\D/g, '') === loan.parcela.toFixed(2).replace(/\D/g, '');
                        });
                        const isSelected = selectedExtractLoanIndices.includes(idx);
                        const Tag = loanIsUsed ? 'div' : 'label';

                        return (
                        <Tag key={idx} className={`block relative bg-white p-5 rounded-[2rem] border-2 transition-all ${loanIsUsed ? 'opacity-50 cursor-not-allowed border-slate-100 bg-slate-50' : 'cursor-pointer hover:shadow-xl'} ${isSelected ? 'border-blue-500 shadow-blue-500/20' : 'border-slate-100'}`}>
                          <div className="flex items-center gap-4">
                            <input
                              type="checkbox"
                              className="w-5 h-5 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 disabled:opacity-50"
                              checked={isSelected}
                              disabled={loanIsUsed}
                              onChange={() => {
                                setSelectedExtractLoanIndices(prev =>
                                  prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                                );
                              }}
                            />

                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                              <div className="min-w-0 pr-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Banco / Contrato</p>
                                <p className="text-xs font-black text-slate-800 uppercase leading-tight">{loan.banco}</p>
                                <p className="text-[10px] font-bold text-slate-400">{loan.contrato}</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Parcela / Taxa</p>
                                <p className="text-xs font-black text-slate-800">{formatBRL(loan.parcela)} <span className="text-emerald-500 ml-1">({loan.taxa_mensal.toFixed(2)}%)</span></p>
                              </div>
                              <div className="hidden md:block">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Prazo Restante</p>
                                <p className="text-xs font-black text-slate-800"><span className="text-slate-800">{loan.prazo_restante}</span> <span className="text-slate-400 font-bold">de {loan.prazo_total}</span></p>
                              </div>
                              <div className="hidden md:block">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Saldo Devedor</p>
                                <p className="text-xs font-black text-blue-600">{formatBRL(loan.saldo_devedor)}</p>
                              </div>
                            </div>

                            {loanIsUsed && (
                              <div className="absolute right-4 top-4 bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                Já Importado
                              </div>
                            )}
                          </div>
                        </Tag>
                      )})
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-200 flex justify-center gap-4 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
              <button onClick={() => setExtractModalOpen(false)} className="px-8 py-4 rounded-2xl bg-white text-slate-500 font-black uppercase tracking-widest text-xs border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">Cancelar</button>
              <button
                onClick={() => {
                  handleUseLoan();
                  setExtractModalOpen(false);
                }}
                disabled={selectedExtractLoanIndices.length === 0}
                className="px-8 py-4 rounded-2xl bg-blue-400 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Importar ({selectedExtractLoanIndices.length}) Contrato(s)
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CPF MODAL */}
      {cpfModalOpen && cpfData && activeBenefit && typeof window !== 'undefined' && (() => {
        const margensAtivas =
          activeBenefit?.margens ||
          activeBenefit?.resumo?.margens ||
          {};

        const activeConventionModal = String(
          activeBenefit?.convenio ||
          formData.agreement ||
          "INSS"
        ).trim().toUpperCase();

        const isSiapeModal =
          activeConventionModal === "SIAPE";

        const salario = Number(
          (isSiapeModal
            ? margensAtivas.salario_bruto
            : undefined) ??
          margensAtivas.salario ??
          activeBenefit?.cliente?.salario ??
          activeBenefit?.salario ??
          0
        );

        const valorLiquido = Number(
          margensAtivas.valor_liquido ?? 0
        );

        const descontos = Number(
          margensAtivas.descontos ?? 0
        );

        const especie = String(
          activeBenefit?.cliente?.especie ||
          activeBenefit?.especie ||
          ""
        );

        const codigoEspecie =
          especie.match(/\d+/)?.[0] || "";

        const isLOAS =
          !isSiapeModal &&
          ["87", "88"].includes(codigoEspecie);

        const percent = isLOAS ? 0.35 : 0.40;

        const margemConsignavel = isSiapeModal
          ? 0
          : Number(
              margensAtivas.margem_emprestimo ??
              margensAtivas.margem_consignavel ??
              (salario * percent)
            );

        const totalComprometido = isSiapeModal
          ? descontos
          : Number(
              margensAtivas.total_comprometido ??
              margensAtivas.total_comprometimento ??
              0
            );

        const margemLivreInformada = isSiapeModal
          ? (
              margensAtivas.margem_disponivel ??
              margensAtivas.margem_livre ??
              activeBenefit?.margem_livre
            )
          : (
              margensAtivas.margem_livre ??
              activeBenefit?.margem_livre
            );

        const margemLivreReal =
          margemLivreInformada !== undefined &&
          margemLivreInformada !== null
            ? Number(margemLivreInformada)
            : isSiapeModal
              ? 0
              : margemConsignavel -
                totalComprometido;

        const showMargem = Math.max(
          margemLivreReal,
          0
        );

        const coeficienteUtilizado = Number(
          activeBenefit?.cliente?.coeficiente_utilizado ??
          margensAtivas.coeficiente_utilizado ??
          (isSiapeModal ? 0 : 0.02270)
        );

        const valorLiberadoMargem = Number(
          margensAtivas.valor_liberado_margem ??
          activeBenefit?.valor_liberado_margem ??
          (
            showMargem > 0 &&
            coeficienteUtilizado > 0
              ? showMargem / coeficienteUtilizado
              : 0
          )
        );

        const isMagnetico = () => {
          if (!activeBenefit || !activeBenefit.banco_pagador) return true;
          const tipo = String(activeBenefit.banco_pagador.tipo_pagamento || "").toUpperCase();
          const conta = String(activeBenefit.banco_pagador.conta || "").trim();
          if (tipo.includes("MAGNÉTICO") || tipo.includes("MAGNETICO") || tipo === "1" || !conta) {
            return true;
          }
          return false;
        };

        const formatDateBRLocal = (dateStr) => {
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

        const formatPhoneLocal = (phoneStr) => {
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

        return createPortal(
          <div className="fixed inset-0 flex items-center justify-center p-4 animate-in fade-in duration-350" style={{ zIndex: 999999 }}>
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setCpfModalOpen(false)}></div>
            <div className="relative bg-slate-50 shadow-2xl w-full max-w-5xl h-full sm:h-auto max-h-screen sm:max-h-[90vh] rounded-none sm:rounded-[3rem] overflow-y-auto sm:overflow-hidden flex flex-col z-20" style={{ zIndex: 999999 }}>

              {/* Header */}
              <div className="px-4 py-4 sm:px-8 sm:py-6 bg-white border-b border-slate-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10 shadow-sm relative">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full">
                  <div className="hidden sm:flex w-12 h-12 bg-gradient-to-tr from-amber-500 to-yellow-600 text-white rounded-2xl items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                    <CrownIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-full pr-10 sm:pr-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-800 text-base sm:text-xl uppercase tracking-tight break-all sm:break-normal">{activeBenefit.cliente?.nome || "Cliente Não Identificado"}</h3>
                      <PremiumBadge />
                    </div>
                    <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1.5 mt-2 text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest items-center">
                      <span className="flex items-center gap-1"><CpfIcon className="w-3.5 h-3.5 text-emerald-500" /> CPF: <span className="text-slate-800">{activeBenefit.cliente?.cpf ? maskCPF(activeBenefit.cliente.cpf) : ""}</span></span>
                      <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5 text-purple-500" /> Nasc: <span className="text-slate-800">{activeBenefit.cliente?.data_nascimento ? formatDateBRLocal(activeBenefit.cliente.data_nascimento) : "Não Informada"}{activeBenefit.cliente?.idade ? ` (${activeBenefit.cliente.idade} a)` : ""}</span></span>
                      <span className="flex items-center gap-1"><FiliaçãoIcon className="w-3.5 h-3.5 text-indigo-500" /> Filiação: <span className="text-slate-800">{activeBenefit.cliente?.filiacao || "Não Informada"}</span></span>
                      {activeBenefit.telefones && activeBenefit.telefones.length > 0 && (
                        <span className="flex items-center gap-1"><PhoneIcon className="w-3.5 h-3.5 text-teal-500" /> Tel: <span className="text-slate-800">{activeBenefit.telefones.map(t => formatPhoneLocal(t)).join(" / ")}</span></span>
                      )}
                      <span>NB: <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">{activeBenefit.cliente?.beneficio || activeBenefit.numero}</span></span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setCpfModalOpen(false)} className="absolute top-4 right-4 sm:relative sm:top-0 sm:right-0 w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 hover:bg-red-100 hover:text-red-500 text-slate-400 rounded-xl flex items-center justify-center transition-colors text-xl font-black">×</button>
              </div>

              {/* Abas dos benefícios */}
              {beneficiosCpf.length > 1 && (
                <div className="px-4 py-3 sm:px-8 sm:py-4 bg-slate-100 border-b border-slate-200 z-10">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">
                      Benefícios encontrados ({beneficiosCpf.length}):
                    </span>

                    {beneficiosCpf.map((beneficioItem, idx) => {
                      const numeroBeneficio =
                        beneficioItem?.numero ||
                        beneficioItem?.numero_beneficio ||
                        beneficioItem?.cliente?.beneficio ||
                        beneficioItem?.beneficio?.numero ||
                        `Benefício ${idx + 1}`;

                        const itemConvention = String(
                          beneficioItem?.convenio ||
                          activeConventionModal
                        ).trim().toUpperCase();

                        const isSiapeItem =
                          itemConvention === "SIAPE";

                        const matriculaBeneficio =
                          beneficioItem?.beneficio?.matricula ||
                          beneficioItem?.matricula ||
                          beneficioItem?.cliente?.matricula ||
                          numeroBeneficio;

                        const descricaoBeneficio = isSiapeItem
                          ? (
                              beneficioItem?.beneficio?.orgao ||
                              beneficioItem?.orgao ||
                              beneficioItem?.beneficio?.instituto ||
                              beneficioItem?.instituto ||
                              ""
                            )
                          : (
                              beneficioItem?.cliente?.especie ||
                              beneficioItem?.beneficio?.especie ||
                              beneficioItem?.especie ||
                              ""
                            );

                      return (
                        <button
                          key={`${numeroBeneficio}-${idx}`}
                          type="button"
                          onClick={() => {
                            setActiveBenefitIndex(idx);
                            setSelectedCpfLoanIndices([]);
                          }}
                          className={`min-w-[160px] px-4 py-3 rounded-2xl text-left transition-all border ${
                            activeBenefitIndex === idx
                              ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20"
                              : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                          }`}
                        >
                          <span className="block text-[9px] font-black uppercase tracking-widest opacity-75">
                            {isSiapeItem ? "Vínculo" : "Benefício"} {idx + 1}
                          </span>

                          <span className="block text-xs font-black uppercase mt-0.5">
                            {isSiapeItem ? "Matrícula" : "NB"}{" "}{isSiapeItem ? matriculaBeneficio : numeroBeneficio}
                          </span>

                          {descricaoBeneficio && (
                            <span className="block text-[8px] font-bold uppercase mt-1 truncate opacity-80">
                              {descricaoBeneficio}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {totalBeneficiosInformado > 1 && beneficiosCpf.length <= 1 && (
                <div className="px-8 py-3 bg-amber-50 border-b border-amber-200 z-10">
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider">
                    A consulta informou {totalBeneficiosInformado} benefícios,
                    mas somente {beneficiosCpf.length} benefício completo foi
                    retornado pela API.
                  </p>
                </div>
              )}

              {/* Corpo */}
              <div className="p-4 sm:p-8 overflow-y-visible sm:overflow-y-auto flex-none sm:flex-1 flex flex-col gap-6 sm:gap-8 custom-scrollbar">

                {/* Dados Benefício & Bancários */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Benefício */}
                  {isSiapeModal ? (
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-150 shadow-sm relative">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                        Dados do Vínculo SIAPE
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-slate-800">
                        <div>
                          <span className="block text-[9px] text-slate-400 uppercase">Matrícula</span>
                          <p className="text-sm font-black mt-0.5">
                            {activeBenefit.beneficio?.matricula || activeBenefit.matricula || "Não Informada"}
                          </p>
                        </div>

                        <div>
                          <span className="block text-[9px] text-slate-400 uppercase">Regime Jurídico</span>
                          <p className="text-sm font-black mt-0.5">
                            {activeBenefit.beneficio?.regime_juridico || activeBenefit.regime_juridico || "Não Informado"}
                          </p>
                        </div>

                        <div>
                          <span className="block text-[9px] text-slate-400 uppercase">Órgão</span>
                          <p className="text-sm font-black mt-0.5">
                            {activeBenefit.beneficio?.orgao || activeBenefit.orgao || "Não Informado"}
                          </p>
                        </div>

                        <div>
                          <span className="block text-[9px] text-slate-400 uppercase">Instituto</span>
                          <p className="text-sm font-black mt-0.5">
                            {activeBenefit.beneficio?.instituto || activeBenefit.instituto || "Não Informado"}
                          </p>
                        </div>
                      </div>

                      {activeBenefit.cliente?.endereco && (
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <span className="block text-[9px] text-slate-400 uppercase">Endereço</span>
                          <p className="text-[11px] font-medium text-slate-600 uppercase">
                            {activeBenefit.cliente.endereco}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-150 shadow-sm relative">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalhamento do Benefício</h4>

                      {activeBenefit.beneficio?.bloqueio_emprestimo && (
                        <div>
                          {activeBenefit.beneficio.bloqueio_emprestimo.toLowerCase().includes("sim") || activeBenefit.beneficio.bloqueado === true ? (
                            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[8px] font-black tracking-wider border border-red-200">
                              <LockPremiumIcon className="w-3 h-3" />
                              <span>BLOQUEADO</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[8px] font-black tracking-wider border border-emerald-200">
                              <UnlockPremiumIcon className="w-3 h-3" />
                              <span>LIBERADO</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 text-xs font-bold text-slate-800">
                      <div>
                        <span className="block text-[9px] text-slate-400 uppercase">Espécie</span>
                        <p className="text-sm font-black text-slate-800 mt-0.5">{activeBenefit.cliente?.especie || "Não Informada"}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
                        <div>
                          <span className="block text-[9px] text-slate-400 uppercase">Situação</span>
                          <p className={`text-[10px] font-black uppercase inline-block px-2.5 py-1 rounded-xl mt-0.5 ${(activeBenefit.beneficio?.situacao || "").toUpperCase() === "ATIVO" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
                            {activeBenefit.beneficio?.situacao || "Desconhecida"}
                          </p>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400 uppercase">Data Concessão (DDB)</span>
                          <p className="text-sm font-black text-slate-800 mt-0.5">{activeBenefit.beneficio?.ddb ? formatDateBRLocal(activeBenefit.beneficio.ddb) : "Não Informada"}</p>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400 uppercase">UF do Benefício</span>
                          <p className="text-sm font-black text-slate-800 mt-0.5">{activeBenefit.beneficio?.uf || "Não Informada"}</p>
                        </div>
                      </div>
                    </div>

                    {activeBenefit.cliente?.endereco && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <span className="block text-[9px] text-slate-400 uppercase">Endereço</span>
                        <p className="text-[11px] font-medium text-slate-600 uppercase">{activeBenefit.cliente.endereco}</p>
                      </div>
                    )}
                  </div>
                  )}

                  {/* Dados Bancários */}
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-150 shadow-sm flex flex-col justify-between">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1">
                      <Icons.Landmark size={12} /> Conta Pagadora
                    </h4>

                    <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-800 flex-1">
                      <div className="col-span-2">
                        <span className="block text-[9px] text-slate-400 uppercase">Banco</span>
                        <p className="truncate uppercase">{formatBankName(activeBenefit.banco_pagador?.codigo, activeBenefit.banco_pagador?.nome)}</p>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 uppercase">Agência</span>
                        <p>{activeBenefit.banco_pagador?.agencia || "Não Informada"}</p>
                      </div>
                      {!isMagnetico() && (
                        <div>
                          <span className="block text-[9px] text-slate-400 uppercase">Conta</span>
                          <p>{activeBenefit.banco_pagador?.conta || "Não Informada"}</p>
                        </div>
                      )}
                      <div>
                        <span className="block text-[9px] text-slate-400 uppercase">Meio Pagamento</span>
                        <p className="text-[11px]">{activeBenefit.banco_pagador?.tipo_pagamento || (isMagnetico() ? "Cartão Magnético" : "Conta Corrente")}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Margens */}
                <div className="w-full bg-white p-6 rounded-[2rem] border border-slate-200 shadow-lg">
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Resumo da Margem
                    </h4>

                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[9px] font-black uppercase">
                      {isSiapeModal ? "Margem SIAPE" : isLOAS ? "LOAS 35%" : "Margem 40%"}
                    </span>
                  </div>

                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="min-h-[92px] bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase mb-1">
                        {isSiapeModal ? "Salário Bruto" : "Salário Base"}
                      </span>
                      <span className="text-base font-black text-slate-800">
                        {formatBRL(salario)}
                      </span>
                    </div>

                    <div className="min-h-[92px] bg-blue-50 p-4 rounded-2xl border border-blue-100 flex flex-col justify-center">
                      <span className="text-[9px] font-black text-blue-500 uppercase mb-1">
                        {isSiapeModal ? "Valor Líquido" : `Consignável (${percent * 100}%)`}
                      </span>
                      <span className="text-base font-black text-blue-700">
                        {formatBRL(isSiapeModal ? valorLiquido : margemConsignavel)}
                      </span>
                    </div>

                    <div className="min-h-[92px] bg-amber-50 p-4 rounded-2xl border border-amber-100 flex flex-col justify-center">
                      <span className="text-[9px] font-black text-amber-600 uppercase mb-1">
                        {isSiapeModal ? "Descontos" : "Total Comprometido"}
                      </span>
                      <span className="text-base font-black text-amber-700">
                        {formatBRL(isSiapeModal ? descontos : totalComprometido)}
                      </span>
                    </div>

                    <div className={`min-h-[92px] p-4 rounded-2xl border flex flex-col justify-center ${
                      margemLivreReal < 0
                        ? "bg-red-50 border-red-200"
                        : "bg-emerald-50 border-emerald-200"
                    }`}>
                      <span className={`text-[9px] font-black uppercase mb-1 ${
                        margemLivreReal < 0
                          ? "text-red-600"
                          : "text-emerald-600"
                      }`}>
                        {isSiapeModal ? "Margem Disponível" : "Margem Livre"}
                      </span>

                      <span className={`text-lg font-black ${
                        margemLivreReal < 0
                          ? "text-red-700"
                          : "text-emerald-700"
                      }`}>
                        {formatBRL(margemLivreReal)}
                      </span>
                    </div>

                    <div className={`min-h-[92px] p-4 rounded-2xl border flex flex-col justify-center ${
                      margemLivreReal <= 0
                        ? "bg-slate-50 border-slate-200"
                        : "bg-emerald-50 border-emerald-200"
                    }`}>
                      <span className="text-[9px] font-black text-slate-500 uppercase mb-1">
                        {isSiapeModal ? "Valor Liberado Aprox." : "Liberado Aproximado"}
                      </span>

                      <span className={`text-lg font-black ${
                        margemLivreReal <= 0
                          ? "text-slate-400"
                          : "text-emerald-700"
                      }`}>
                        {formatBRL(margemLivreReal > 0 ? valorLiberadoMargem : 0)}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {isSiapeModal && coeficienteUtilizado <= 0
                            ? "Coeficiente SIAPE não configurado"
                            : `Coeficiente ${coeficienteUtilizado
                                .toFixed(5)
                                .replace(".", ",")}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Empréstimos */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 pl-2">Empréstimos Consignados ({activeBenefit.emprestimos?.length || 0})</h4>
                  <div className="space-y-4">
                    {!activeBenefit.emprestimos || activeBenefit.emprestimos.length === 0 ? (
                      <div className="p-8 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhum empréstimo ativo encontrado.</p>
                      </div>
                    ) : (
                      activeBenefit.emprestimos.map((loan, idx) => {
                        const loanIsUsed = contracts.some(c => {
                          if (c.numeroContrato && loan.contrato && c.numeroContrato === loan.contrato) return true;
                          return c.parcela && c.parcela.replace(/\D/g, '') === Number(loan.parcela).toFixed(2).replace(/\D/g, '');
                        });
                        const isSelected = selectedCpfLoanIndices.includes(idx);
                        const Tag = loanIsUsed ? 'div' : 'label';
                        const loanLogoUrl = getSubLogo(
                          loan.codigo,
                          loan.banco
                        );

                        return (
                          <Tag key={idx} className={`block relative bg-white p-5 rounded-[2rem] border-2 transition-all ${loanIsUsed ? 'opacity-50 cursor-not-allowed border-slate-100 bg-slate-50' : 'cursor-pointer hover:shadow-xl'} ${isSelected ? 'border-blue-500 shadow-blue-500/20' : 'border-slate-150'}`}>
                            <div className="flex items-center gap-4">
                              <input
                                type="checkbox"
                                className="w-5 h-5 text-blue-600 bg-slate-100 border-slate-350 rounded focus:ring-blue-500 disabled:opacity-50"
                                checked={isSelected}
                                disabled={loanIsUsed}
                                onChange={() => {
                                  setSelectedCpfLoanIndices(prev =>
                                    prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                                  );
                                }}
                              />

                              <div className="relative w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex-shrink-0 overflow-hidden flex items-center justify-center">
                                {loanLogoUrl ? (
                                  <img
                                    src={getStaticUrl(loanLogoUrl)}
                                    alt={loan.banco || "Banco"}
                                    className="w-full h-full object-cover scale-110"
                                    onError={(event) => {
                                      event.currentTarget.style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <span className="text-[9px] font-black text-slate-400 uppercase">
                                    {String(loan.banco || "B")
                                      .replace(/[^A-Za-zÀ-ÿ]/g, "")
                                      .slice(0, 2)
                                      .toUpperCase() || "B"}
                                  </span>
                                )}
                              </div>

                              <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
                                <div className="col-span-2 md:col-span-1 min-w-0 pr-2">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Banco / Contrato</p>
                                  <p className="text-xs font-black text-slate-800 uppercase leading-tight">{formatBankName(loan.codigo, loan.banco)}</p>
                                  <p className="text-[10px] font-bold text-slate-400">{loan.contrato}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Parcela / Taxa</p>
                                  <p className="text-xs font-black text-slate-800">{formatBRL(loan.parcela)} <span className="text-emerald-500 ml-1">({Number(loan.taxa || 0).toFixed(2)}%)</span></p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Valor Contrato</p>
                                  <p className="text-xs font-black text-slate-800">{formatBRL(Math.abs(Number(loan.valor_contrato || 0)))}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Saldo Devedor</p>
                                  <p className="text-xs font-black text-blue-600">{formatBRL(Math.abs(Number(loan.saldo_devedor || loan.quitacao || 0)))}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Prazo Restante</p>
                                  <p className="text-xs font-black text-slate-800"><span className="text-slate-800">{loan.prazo_restante}</span> <span className="text-slate-400 font-bold">de {loan.prazo}</span></p>
                                </div>
                              </div>

                              {loanIsUsed && (
                                <div className="absolute right-4 top-4 bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200">
                                  Já Importado
                                </div>
                              )}
                            </div>
                          </Tag>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Cartões */}
                  {isSiapeModal ? (
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 pl-2">
                        Margens de Cartão Disponíveis
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-[2rem] border border-slate-150 shadow-sm">
                          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            RMC Disponível
                          </span>
                          <p className="text-xl font-black text-emerald-600 mt-2">
                            {formatBRL(Number(activeBenefit.margens_cartao?.rmc_disponivel || 0))}
                          </p>
                        </div>

                        <div className="bg-white p-5 rounded-[2rem] border border-slate-150 shadow-sm">
                          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            RCC Disponível
                          </span>
                          <p className="text-xl font-black text-emerald-600 mt-2">
                            {formatBRL(Number(activeBenefit.margens_cartao?.rcc_disponivel || 0))}
                          </p>
                        </div>
                      </div>

                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-3 pl-2">
                        Valores informativos de margem disponível. Não representam cartões ativos.
                      </p>
                    </div>
                  ) : (
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 pl-2">Cartões Reservados (RMC / RCC) ({activeBenefit.cartoes?.length || 0})</h4>
                  <div className="space-y-4">
                    {!activeBenefit.cartoes || activeBenefit.cartoes.length === 0 ? (
                      <div className="p-8 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhum cartão ativo encontrado.</p>
                      </div>
                    ) : (
                      activeBenefit.cartoes.map((cartao, idx) => {
                        const logoUrl = getSubLogo(cartao.codigo, cartao.banco);
                        return (
                          <div key={idx} className="bg-white p-5 rounded-[2rem] border border-slate-150 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                            <div className="flex items-center gap-3.5 min-w-0 pr-4 w-full md:w-80">
                              <div className="relative w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex-shrink-0 overflow-hidden flex items-center justify-center">
                                {logoUrl ? (
                                  <img
                                    src={getStaticUrl(logoUrl)}
                                    alt={cartao.banco}
                                    className="w-full h-full object-cover scale-110"
                                  />
                                ) : (
                                  <span className="text-[10px] font-black text-slate-400">
                                    {(cartao.banco || "B").charAt(0)}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Banco</p>
                                <p className="text-xs font-black text-slate-800 uppercase truncate">{formatBankName(cartao.codigo, cartao.banco)}</p>
                                <p className="text-[9.5px] font-bold text-pink-500 truncate">{cartao.tipo || "Cartão Consignado"}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 flex-1 w-full text-left">
                              <div>
                                <span className="block text-[9px] text-slate-400 uppercase">Parcela Reservada</span>
                                <p className="text-xs font-black text-slate-800">{formatBRL(cartao.parcela_promosys)}</p>
                              </div>
                              <div>
                                <span className="block text-[9px] text-slate-400 uppercase">Limite</span>
                                <p className="text-xs font-black text-slate-800">{formatBRL(cartao.limite_cartao)}</p>
                              </div>
                              <div>
                                <span className="block text-[9px] text-slate-400 uppercase">Utilizado</span>
                                <p className="text-xs font-black text-red-500">{formatBRL(cartao.utilizado)}</p>
                              </div>
                              <div>
                                <span className="block text-[9px] text-slate-400 uppercase">Disponível</span>
                                <p className="text-xs font-black text-emerald-600">{formatBRL(cartao.disponivel)}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                  )}


              </div>

              {/* Footer */}
              <div className="p-4 sm:p-8 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.03)] w-full">
                <button onClick={() => setCpfModalOpen(false)} className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-500 font-black uppercase tracking-widest text-xs border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">Cancelar</button>
                <button
                  onClick={() => {
                    handleUseCpfLoans();
                    setCpfModalOpen(false);
                  }}
                  disabled={selectedCpfLoanIndices.length === 0}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Importar ({selectedCpfLoanIndices.length}) Contrato(s)
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}

export default dynamic(() => Promise.resolve({ default: SimuladorPageContent }), { ssr: false });
