"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, getStaticUrl } from "@/utils/api";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

// Ícones SVG nativos (Zero Dependency)
const Icons = {
  User: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
  ),
  FileText: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>
  ),
  CreditCard: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
  ),
  Plus: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></svg>
  ),
  Trash: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
  ),
  ChevronDown: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
  ),
  Check: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
  ),
  Sparkles: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z" /></svg>
  ),
  Rocket: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.5-1 1-4c1.5 0 3 .5 3 .5L12 15Z" /><path d="M15 9h5s1 .5 4 1c0 1.5-.5 3-.5 3L15 9Z" /></svg>
  )
};

function SimuladorPageContent() {
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
  const norm = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

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
  const [activeContractIndex, setActiveContractIndex] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState({});
  const [subDropdownOpen, setSubDropdownOpen] = useState(false);

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
        api.get('/admin/sub-logos')
          .then(logos => {
            const mappedLogos = (logos || []).map(l => {
              if (l.name === "FORCAS") l.name = "FORÇAS ARMADAS";
              if (l.name === "GOV_EST") l.name = "GOVERNOS";
              if (l.name === "CLT_PRIVADO") l.name = "CLT PRIVADO";
              if (l.parent === "FORCAS") l.parent = "FORÇAS ARMADAS";
              if (l.parent === "GOV_EST") l.parent = "GOVERNOS";
              if (l.parent === "CLT_PRIVADO") l.parent = "CLT PRIVADO";
              return l;
            });
            localStorage.setItem('cached_sub_logos', JSON.stringify(mappedLogos));
            setSubLogos(mappedLogos);
          })
          .catch(err => console.error("Erro logos:", err));

        // Carregar Bancos do DB
        try {
          const banks = await api.get("/admin/banks");
          const safeBanks = banks || [];
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

  const handleContractChange = (id, e) => {
    const { name, value } = e.target;
    let val = value;
    if (name === "parcela" || name === "saldoDevedor") val = maskCurrency(value);
    if (name === "prazoTotal" || name === "parcelasPagas") val = value.replace(/\D/g, "").slice(0, 3);
    if (name === "taxaAjustada") val = value.replace(/[^0-9,.]/g, "").replace(",", ".");
    
    setContracts(contracts.map(c => {
      if (c.id !== id) return c;
      let newC = { ...c, [name]: val };
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
    setContracts([...contracts, {
      id: Date.now(), banco: "", parcela: "", saldoDevedor: "", prazoTotal: "", prazoRestante: "", parcelasPagas: "", taxaAtual: "", taxaAjustada: ""
    }]);
    setActiveContractIndex(contracts.length);
  };

  const removeContract = (id) => {
    if (contracts.length <= 1) return;
    const filtered = contracts.filter(c => c.id !== id);
    setContracts(filtered);
    setActiveContractIndex(Math.max(0, activeContractIndex - 1));
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
    let value = (Number(clean) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    return `R$ ${value}`;
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
      alert("CPF informado é inválido.");
      return;
    }
    const invalid = contracts.filter(c => !c.banco || !c.parcela || !c.saldoDevedor);
    if (invalid.length > 0) {
      alert("Preencha todos os campos obrigatórios dos contratos.");
      return;
    }

    setLoading(true);
    try {
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
          analfabeto: formData.analfabeto === "sim"
        };
        return api.post('/simular', payload).then(res => ({ contrato_id: c.id, ...res }));
      });
      
      const [results] = await Promise.all([
        Promise.all(promises),
        new Promise(resolve => setTimeout(resolve, 4000))
      ]);
      
      const combinedOfertas = [];
      results.forEach(res => {
        if (res.ofertas) combinedOfertas.push(...res.ofertas.map(o => ({ ...o, _contrato_id: res.contrato_id })));
      });

      const finalData = {
        cliente: results[0]?.cliente || {},
        ofertas: combinedOfertas,
        rejeitados: results.flatMap(r => r.rejeitados || []),
        total_bancos_analisados: results.reduce((acc, r) => acc + (r.total_bancos_analisados || 0), 0),
        total_aprovados: combinedOfertas.length,
        total_rejeitados: results.reduce((acc, r) => acc + (r.total_rejeitados || 0), 0)
      };

      const inssBanks = [
        { value: "121", label: "121 - AGIBANK" }, { value: "250", label: "250 - BANCO BCV" }, { value: "025", label: "025 - BANCO ALFA" },
        { value: "233", label: "233 - BANCO CIFRA" }, { value: "001", label: "001 - BANCO DO BRASIL" }, { value: "047", label: "047 - BANCO DO ESTADO DO SERGIPE" },
        { value: "212", label: "212 - BANCO ORIGINAL" }, { value: "643", label: "643 - BANCO PINE" }, { value: "081", label: "081 - BANCO SEGURO" },
        { value: "041", label: "041 - BANRISUL" }, { value: "000", label: "000 - BARIGUI" }, { value: "318", label: "318 - BMG" },
        { value: "237", label: "237 - BRADESCO S.A." }, { value: "070", label: "070 - BRB" }, { value: "626", label: "626 - C6 CONSIGNADO" },
        { value: "104", label: "104 - CAIXA ECONÔMICA FEDERAL" }, { value: "422", label: "422 - SAFRA" }, { value: "000", label: "000 - CREDCESTA" },
        { value: "000", label: "000 - CTTU" }, { value: "707", label: "707 - DAYCOVAL" }, { value: "000", label: "000 - DEDICARE" },
        { value: "000", label: "000 - EMPRESTA" }, { value: "000", label: "000 - FACTA" }, { value: "000", label: "000 - FIBRA" },
        { value: "000", label: "000 - FINANMAX" }, { value: "000", label: "000 - FINAUDI" }, { value: "000", label: "000 - FINAZAM" },
        { value: "000", label: "000 - GASPREV" }, { value: "000", label: "000 - GFT" }, { value: "000", label: "000 - IBI" },
        { value: "000", label: "000 - ICBC" }, { value: "000", label: "000 - IDEAL" }, { value: "000", label: "000 - INBURSA" },
        { value: "652", label: "652 - ITAÚ CONSIGNADO S.A." }, { value: "341", label: "341 - ITAÚ UNIBANCO S.A." }, { value: "000", label: "000 - KREDILIG" },
        { value: "000", label: "000 - LECCA" }, { value: "000", label: "000 - LUIZACRED" }, { value: "000", label: "000 - MASTER" },
        { value: "000", label: "000 - MAXIMA" }, { value: "000", label: "000 - MERCANTIL DO BRASIL" }, { value: "000", label: "000 - NEON" },
        { value: "000", label: "000 - OLE BONSUCESSO" }, { value: "000", label: "000 - OMNI" }, { value: "000", label: "000 - PAN" },
        { value: "254", label: "254 - PARANÁ" }, { value: "000", label: "000 - PARATI" }, { value: "000", label: "000 - PAULISTA" },
        { value: "000", label: "000 - PICPAY" }, { value: "000", label: "000 - PORTO SEGURO" }, { value: "000", label: "000 - QI SOCIEDADE" },
        { value: "000", label: "000 - QUERO QUERO" }, { value: "000", label: "000 - RENNER" }, { value: "000", label: "000 - SABEMI" },
        { value: "033", label: "033 - SANTANDER" }, { value: "756", label: "756 - SICOOB" }, { value: "000", label: "000 - SICREDI" },
        { value: "000", label: "000 - SIM" }, { value: "000", label: "000 - SOROCRED" }, { value: "000", label: "000 - SUPER PAGAMENTOS" },
        { value: "000", label: "000 - TOPÁZIO" }, { value: "000", label: "000 - TRIÂNGULO" }, { value: "000", label: "000 - TRIBANCO" },
        { value: "000", label: "000 - UNICRED" }, { value: "000", label: "000 - UNIPRIME" }, { value: "000", label: "000 - UP BRASIL" },
        { value: "000", label: "000 - VIA CERTA" }, { value: "000", label: "000 - VOTORANTIM" }, { value: "000", label: "000 - ZEMA" },
        { value: "000", label: "000 - WILL" }, { value: "077", label: "077 - BANCO INTER" }
      ];

      const mappedContracts = contracts.map(c => {
         const found = inssBanks.find(b => b.value === c.banco);
         return { ...c, banco_nome: found ? found.label : c.banco };
      });
      sessionStorage.setItem("simulation_input", JSON.stringify({ ...formData, contracts: mappedContracts }));
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
      alert("Erro ao processar simulação.");
      setLoading(false);
    }
  };

  const inssBanks = [
    { value: "121", label: "121 - AGIBANK" }, { value: "250", label: "250 - BANCO BCV" }, { value: "025", label: "025 - BANCO ALFA" },
    { value: "233", label: "233 - BANCO CIFRA" }, { value: "001", label: "001 - BANCO DO BRASIL" }, { value: "047", label: "047 - BANCO DO ESTADO DO SERGIPE" },
    { value: "079", label: "079 - BANCO ORIGINAL" }, { value: "643", label: "643 - BANCO PINE" }, { value: "081", label: "081 - BANCO SEGURO" },
    { value: "041", label: "041 - BANRISUL" }, { value: "268", label: "268 - BARIGUI" }, { value: "318", label: "318 - BMG" },
    { value: "237", label: "237 - BRADESCO S.A." }, { value: "070", label: "070 - BRB" }, { value: "626", label: "626 - C6 CONSIGNADO" },
    { value: "320", label: "320 - CCB BRASIL" }, { value: "104", label: "104 - CAIXA" }, { value: "069", label: "069 - CREFISA" },
    { value: "707", label: "707 - DAYCOVAL" }, { value: "335", label: "335 - DIGIO" }, { value: "149", label: "149 - FACTA" },
    { value: "012", label: "012 - INBURSA" }, { value: "029", label: "029 - ITAÚ CONSIGNADO" }, { value: "184", label: "184 - ITAÚ BBA" },
    { value: "341", label: "341 - ITAÚ UNIBANCO S.A." }, { value: "389", label: "389 - MERCANTIL" }, { value: "386", label: "386 - NU FINANCEIRA S.A." },
    { value: "753", label: "753 - NBC BANK" }, { value: "169", label: "169 - OLÉ CONSIGNADO" }, { value: "290", label: "290 - PAGBANK" },
    { value: "623", label: "623 - PAN" }, { value: "254", label: "254 - PARANÁ BANCO" }, { value: "752", label: "752 - BNP PARIBAS" },
    { value: "326", label: "326 - PARATI" }, { value: "611", label: "611 - PAULISTA" }, { value: "380", label: "380 - PICPAY" },
    { value: "329", label: "329 - QI SOCIEDADE" }, { value: "966", label: "966 - SABEMI" }, { value: "422", label: "422 - SAFRA" },
    { value: "033", label: "033 - SANTANDER" }, { value: "359", label: "359 - ZEMA" }, { value: "077", label: "077 - BANCO INTER" },
    { value: "756", label: "756 - SICOOB" }, { value: "999", label: "OUTROS" }
  ].sort((a, b) => {
    if (a.value === "999") return 1;
    if (b.value === "999") return -1;
    const nameA = a.label.substring(a.label.indexOf('-') + 1).trim();
    const nameB = b.label.substring(b.label.indexOf('-') + 1).trim();
    return nameA.localeCompare(nameB);
  });

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
                  { x: [0, -180, 180, 0], scale: [1.6, 0.6, 0.6, 1.6], zIndex: [30, 10, 10, 30], opacity: [1, 0.5, 0.5, 1] },
                  { x: [-180, 180, 0, -180], scale: [0.6, 0.6, 1.6, 0.6], zIndex: [10, 10, 30, 10], opacity: [0.5, 0.5, 1, 0.5] },
                  { x: [180, 0, -180, 180], scale: [0.6, 1.6, 0.6, 0.6], zIndex: [10, 30, 10, 10], opacity: [0.5, 1, 0.5, 0.5] }
                ];
                return (
                    <motion.div
                    key={i}
                    className="absolute w-28 h-28 rounded-full border-[3px] border-white flex items-center justify-center bg-white shadow-2xl overflow-hidden"
                    animate={animations[i]}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", times: [0, 0.33, 0.66, 1] }}
                  >
                     <img src={getLogo(i)} className="w-full h-full object-cover" />
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
          <div className="xl:col-span-4 space-y-8">
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

                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-8 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF</label>
                    <input
                      type="text"
                      name="cpf"
                      value={formData.cpf}
                      onChange={handleChange}
                      placeholder="000.000.000-00"
                      className={`w-full h-14 px-5 rounded-2xl bg-slate-50 border-2 transition-all outline-none font-bold text-slate-800 ${cpfStatus === 'valid' ? 'border-emerald-500 bg-emerald-50' : cpfStatus === 'invalid' ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-blue-500 focus:bg-white'}`}
                    />
                    {cpfStatus === 'valid' && (
                       <div className="absolute right-4 bottom-4 text-emerald-600 animate-in zoom-in">
                          <Icons.Check size={20} />
                       </div>
                    )}
                  </div>
                  <div className="col-span-4 space-y-1.5">
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
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer group/opt" onClick={() => setFormData(p => ({...p, analfabeto: p.analfabeto === "sim" ? "nao" : "sim"}))}>
                    <div className="flex items-center gap-3">
                       <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${formData.analfabeto === "sim" ? "bg-blue-600 border-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]" : "border-slate-300 group-hover/opt:border-blue-400"}`}>
                          {formData.analfabeto === "sim" && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                       </div>
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Cliente Analfabeto?</span>
                    </div>
                  </div>
                  
                  {/* Regra Condicional: Invalidez ou 60+ */}
                  {(isInvalidezSpecies || is60Plus) && (
                    <div className={`flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-colors ${isInvalidezSpecies && !is60Plus ? 'opacity-80 pointer-events-none' : 'hover:border-blue-200 cursor-pointer group/opt'}`} onClick={() => { if (!(isInvalidezSpecies && !is60Plus)) setFormData(p => ({...p, is_60_plus: !p.is_60_plus})) }}>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${formData.is_60_plus || (isInvalidezSpecies && !is60Plus) ? "bg-blue-600 border-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]" : "border-slate-300 group-hover/opt:border-blue-400"}`}>
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
          <div className="xl:col-span-8 space-y-8">
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
                         {formData.agreement && subLogos.find(l => { const n = norm(l.name); return n && n === norm(formData.agreement); })?.logo_url && (
                           <img src={getStaticUrl(subLogos.find(l => { const n = norm(l.name); return n && n === norm(formData.agreement); }).logo_url)} className="w-8 h-8 rounded-lg object-cover bg-white shadow-sm" />
                         )}
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
                              />
                           </div>
                           <div className="overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                             {["INSS", "SIAPE", "FORÇAS ARMADAS", "GOVERNOS", "CLT PRIVADO"]
                               .filter(name => !agreementSearch || name.toUpperCase().includes(agreementSearch.toUpperCase()))
                               .map(name => {
                                 const logoObj = subLogos.find(l => norm(l.name) === norm(name));
                                 return (
                                   <button key={name} type="button" onClick={() => { setFormData(p => ({ ...p, agreement: name, sub_agreement: "" })); setDropdownOpen(p => ({ ...p, agreement: false })); setAgreementSearch(""); }} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border ${formData.agreement === name ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30' : 'bg-slate-50 text-slate-700 border-slate-100 hover:border-blue-300'}`}>
                                     {logoObj?.logo_url ? (
                                       <div className="w-10 h-10 bg-white rounded-xl shrink-0 flex items-center justify-center border shadow-sm overflow-hidden">
                                          <img src={getStaticUrl(logoObj.logo_url)} className="w-full h-full object-cover" />
                                       </div>
                                     ) : (
                                       <div className="w-10 h-10 bg-white/50 rounded-xl shrink-0 border shadow-sm"></div>
                                     )}
                                     <span className="text-[10px] font-black uppercase text-left">{name}</span>
                                   </button>
                                 );
                             })}
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
                                      />
                                   </div>
                                   <div className="overflow-y-auto space-y-1">
                                      {inssSpecies
                                        .filter(s => !speciesSearch || s.label.toUpperCase().includes(speciesSearch.toUpperCase()))
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
                               {formData.sub_agreement && subLogos.find(l => { const n = norm(l.name); return n && n === norm(formData.sub_agreement); })?.logo_url && (
                                 <img src={getStaticUrl(subLogos.find(l => { const n = norm(l.name); return n && n === norm(formData.sub_agreement); }).logo_url)} className="w-8 h-8 rounded-lg object-cover bg-white shadow-sm" />
                               )}
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
                                  />
                               </div>
                               <div className="overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                                 {(() => {
                                    const filterList = (list) => list.filter(item => {
                                      const text = typeof item === 'string' ? item : (item.label || "");
                                      return !subAgreementSearch || text.toUpperCase().includes(subAgreementSearch.toUpperCase());
                                    });

                                    const subLogosFiltered = subLogos.filter(l => norm(l.parent) === norm(formData.agreement));
                                    
                                    if (subLogosFiltered.length > 0) {
                                      return filterList(subLogosFiltered).map(l => (
                                        <button key={l.id} type="button" onClick={() => { setFormData(p => ({ ...p, sub_agreement: l.name })); setSubDropdownOpen(false); setSubAgreementSearch(""); }} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border ${norm(formData.sub_agreement) === norm(l.name) ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30' : 'bg-slate-50 text-slate-700 border-slate-100 hover:border-blue-300'}`}>
                                          <div className="w-10 h-10 bg-white rounded-xl shrink-0 flex items-center justify-center border shadow-sm overflow-hidden">
                                             <img src={getStaticUrl(l.logo_url)} className="w-full h-full object-cover" />
                                          </div>
                                          <span className="text-[10px] font-black uppercase text-left">{l.name}</span>
                                        </button>
                                      ));
                                    } else if (formData.agreement === "FORÇAS ARMADAS") {
                                       return filterList(["EXÉRCITO", "MARINHA", "AERONÁUTICA"]).map(name => {
                                           const logoObj = subLogos.find(l => norm(l.name) === norm(name));
                                           return (
                                             <button key={name} type="button" onClick={() => { setFormData(p => ({ ...p, sub_agreement: name })); setSubDropdownOpen(false); setSubAgreementSearch(""); }} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border font-black text-[10px] uppercase ${formData.sub_agreement === name ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30' : 'bg-slate-50 text-slate-700 border-slate-100 hover:border-blue-300'}`}>
                                               <div className="w-10 h-10 bg-white rounded-xl shrink-0 flex items-center justify-center border shadow-sm overflow-hidden">
                                                 {logoObj?.logo_url ? <img src={getStaticUrl(logoObj.logo_url)} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100"></div>}
                                               </div>
                                               {name}
                                             </button>
                                           );
                                       });
                                    } else if (formData.agreement === "SIAPE") {
                                       return filterList(["01- ATIVO", "02- APOSENTADO", "03- PENSIONISTA"]).map(name => {
                                           const logoObj = subLogos.find(l => norm(l.name) === norm(name));
                                           return (
                                             <button key={name} type="button" onClick={() => { setFormData(p => ({ ...p, sub_agreement: name })); setSubDropdownOpen(false); setSubAgreementSearch(""); }} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border font-black text-[10px] uppercase ${formData.sub_agreement === name ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30' : 'bg-slate-50 text-slate-700 border-slate-100 hover:border-blue-300'}`}>
                                               <div className="w-10 h-10 bg-white rounded-xl shrink-0 flex items-center justify-center border shadow-sm overflow-hidden">
                                                 {logoObj?.logo_url ? <img src={getStaticUrl(logoObj.logo_url)} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100"></div>}
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
                                           const logoObj = subLogos.find(l => {
                                               const nL = norm(l.name);
                                               return nL && (nL === norm(state.value) || nL === norm(state.label));
                                           });
                                           return (
                                             <button key={state.value} type="button" onClick={() => { setFormData(p => ({ ...p, sub_agreement: state.label })); setSubDropdownOpen(false); setSubAgreementSearch(""); }} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border font-black text-[10px] uppercase ${formData.sub_agreement === state.label ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30' : 'bg-slate-50 text-slate-700 border-slate-100 hover:border-blue-300'}`}>
                                               <div className="w-10 h-10 bg-white rounded-xl shrink-0 flex items-center justify-center border shadow-sm overflow-hidden">
                                                 {logoObj?.logo_url ? <img src={getStaticUrl(logoObj.logo_url)} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100"></div>}
                                               </div>
                                               {state.label}
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
                                  const dbBank = dbBanks.find(db => db.name && bankLabel.toUpperCase().includes(db.name.toUpperCase()));
                                  const subLogoObj = subLogos.find(l => { 
                                    const nL = norm(l.name); 
                                    return nL && (nL === norm(bankName) || norm(bankLabel).includes(nL)); 
                                  });
                                  const logoUrl = subLogoObj?.logo_url || dbBank?.logo_url;
                                  return (
                                    <>
                                      {logoUrl && <img src={getStaticUrl(logoUrl)} className="w-6 h-6 rounded-md bg-white object-cover" />}
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
                                  />
                               </div>
                               <div className="overflow-y-auto space-y-1">
                                 {inssBanks
                                   .filter(bank => !bankSearch || bank.label.toUpperCase().includes(bankSearch.toUpperCase()))
                                   .map(bank => {
                                      const bankName = bank.label.substring(bank.label.indexOf('-') + 1).trim();
                                      const dbBank = dbBanks.find(db => db.name && bank.label.toUpperCase().includes(db.name.toUpperCase()));
                                      const subLogoObj = subLogos.find(l => {
                                        const nL = norm(l.name);
                                        return nL && (nL === norm(bankName) || norm(bank.label).includes(nL));
                                      });
                                      const logoUrl = subLogoObj?.logo_url || dbBank?.logo_url;
                                      return (
                                        <button key={bank.value} type="button" onClick={() => { setContracts(contracts.map((c, i) => i === activeContractIndex ? { ...c, banco: bank.value } : c)); setDropdownOpen(p => ({ ...p, [contracts[activeContractIndex].id]: false })); setBankSearch(""); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-[11px] font-bold text-slate-700 hover:bg-blue-50 transition-all uppercase">
                                          {logoUrl ? <img src={getStaticUrl(logoUrl)} className="w-6 h-6 rounded-md bg-white object-cover" /> : <div className="w-6 h-6 rounded-md bg-slate-200 border border-slate-300 flex-shrink-0"></div>}
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
                          <input type="text" name="parcelasPagas" value={contracts[activeContractIndex].parcelasPagas} onChange={(e) => handleContractChange(contracts[activeContractIndex].id, e)} placeholder="12" className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white transition-all outline-none font-black text-slate-800 text-center" required />
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
    </div>
  );
}

export default dynamic(() => Promise.resolve({ default: SimuladorPageContent }), { ssr: false });
