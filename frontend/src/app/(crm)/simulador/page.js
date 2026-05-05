"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, getStaticUrl } from "@/utils/api";
import { motion, AnimatePresence } from "framer-motion";

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
  Sparkles: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z" /></svg>
  ),
  Rocket: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.5-1 1-4c1.5 0 3 .5 3 .5L12 15Z" /><path d="M15 9h5s1 .5 4 1c0 1.5-.5 3-.5 3L15 9Z" /></svg>
  )
};

export default function SimuladorPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [dbBanks, setDbBanks] = useState([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [subLogos, setSubLogos] = useState([]);

  useEffect(() => {
    const fetchSubLogos = async () => {
      try {
        const data = await api.get('/admin/sub-logos');
        setSubLogos(data || []);
      } catch (err) {
        console.error("Erro ao carregar logos de convenios:", err);
      }
    };
    fetchSubLogos();
  }, []);
  const [formData, setFormData] = useState({
    nome_cliente: "",
    cpf: "",
    idade: "",
    agreement: "",
    benefit_species: "",
    analfabeto: "nao",
    saldoDevedor: "",
    parcela: "",
    taxaAtual: "",
    prazoTotal: "",
    prazoRestante: "",
    parcelasPagas: "",
    banco: "",
    data_concessao: "",
    is_60_plus: false,
    taxaAjustada: "",
    is_invalidez_60_plus: false
  });

  const [contracts, setContracts] = useState([{
    id: 1, banco: "", parcela: "", saldoDevedor: "", prazoTotal: "", prazoRestante: "", parcelasPagas: "", taxaAtual: "", taxaAjustada: ""
  }]);
  const [activeContractIndex, setActiveContractIndex] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState({});
  const [subDropdownOpen, setSubDropdownOpen] = useState(false);

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
    
    if (name === "cpf") val = maskCPF(value);
    if (name === "idade") val = value.replace(/\D/g, "").slice(0, 2);

    let newFormData = { ...formData, [name]: val };

    if (name === "agreement") {
      newFormData.benefit_species = "";
      newFormData.data_concessao = "";
    }
    setFormData(newFormData);
  };

  const validateCPF = (cpf) => {
    cpf = cpf.replace(/[^\d]+/g, "");
    if (cpf === "") return true;
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

  const maskCPF = (val) => {
    return val.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})/, "$1-$2").replace(/(-\d{2})\d+?$/, "$1");
  };

  const maskCurrency = (val) => {
    let clean = val.replace(/\D/g, "");
    let value = (Number(clean) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    return `R$ ${value}`;
  };

  const parseCurrency = (val) => {
    if (!val) return 0;
    return parseFloat(val.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
  };

  const handleSimular = async (e) => {
    e.preventDefault();
    if (formData.cpf && !validateCPF(formData.cpf)) {
      alert("CPF informado é inválido. Por favor, verifique.");
      return;
    }
    // Validar contratos
    const invalidContracts = contracts.filter(c => !c.banco || !c.parcela || !c.saldoDevedor);
    if (invalidContracts.length > 0) {
      alert("Por favor, preencha todos os campos obrigatórios dos contratos.");
      return;
    }
    setLoading(true);
    try {
      const promises = contracts.map(c => {
        const payload = {
          nome_cliente: formData.nome_cliente,
          cpf: formData.cpf.replace(/\D/g, ""),
          idade: parseInt(formData.idade),
          convenio: formData.agreement,
          sub_convenio: formData.sub_agreement || "",
          benefit_species: formData.benefit_species,
          banco: c.banco,
          parcela: parseCurrency(c.parcela),
          saldo_devedor: parseCurrency(c.saldoDevedor),
          taxa_atual: parseFloat((c.taxaAjustada || c.taxaAtual || 0).toString().replace(',', '.')),
          total_term: parseInt(c.prazoTotal),
          remaining_term: parseInt(c.prazoRestante),
          data_concessao: parseInt(formData.idade || 0) >= 60 ? null : formData.data_concessao, 
          is_60_plus: formData.is_60_plus,
          is_invalidez_60_plus: parseInt(formData.idade || 0) >= 60,
          analfabeto: formData.analfabeto === "sim"
        };
        return api.post('/simular', payload).then(res => ({ contrato_id: c.id, ...res }));
      });
      
      const [results] = await Promise.all([
        Promise.all(promises),
        new Promise(resolve => setTimeout(resolve, 4000))
      ]);
      
      // Combine results correctly. Results is an array of data from the backend.
      // Usually, data is { ofertas: [], rejeitados: [], ... }. For multiple, we merge them.
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

      sessionStorage.setItem("simulation_results", JSON.stringify(finalData));
      sessionStorage.setItem("simulation_input", JSON.stringify({ ...formData, contracts }));
      
      // Save last rate for admin 
      if (contracts.length > 0) {
        localStorage.setItem("last_simulation_rate", contracts[0].taxaAtual || "0");
      }
      
      setIsExiting(true);
      setTimeout(() => {
        router.push("/ofertas");
      }, 700);
    } catch (err) {
      console.error("Erro na simulação:", err);
      alert("Erro ao processar simulação. Verifique os dados.");
      setLoading(false);
    }
  };

  const inssBanks = [
    { value: "121", label: "121 - AGIBANK" },
    { value: "250", label: "250 - BANCO BCV" },
    { value: "025", label: "025 - BANCO ALFA" },
    { value: "233", label: "233 - BANCO CIFRA" },
    { value: "001", label: "001 - BANCO DO BRASIL" },
    { value: "047", label: "047 - BANCO DO ESTADO DO SERGIPE" },
    { value: "079", label: "079 - BANCO ORIGINAL" },
    { value: "643", label: "643 - BANCO PINE" },
    { value: "081", label: "081 - BANCO SEGURO" },
    { value: "041", label: "041 - BANRISUL" },
    { value: "268", label: "268 - BARIGUI" },
    { value: "318", label: "318 - BMG" },
    { value: "237", label: "237 - BRADESCO S.A." },
    { value: "070", label: "070 - BRB" },
    { value: "626", label: "626 - C6 CONSIGNADO" },
    { value: "320", label: "320 - CCB BRASIL" },
    { value: "104", label: "104 - CAIXA" },
    { value: "069", label: "069 - CREFISA" },
    { value: "707", label: "707 - DAYCOVAL" },
    { value: "335", label: "335 - DIGIO" },
    { value: "149", label: "149 - FACTA" },
    { value: "012", label: "012 - INBURSA" },
    { value: "029", label: "029 - ITAÚ CONSIGNADO" },
    { value: "184", label: "184 - ITAÚ BBA" },
    { value: "341", label: "341 - ITAÚ UNIBANCO S.A." },
    { value: "389", label: "389 - MERCANTIL" },
    { value: "386", label: "386 - NU FINANCEIRA S.A." },
    { value: "753", label: "753 - NBC BANK" },
    { value: "169", label: "169 - OLÉ CONSIGNADO" },
    { value: "290", label: "290 - PAGBANK" },
    { value: "623", label: "623 - PAN" },
    { value: "254", label: "254 - PARANÁ BANCO" },
    { value: "752", label: "752 - BNP PARIBAS" },
    { value: "326", label: "326 - PARATI" },
    { value: "611", label: "611 - PAULISTA" },
    { value: "380", label: "380 - PICPAY" },
    { value: "329", label: "329 - QI SOCIEDADE" },
    { value: "966", label: "966 - SABEMI" },
    { value: "422", label: "422 - SAFRA" },
    { value: "033", label: "033 - SANTANDER" },
    { value: "359", label: "359 - ZEMA" },
    { value: "999", label: "OUTROS" }
  ];

  const inssSpecies = [
    { value: "01", label: "01 - PENSÃO POR MORTE ACIDENTE TRABALHO" },
    { value: "02", label: "02 - PENSÃO POR MORTE RURAL" },
    { value: "03", label: "03 - PENSÃO POR MORTE EMPREGADOR RURAL" },
    { value: "04", label: "04 - APOSENTADORIA POR INVALIDEZ ACIDENTE TRABALHO" },
    { value: "05", label: "05 - APOSENTADORIA POR INVALIDEZ RURAL" },
    { value: "06", label: "06 - APOSENTADORIA POR INVALIDEZ EMPREGADOR RURAL" },
    { value: "07", label: "07 - APOSENTADORIA POR IDADE RURAL" },
    { value: "08", label: "08 - APOSENTADORIA POR IDADE EMPREGADOR RURAL" },
    { value: "19", label: "19 - PENSÃO DE ESTUDANTE" },
    { value: "20", label: "20 - PENSÃO POR MORTE EX-DIPLOMATA" },
    { value: "21", label: "21 - PENSÃO POR MORTE PREVIDENCIÁRIA" },
    { value: "22", label: "22 - PENSÃO POR MORTE ESTATUTÁRIA" },
    { value: "23", label: "23 - PENSÃO POR MORTE DE EX-COMBATENTE" },
    { value: "24", label: "24 - PENSÃO ESPECIAL (ATO INSTITUCIONAL)" },
    { value: "26", label: "26 - PENSÃO ESPECIAL" },
    { value: "27", label: "27 - PENSÃO POR MORTE DE SERVIDOR PÚBLICO" },
    { value: "28", label: "28 - PENSÃO POR MORTE RGPS" },
    { value: "29", label: "29 - PENSÃO POR MORTE EX-COMBATENTE MARÍTIMO" },
    { value: "32", label: "32 - APOSENTADORIA POR INVALIDEZ PREVIDENCIÁRIA" },
    { value: "33", label: "33 - APOSENTADORIA POR INVALIDEZ AERONAUTA" },
    { value: "34", label: "34 - APOSENTADORIA POR INVALIDEZ EX-COMBATENTE" },
    { value: "37", label: "37 - APOSENTADORIA DE EXTRANEUM" },
    { value: "38", label: "38 - APOSENTADORIA DA EXTN" },
    { value: "41", label: "41 - APOSENTADORIA POR IDADE" },
    { value: "42", label: "42 - APOSENTADORIA POR TEMPO DE CONTRIBUIÇÃO" },
    { value: "43", label: "43 - APOSENTADORIA ESPECIAL EX-COMBATENTE" },
    { value: "44", label: "44 - APOSENTADORIA VOO AERONAUTA" },
    { value: "45", label: "45 - APOSENTADORIA JORNALISTA" },
    { value: "46", label: "46 - APOSENTADORIA ESPECIAL" },
    { value: "49", label: "49 - APOSENTADORIA ORDINARIA" },
    { value: "51", label: "51 - APOSENTADORIA EXTINTA SASC" },
    { value: "52", label: "52 - APOSENTADORIA EXTINTA SASC" },
    { value: "54", label: "54 - PENSÃO ESPECIAL VITALÍCIA (SÍNDROME DA TALIDOMIDA)" },
    { value: "55", label: "55 - PENSÃO POR MORTE EXTINTA SASC" },
    { value: "56", label: "56 - PENSÃO VITALÍCIA (SÍNDROME TALIDOMIDA)" },
    { value: "57", label: "57 - APOSENTADORIA POR TEMPO CONTRIBUIÇÃO DE PROFESSOR" },
    { value: "58", label: "58 - APOSENTADORIA EXCEPCIONAL DO ANISTIADO" },
    { value: "59", label: "59 - PENSÃO POR MORTE EXCEPCIONAL DO ANISTIADO" },
    { value: "60", label: "60 - PENSÃO ESPECIAL MENSAL VITALÍCIA" },
    { value: "72", label: "72 - PENSÃO POR MORTE FUNDO MARINHA MERCANTE" },
    { value: "78", label: "78 - APOSENTADORIA POR IDADE DE EX-COMBATENTE" },
    { value: "81", label: "81 - APOSENTADORIA POR IDADE COMPULSORIA" },
    { value: "89", label: "89 - PENSÃO ESPECIAL (VITIMAS HEMODIÁLISE CARUARU)" },
    { value: "92", label: "92 - APOSENTADORIA POR INVALIDEZ POR ACIDENTE DE TRABALHO" },
    { value: "93", label: "93 - PENSÃO POR MORTE POR ACIDENTE DE TRABALHO" }
  ];

  // Loading logos cycling from REAL database banks
  const defaultLogos = [
    "https://logouol.com/itau/itau-logo.png",
    "https://logos-world.net/wp-content/uploads/2021/02/PicPay-Logo.png",
    "https://logodownload.org/wp-content/uploads/2019/08/c6-bank-logo.png",
    "https://logodownload.org/wp-content/uploads/2018/07/banco-pan-logo.png"
  ];
  const [banksForAnim, setBanksForAnim] = useState([]);
  const [logoIdx, setLogoIdx] = useState(0);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
    // Carregar bancos reais para usar as logos na animação
    api.get("/admin/banks")
      .then(list => {
        setDbBanks(list);
        const originBanksToExclude = ["AGIBANK", "BCV", "ALFA", "CIFRA", "PINE", "SEGURO", "BARIGUI", "BRB", "PARANÁ", "PARATI", "PAULISTA", "PICPAY", "QI SOCIEDADE", "SABEMI", "ZEMA"];
        const active = list.filter(b => 
          b.logo_url && 
          b.active && 
          !originBanksToExclude.some(o => b.name.toUpperCase().includes(o))
        );
        setBanksForAnim(active.length > 0 ? active : []);
      })
      .catch(() => {});
  }, []);

  const getCurrentBankData = () => {
    if (!formData.banco) return null;
    const searchName = formData.banco.includes('-') ? formData.banco.split('-')[1].trim().toUpperCase() : formData.banco.toUpperCase();
    return dbBanks.find(b => b.name.toUpperCase() === searchName || b.name.toUpperCase().includes(searchName) || searchName.includes(b.name.toUpperCase()));
  };
  const currentBankData = getCurrentBankData();
  const currentLogo = currentBankData?.logo_url ? getStaticUrl(currentBankData.logo_url) : null;

  const handleLogoUpload = async (e, bankName) => {
    const file = e.target.files[0];
    if (!file || !bankName) return;
    try {
      setUploadingLogo(true);
      const searchName = bankName.includes('-') ? bankName.split('-')[1].trim().toUpperCase() : bankName.toUpperCase();
      const matchedBank = dbBanks.find(b => b.name.toUpperCase() === searchName || b.name.toUpperCase().includes(searchName) || searchName.includes(b.name.toUpperCase()));
      
      let bankId = matchedBank?.id;
      if (!bankId) {
         const nameToCreate = bankName.includes('-') ? bankName.split('-')[1].trim() : bankName;
         const newBank = await api.post("/admin/banks", { name: nameToCreate, active: true });
         bankId = newBank.id;
      }
      const formDataObj = new FormData();
      formDataObj.append('file', file);
      if (api.postFormData) {
        await api.postFormData(`/admin/banks/${bankId}/upload-logo`, formDataObj);
      } else {
        const token = localStorage.getItem('token');
        await fetch(`${api.API_BASE_URL || 'http://127.0.0.1:8000/api'}/admin/banks/${bankId}/upload-logo`, {
          method: 'POST', headers: token ? { 'Authorization': `Bearer ${token}` } : {}, body: formDataObj
        });
      }
      const list = await api.get("/admin/banks");
      setDbBanks(list);
      const originBanksToExclude = ["AGIBANK", "BCV", "ALFA", "CIFRA", "PINE", "SEGURO", "BARIGUI", "BRB", "PARANÁ", "PARATI", "PAULISTA", "PICPAY", "QI SOCIEDADE", "SABEMI", "ZEMA"];
      const active = list.filter(b => 
        b.logo_url && 
        b.active && 
        !originBanksToExclude.some(o => b.name.toUpperCase().includes(o))
      );
      setBanksForAnim(active.length > 0 ? active : []);
      alert("Logo enviada com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoDelete = async (bankId) => {
    if (!bankId) return;
    try {
      setUploadingLogo(true);
      await api.patch(`/admin/banks/${bankId}`, { logo_url: null });
      const list = await api.get("/admin/banks");
      setDbBanks(list);
      const originBanksToExclude = ["AGIBANK", "BCV", "ALFA", "CIFRA", "PINE", "SEGURO", "BARIGUI", "BRB", "PARANÁ", "PARATI", "PAULISTA", "PICPAY", "QI SOCIEDADE", "SABEMI", "ZEMA"];
      const active = list.filter(b => 
        b.logo_url && 
        b.active && 
        !originBanksToExclude.some(o => b.name.toUpperCase().includes(o))
      );
      setBanksForAnim(active.length > 0 ? active : []);
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

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

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-700">
      {/* Loading Overlay Premium */}
      {loading && (
        <div className={`fixed inset-0 z-[1000] flex flex-col items-center justify-center transition-all duration-700 ${isExiting ? "opacity-0 scale-110 blur-2xl" : "bg-black/70 backdrop-blur-md opacity-100"}`}>
           <div className="relative w-80 h-80 flex items-center justify-center">
              {/* Círculos 2.5D de Loading */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-40 h-40 rounded-full border-4 border-blue-500/30 flex items-center justify-center bg-white/5 backdrop-blur-xl shadow-[0_0_50px_rgba(37,99,235,0.2)]"
                  animate={{
                    x: [Math.cos(i * (2*Math.PI/3)) * 100, Math.cos((i + 1) * (2*Math.PI/3)) * 100, Math.cos((i + 2) * (2*Math.PI/3)) * 100],
                    scale: [1, 0.7, 1],
                    zIndex: [10, 0, 10],
                    opacity: [1, 0.4, 1]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                   {/* Logo do Banco (Real ou Fallback) */}
                   <div className="w-24 h-24 p-4 bg-white rounded-full shadow-inner border border-blue-100 flex items-center justify-center overflow-hidden">
                      <img src={getLogo(i)} className="w-full h-full object-contain" />
                   </div>
                </motion.div>
              ))}
              
              {/* Centro */}
              <div className="relative z-20 flex flex-col items-center">
                 <div className="w-20 h-20 bg-blue-600 rounded-3xl shadow-[0_0_40px_rgba(37,99,235,0.6)] flex items-center justify-center mb-6 animate-bounce">
                    <Icons.Rocket size={40} />
                 </div>
                 <h2 className="text-2xl font-black text-white tracking-widest uppercase text-center drop-shadow-lg">Analisando<br/><span className="text-blue-400">Oportunidades</span></h2>
                 <div className="mt-4 flex gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-0"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-150"></div>
                    <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce delay-300"></div>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10 space-y-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter drop-shadow-sm uppercase">
              Nova <span className="text-blue-600">Simulação</span>
            </h1>
            <p className="text-slate-500 font-bold italic text-sm uppercase tracking-[0.3em]">
              Portabilidade PRO & Analytics de Crédito
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl shadow-xl border border-slate-100">
             <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg">
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
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF</label>
                    <input
                      type="text"
                      name="cpf"
                      value={formData.cpf}
                      onChange={handleChange}
                      placeholder="000.000.000-00"
                      className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-bold text-slate-800"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Idade</label>
                    <input
                      type="text"
                      name="idade"
                      value={formData.idade}
                      onChange={handleChange}
                      placeholder="80"
                      className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-bold text-slate-800"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer group/opt" onClick={() => setFormData({...formData, analfabeto: formData.analfabeto === "sim" ? "nao" : "sim"})}>
                    <div className="flex items-center gap-3">
                       <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${formData.analfabeto === "sim" ? "bg-blue-600 border-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]" : "border-slate-300 group-hover/opt:border-blue-400"}`}>
                          {formData.analfabeto === "sim" && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                       </div>
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Cliente Analfabeto?</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer group/opt" onClick={() => setFormData({...formData, is_60_plus: !formData.is_60_plus})}>
                    <div className="flex items-center gap-3">
                       <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${formData.is_60_plus ? "bg-blue-600 border-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]" : "border-slate-300 group-hover/opt:border-blue-400"}`}>
                          {formData.is_60_plus && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                       </div>
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Invalidez 60+ anos?</span>
                    </div>
                  </div>
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
                 <p className="text-xs text-white/50 font-bold italic leading-relaxed uppercase">Nosso sistema analisa centenas de regras bancárias em tempo real para encontrar a melhor oferta para o seu cliente.<          <div className="xl:col-span-8 space-y-8">
            
            {/* Seção Convênio (Visual Premium) */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20">
                    <Icons.FileText />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Convênio Origem</h3>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selecione o Convênio</label>
                    <button
                      type="button"
                      onClick={() => setDropdownOpen({ ...dropdownOpen, agreement: !dropdownOpen.agreement })}
                      className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between font-black text-slate-800 hover:bg-slate-100 transition-all uppercase text-sm"
                    >
                      <div className="flex items-center gap-3">
                         {formData.agreement && subLogos.find(l => l.name === formData.agreement)?.logo_url && (
                           <img src={getStaticUrl(subLogos.find(l => l.name === formData.agreement).logo_url)} className="w-8 h-8 rounded-lg object-contain bg-white p-1 border shadow-sm" />
                         )}
                         {formData.agreement || "SELECIONAR CONVÊNIO"}
                      </div>
                      <Icons.ChevronDown />
                    </button>
                    <AnimatePresence>
                      {dropdownOpen.agreement && (
                        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:10}} className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 z-[100] max-h-[300px] overflow-y-auto grid grid-cols-2 gap-2">
                           {subLogos.filter(l => l.parent === "principal").map(l => (
                             <button key={l.id} type="button" onClick={() => { setFormData({ ...formData, agreement: l.name, sub_agreement: "" }); setDropdownOpen({ ...dropdownOpen, agreement: false }); }} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border ${formData.agreement === l.name ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30' : 'bg-slate-50 text-slate-700 border-slate-100 hover:border-blue-300'}`}>
                               <div className="w-10 h-10 bg-white rounded-xl p-1 shrink-0 flex items-center justify-center border shadow-sm">
                                  <img src={getStaticUrl(l.logo_url)} className="w-full h-full object-contain" />
                               </div>
                               <span className="text-[10px] font-black uppercase text-left">{l.name}</span>
                             </button>
                           ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-1.5">
                    {formData.agreement === "INSS" ? (
                      <>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Espécie do Benefício</label>
                        <select name="benefit_species" value={formData.benefit_species} onChange={handleChange} className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 font-black text-slate-800 outline-none uppercase text-xs">
                          <option value="">SELECIONE A ESPÉCIE</option>
                          {inssSpecies.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </>
                    ) : (
                      <div className="relative">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Força / Sub-Convênio</label>
                        <button
                          type="button"
                          onClick={() => setSubDropdownOpen(!subDropdownOpen)}
                          className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between font-black text-slate-800 hover:bg-slate-100 transition-all uppercase text-sm disabled:opacity-50"
                          disabled={!formData.agreement}
                        >
                          <div className="flex items-center gap-3">
                             {formData.sub_agreement && subLogos.find(l => l.name === formData.sub_agreement)?.logo_url && (
                               <img src={getStaticUrl(subLogos.find(l => l.name === formData.sub_agreement).logo_url)} className="w-8 h-8 rounded-lg object-contain bg-white p-1 border shadow-sm" />
                             )}
                             {formData.sub_agreement || "SUB-CONVÊNIO"}
                          </div>
                          <Icons.ChevronDown />
                        </button>
                        <AnimatePresence>
                          {subDropdownOpen && (
                            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:10}} className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 z-[100] max-h-[300px] overflow-y-auto grid grid-cols-2 gap-2">
                               {subLogos.filter(l => l.parent === formData.agreement).map(l => (
                                 <button key={l.id} type="button" onClick={() => { setFormData({ ...formData, sub_agreement: l.name }); setSubDropdownOpen(false); }} className={`flex items-center gap-3 p-3 rounded-2xl transition-all border ${formData.sub_agreement === l.name ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30' : 'bg-slate-50 text-slate-700 border-slate-100 hover:border-blue-300'}`}>
                                   <div className="w-10 h-10 bg-white rounded-xl p-1 shrink-0 flex items-center justify-center border shadow-sm">
                                      <img src={getStaticUrl(l.logo_url)} className="w-full h-full object-contain" />
                                   </div>
                                   <span className="text-[10px] font-black uppercase text-left">{l.name}</span>
                                 </button>
                               ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
               </div>
            </div>

            {/* Seção Contratos (Abas Premium) */}
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

               {/* Tabs Navegação */}
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

               {/* Card do Contrato Ativo */}
               <AnimatePresence mode="wait">
                  {contracts[activeContractIndex] && (
                    <motion.div 
                      key={contracts[activeContractIndex].id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                       <div className="space-y-1.5 relative">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Banco Origem</label>
                          <button
                            type="button"
                            onClick={() => setDropdownOpen({ ...dropdownOpen, [contracts[activeContractIndex].id]: !dropdownOpen[contracts[activeContractIndex].id] })}
                            className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between font-black text-slate-800 hover:bg-slate-100 transition-all uppercase text-[11px]"
                          >
                            <div className="flex-1 text-left truncate pr-2">
                               {contracts[activeContractIndex].banco 
                                 ? inssBanks.find(b => b.value === contracts[activeContractIndex].banco)?.label 
                                 : "SELECIONAR BANCO"
                               }
                            </div>
                            <Icons.ChevronDown />
                          </button>
                          {dropdownOpen[contracts[activeContractIndex].id] && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-4 z-[100] max-h-[350px] overflow-y-auto">
                              <div className="grid grid-cols-1 gap-1">
                                {inssBanks.map(bank => (
                                  <button
                                    key={bank.value}
                                    type="button"
                                    onClick={() => {
                                      setContracts(contracts.map((c, i) => i === activeContractIndex ? { ...c, banco: bank.value } : c));
                                      setDropdownOpen({ ...dropdownOpen, [contracts[activeContractIndex].id]: false });
                                    }}
                                    className="w-full px-4 py-3 rounded-xl text-left text-[11px] font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-all uppercase border border-transparent hover:border-blue-100"
                                  >
                                    {bank.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                       </div>

                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor da Parcela</label>
                          <input
                            type="text"
                            name="parcela"
                            value={contracts[activeContractIndex].parcela}
                            onChange={(e) => handleContractChange(contracts[activeContractIndex].id, e)}
                            placeholder="R$ 0,00"
                            className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white transition-all outline-none font-black text-slate-800"
                            required
                          />
                       </div>

                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Saldo Devedor</label>
                          <input
                            type="text"
                            name="saldoDevedor"
                            value={contracts[activeContractIndex].saldoDevedor}
                            onChange={(e) => handleContractChange(contracts[activeContractIndex].id, e)}
                            placeholder="R$ 0,00"
                            className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white transition-all outline-none font-black text-slate-800"
                            required
                          />
                       </div>

                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prazo Total (Meses)</label>
                          <input
                            type="text"
                            name="prazoTotal"
                            value={contracts[activeContractIndex].prazoTotal}
                            onChange={(e) => handleContractChange(contracts[activeContractIndex].id, e)}
                            placeholder="84"
                            className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white transition-all outline-none font-black text-slate-800 text-center"
                            required
                          />
                       </div>

                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parcelas Pagas</label>
                          <input
                            type="text"
                            name="parcelasPagas"
                            value={contracts[activeContractIndex].parcelasPagas}
                            onChange={(e) => handleContractChange(contracts[activeContractIndex].id, e)}
                            placeholder="12"
                            className="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white transition-all outline-none font-black text-slate-800 text-center"
                            required
                          />
                       </div>

                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Taxa Estimada (%)</label>
                          <div className="w-full h-14 px-6 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center font-black text-blue-600 text-lg shadow-inner">
                             {contracts[activeContractIndex].taxaAtual ? `${contracts[activeContractIndex].taxaAtual}%` : "0.00%"}
                          </div>
                       </div>
                    </motion.div>
                  )}
               </AnimatePresence>
            </div>

            {/* Ações Finais */}
            <div className="flex flex-col md:flex-row gap-4 justify-end pt-8">
               <button type="button" onClick={() => router.back()} className="px-10 py-5 rounded-2xl bg-white text-slate-500 font-black uppercase tracking-[0.2em] text-xs border border-slate-200 hover:bg-slate-50 transition-all shadow-xl">
                  Cancelar
               </button>
               <button type="submit" disabled={loading} className="px-12 py-5 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-[0.2em] text-sm hover:bg-blue-700 transition-all shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] flex items-center gap-3 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Icons.Rocket />
                  )}
                  {loading ? "PROCESSANDO..." : "INICIAR ANÁLISE MASTER"}
               </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
