"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, getStaticUrl } from "@/utils/api";

export default function SimuladorPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [dbBanks, setDbBanks] = useState([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [loading, setLoading] = useState(false);
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
        new Promise(resolve => setTimeout(resolve, 3000))
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
      
      router.push("/ofertas");
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
    <div className="w-full max-w-[1200px] mx-auto py-6 px-4 relative">
      {/* Calculating Animation Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md animate-fade-in">
          <style>{`
            @keyframes orbit {
              0% { transform: rotateY(0deg); }
              100% { transform: rotateY(-360deg); }
            }
            @keyframes counter-orbit {
              0% { transform: rotateY(0deg); }
              100% { transform: rotateY(360deg); }
            }
            .carousel-scene {
              perspective: 800px;
              width: 240px;
              height: 140px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 1rem;
            }
            .carousel-spinner {
              width: 80px;
              height: 80px;
              position: relative;
              transform-style: preserve-3d;
              animation: orbit 3.5s infinite linear;
            }
            .carousel-wrapper {
              position: absolute;
              top: 0;
              left: 0;
              width: 80px;
              height: 80px;
              transform-style: preserve-3d;
            }
            .carousel-pos-1 { transform: rotateY(0deg) translateZ(90px); }
            .carousel-pos-2 { transform: rotateY(120deg) translateZ(90px); }
            .carousel-pos-3 { transform: rotateY(240deg) translateZ(90px); }
            
            .carousel-item {
              width: 100%;
              height: 100%;
              border-radius: 50%;
              overflow: hidden;
              border: 4px solid white;
              box-shadow: 0 10px 25px rgba(0,0,0,0.3);
              background: white;
              animation: counter-orbit 3.5s infinite linear;
            }
            .carousel-item img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
          `}</style>
          
          <div className="carousel-scene">
             <div className="carousel-spinner">
                <div className="carousel-wrapper carousel-pos-1">
                   <div className="carousel-item">
                      <img src={getLogo(0)} alt="Banco 1" />
                   </div>
                </div>
                <div className="carousel-wrapper carousel-pos-2">
                   <div className="carousel-item">
                      <img src={getLogo(1)} alt="Banco 2" />
                   </div>
                </div>
                <div className="carousel-wrapper carousel-pos-3">
                   <div className="carousel-item">
                      <img src={getLogo(2)} alt="Banco 3" />
                   </div>
                </div>
             </div>
          </div>

          <div className="mt-8 text-center space-y-4">
             <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter drop-shadow-sm">
               Análise Inteligente <span className="text-blue-600">PortPRO</span>
             </h3>
             <p className="text-[10px] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-[0.4em] max-w-sm mx-auto leading-relaxed">
               Varrendo as melhores taxas do mercado nacional
             </p>
          </div>
          <div className="mt-10 flex gap-2">
             <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-bounce shadow-md shadow-blue-500/50" style={{animationDelay: '0s'}}></div>
             <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-bounce shadow-md shadow-blue-500/50" style={{animationDelay: '0.15s'}}></div>
             <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-bounce shadow-md shadow-blue-500/50" style={{animationDelay: '0.3s'}}></div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto mb-10 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/10 shadow-2xl overflow-hidden animate-fade-in">
        
        <div className="bg-blue-600 p-8 flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center text-white text-2xl shadow-2xl">⚡</div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Simulador PRO</h2>
            <p className="text-[9px] text-white/70 font-bold uppercase tracking-[0.4em] mt-0.5">Análise de Portabilidade e Elegibilidade</p>
          </div>
        </div>

        <form onSubmit={handleSimular} className="p-5 space-y-6">
          
          <div className="space-y-10">
            <h3 className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest border-l-8 border-blue-600 pl-4 py-2 bg-blue-50/50 dark:bg-blue-900/20 rounded-r-xl">I. Perfil de Identificação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                <input type="text" name="nome_cliente" value={formData.nome_cliente} onChange={handleChange} className="input-premium w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-600 shadow-sm py-1.5" placeholder="Digite o nome completo..." />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">CPF</label>
                <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} className={`input-premium w-full bg-slate-50 dark:bg-slate-800 border-2 ${formData.cpf && !validateCPF(formData.cpf) ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'} text-slate-900 dark:text-white focus:border-blue-600 shadow-sm transition-all py-1.5`} placeholder="000.000.000-00" />
                {formData.cpf && !validateCPF(formData.cpf) && <p className="text-[9px] text-red-500 font-bold uppercase ml-1 animate-pulse">CPF Inválido</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Idade</label>
                <input type="text" name="idade" value={formData.idade} onChange={handleChange} className="input-premium w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-600 shadow-sm font-black text-xl py-1" placeholder="65" maxLength={2} required />
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Convênio</label>
                <div className="flex items-center gap-2">
                  {formData.agreement && (() => {
                    const match = subLogos.find(l => l.name === formData.agreement);
                    return match?.logo_url ? (
                      <img src={getStaticUrl(match.logo_url)} alt="" className="w-9 h-9 object-contain rounded-lg overflow-hidden shrink-0 shadow-md border border-slate-200 dark:border-slate-700 bg-white" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold shrink-0 shadow-md border border-slate-200 dark:border-slate-700 text-[10px]">{formData.agreement.substring(0, 3)}</div>
                    );
                  })()}
                  <select name="agreement" value={formData.agreement} onChange={handleChange} className="input-premium flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold uppercase text-xs py-1.5" required>
                    <option value="">Selecione o Convênio</option>
                    <option value="INSS">INSS - PREVIDÊNCIA SOCIAL</option>
                    <option value="SIAPE">SIAPE - FEDERAL</option>
                    <option value="GOV_EST">GOVERNO ESTADUAL</option>
                    <option value="FORCAS">FORÇAS ARMADAS</option>
                    <option value="CLT_PRIVADO">CLT PRIVADO</option>
                  </select>
                </div>
              </div>

              {(formData.agreement === "FORCAS" || formData.agreement === "GOV_EST") && (() => {
                const isForcas = formData.agreement === "FORCAS";
                const options = isForcas 
                  ? ["EXERCITO", "AERONAUTICA", "MARINHA"] 
                  : [
                      "AC - ACRE", "AL - ALAGOAS", "AP - AMAPÁ", "AM - AMAZONAS", "BA - BAHIA", "CE - CEARÁ", 
                      "DF - DISTRITO FEDERAL", "ES - ESPÍRITO SANTO", "GO - GOIÁS", "MA - MARANHÃO", "MT - MATO GROSSO", 
                      "MS - MATO GROSSO DO SUL", "MG - MINAS GERAIS", "PA - PARÁ", "PB - PARAÍBA", "PR - PARANÁ", 
                      "PE - PERNAMBUCO", "PI - PIAUÍ", "RJ - RIO DE JANEIRO", "RN - RIO GRANDE DO NORTE", 
                      "RS - RIO GRANDE DO SUL", "RO - RONDÔNIA", "RR - RORAIMA", "SC - SANTA CATARINA", 
                      "SP - SÃO PAULO", "SE - SERGIPE", "TO - TOCANTINS"
                    ];
                
                const currentLogoData = formData.sub_agreement ? subLogos.find(l => l.name === formData.sub_agreement) : null;
                const currentLogoUrl = currentLogoData?.logo_url ? getStaticUrl(currentLogoData.logo_url) : null;

                return (
                  <div className="space-y-3 col-span-1 md:col-span-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">{isForcas ? "Força Armada" : "Estado"}</label>
                    <div className="flex items-center gap-2">
                      {currentLogoUrl ? (
                        <img src={currentLogoUrl} alt="Logo" className="w-9 h-9 object-cover rounded-lg overflow-hidden shrink-0 shadow-md border border-slate-200 dark:border-slate-700 bg-white" />
                      ) : formData.sub_agreement ? (
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-bold shrink-0 shadow-md border border-slate-200 dark:border-slate-700 text-[10px]">{formData.sub_agreement.substring(0, 2)}</div>
                      ) : null}
                      <div className="relative flex-1">
                        <input 
                          type="text" 
                          value={formData.sub_agreement || ""}
                          onChange={(e) => {
                            setFormData({...formData, sub_agreement: e.target.value.toUpperCase()});
                            setSubDropdownOpen(true);
                          }} 
                          onFocus={() => setSubDropdownOpen(true)}
                          onBlur={() => setTimeout(() => setSubDropdownOpen(false), 200)}
                          className="input-premium w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-600 shadow-sm py-1.5" 
                          placeholder={isForcas ? "Ex: EXERCITO" : "Ex: SP"} 
                          required 
                          autoComplete="off"
                        />
                        {subDropdownOpen && (
                          <ul className="absolute z-[60] w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                            {options.filter(opt => !formData.sub_agreement || opt.includes(formData.sub_agreement)).map(opt => {
                              const logoMatch = subLogos.find(l => l.name === opt);
                              const logoUrl = logoMatch?.logo_url ? getStaticUrl(logoMatch.logo_url) : null;
                              return (
                                <li 
                                  key={opt} 
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setFormData({...formData, sub_agreement: opt});
                                    setSubDropdownOpen(false);
                                  }}
                                  className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-3 border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                                >
                                  {logoUrl ? (
                                    <img src={logoUrl} alt={opt} className="w-8 h-8 object-contain rounded-md bg-white border border-slate-100" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-sm">{opt.substring(0,2)}</div>
                                  )}
                                  <span className="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase">{opt}</span>
                                </li>
                              );
                            })}
                            {options.filter(opt => !formData.sub_agreement || opt.includes(formData.sub_agreement)).length === 0 && (
                              <li className="px-4 py-3 text-xs text-slate-500 italic">Nenhuma opção encontrada.</li>
                            )}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {formData.agreement === 'INSS' && (
              <div className="space-y-3 animate-slide-up">
                <label className="text-[11px] font-black text-blue-600 uppercase tracking-widest ml-1">Espécie do Benefício</label>
                <select name="benefit_species" value={formData.benefit_species} onChange={handleChange} className="input-premium w-full font-black text-blue-800 dark:text-blue-300 bg-blue-50/20 dark:bg-slate-800 border-2 border-blue-200 dark:border-slate-700 text-xs py-1.5" required>
                  <option value="">Buscar espécie...</option>
                  {inssSpecies.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 px-8 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/5">
              {parseInt(formData.idade || 0) >= 60 && (
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">CLIENTE 60+</label>
                  <div className="flex p-1 bg-slate-200 dark:bg-slate-800 rounded-[1.2rem] w-full shadow-inner">
                    <button type="button" onClick={() => setFormData({...formData, is_60_plus: false})} className={`flex-1 py-2 rounded-[1rem] text-[9px] font-black uppercase transition-all ${!formData.is_60_plus ? "bg-white dark:bg-slate-700 text-blue-600 shadow-xl" : "text-slate-400 hover:text-slate-500"}`}>Não</button>
                    <button type="button" onClick={() => setFormData({...formData, is_60_plus: true})} className={`flex-1 py-2 rounded-[1rem] text-[9px] font-black uppercase transition-all ${formData.is_60_plus ? "bg-blue-600 text-white shadow-xl" : "text-slate-400 hover:text-slate-500"}`}>Sim (60+)</button>
                  </div>
                </div>
              )}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">Cliente Alfabetizado?</label>
                <div className="flex p-1 bg-slate-200 dark:bg-slate-800 rounded-[1.2rem] w-full shadow-inner">
                   <button type="button" onClick={() => setFormData({...formData, analfabeto: 'nao'})} className={`flex-1 py-2 rounded-[1rem] text-[9px] font-black uppercase transition-all ${formData.analfabeto === 'nao' ? "bg-blue-600 text-white shadow-xl" : "text-slate-400 hover:text-slate-500"}`}>Sim</button>
                   <button type="button" onClick={() => setFormData({...formData, analfabeto: 'sim'})} className={`flex-1 py-2 rounded-[1rem] text-[9px] font-black uppercase transition-all ${formData.analfabeto === 'sim' ? "bg-blue-600 text-white shadow-xl" : "text-slate-400 hover:text-slate-500"}`}>Não</button>
                </div>
              </div>
            </div>

            {formData.agreement === 'INSS' && ["04", "05", "06", "32", "33", "34", "92"].includes(formData.benefit_species) && (() => {
              const is60Plus = parseInt(formData.idade || 0) >= 60;
              return (
                <div className="space-y-6 animate-slide-up">
                   <div className="flex flex-col md:flex-row items-center justify-between bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-[2.5rem] border border-blue-100 dark:border-white/5 shadow-md">
                      <span className="text-[11px] font-black text-blue-900 dark:text-blue-400 uppercase tracking-widest block text-center md:text-left mb-4 md:mb-0">INVALIDEZ ACIMA DE 60 ANOS?</span>
                      <div className="flex p-2 bg-slate-200 dark:bg-slate-800 rounded-[1.8rem] w-full md:w-64 shadow-inner opacity-80">
                         <button type="button" disabled className={`flex-1 py-3 rounded-[1.4rem] text-[10px] font-black uppercase transition-all ${!is60Plus ? "bg-blue-600 text-white shadow-xl" : "text-slate-400 cursor-not-allowed"}`}>Não</button>
                         <button type="button" disabled className={`flex-1 py-3 rounded-[1.4rem] text-[10px] font-black uppercase transition-all ${is60Plus ? "bg-emerald-500 text-white shadow-xl" : "text-slate-400 cursor-not-allowed"}`}>Sim (+60)</button>
                      </div>
                   </div>

                   {!is60Plus ? (
                     <div className="p-10 bg-blue-50/50 dark:bg-blue-900/10 rounded-[3rem] border border-blue-100 flex flex-col md:flex-row items-center gap-10 animate-slide-up shadow-2xl">
                       <div className="w-20 h-20 rounded-[1.8rem] bg-white flex items-center justify-center text-4xl shadow-2xl shadow-blue-500/10 border border-blue-50">🗓️</div>
                       <div className="flex-1 space-y-4">
                         <label className="text-[11px] font-black text-blue-900 uppercase tracking-widest">Data de Concessão do Benefício</label>
                         <input type="date" name="data_concessao" value={formData.data_concessao} onChange={handleChange} className="input-premium w-full bg-white dark:bg-slate-800 border-2 border-blue-300 dark:border-slate-700 py-5 font-black text-blue-900 dark:text-white shadow-inner" required />
                         <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight italic opacity-70">Necessário para validar carência obrigatória de benefício previdenciário.</p>
                       </div>
                     </div>
                   ) : (
                     <div className="p-6 bg-emerald-500/10 rounded-[2rem] border border-emerald-500/20 text-center animate-pulse">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">✅ Isenção de carência detectada (Idade {formData.idade} anos)</span>
                     </div>
                   )}
                </div>
              );
            })()}
          </div>

          <div className="space-y-10 pt-10 border-t border-slate-50 dark:border-white/5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest border-l-8 border-emerald-600 pl-4 py-2 bg-emerald-50/50 rounded-r-xl">II. Dados do Contrato Atual</h3>
            </div>
            
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {contracts.map((c, idx) => (
                <button 
                  key={c.id} 
                  type="button"
                  onClick={() => setActiveContractIndex(idx)}
                  className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${activeContractIndex === idx ? "bg-blue-600 text-white shadow-lg" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"}`}
                >
                  CONTRATO {idx + 1}
                </button>
              ))}
              {contracts.length < 5 && (
                <button type="button" onClick={addContract} className="px-6 py-3 bg-slate-100/50 dark:bg-slate-800/50 hover:bg-slate-200 text-blue-600 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all border border-blue-200 dark:border-blue-900 border-dashed">
                  + NOVO
                </button>
              )}
            </div>

            {contracts.length > 0 && contracts[activeContractIndex] && (() => {
              const c = contracts[activeContractIndex];
              const searchName = c.banco ? (c.banco.includes('-') ? c.banco.split('-')[1].trim().toUpperCase() : c.banco.toUpperCase()) : "";
              const cBankData = c.banco ? dbBanks.find(b => {
                const bN = b.name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]/g, '');
                const sN = searchName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]/g, '');
                return bN === sN;
              }) : null;
              const subMatch = c.banco ? subLogos.find(l => {
                const lN = l.name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]/g, '');
                const sN = searchName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]/g, '');
                return lN === sN;
              }) : null;
              const cLogo = subMatch?.logo_url ? getStaticUrl(subMatch.logo_url) : (cBankData?.logo_url ? getStaticUrl(cBankData.logo_url) : null);
              
              return (
              <div key={c.id} className="grid grid-cols-1 md:grid-cols-12 gap-8 bg-slate-50 dark:bg-slate-800/50 p-6 lg:p-8 rounded-[2rem] border border-slate-100 dark:border-white/5 relative mt-4 animate-slide-up">
                {contracts.length > 1 && (
                  <button type="button" onClick={() => removeContract(c.id)} className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-2 rounded-full font-bold text-xs uppercase tracking-widest transition-all">Remover</button>
                )}
                <div className="md:col-span-7 space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Instituição de Origem (Contrato {activeContractIndex + 1})</label>
                  <div className="flex items-center gap-2">
                    {cLogo && (
                      <img src={cLogo} alt="Logo" className="w-9 h-9 object-cover rounded-lg overflow-hidden shrink-0 shadow-md border border-slate-200 dark:border-slate-700 bg-white" />
                    )}
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        name="banco" 
                        value={c.banco} 
                        onChange={(e) => {
                          handleContractChange(c.id, e);
                          setDropdownOpen({...dropdownOpen, [c.id]: true});
                        }} 
                        onFocus={() => setDropdownOpen({...dropdownOpen, [c.id]: true})}
                        onBlur={() => setTimeout(() => setDropdownOpen({...dropdownOpen, [c.id]: false}), 200)}
                        className="input-premium w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-600 shadow-sm py-1.5" 
                        placeholder="Ex: 029 - ITAU..." 
                        required 
                        autoComplete="off"
                      />
                      {dropdownOpen[c.id] && (
                        <ul className="absolute z-[60] w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                          {inssBanks.filter(b => !c.banco || b.label.toLowerCase().includes(c.banco.toLowerCase())).map(b => {
                            const bName = b.label.includes('-') ? b.label.split('-')[1].trim().toUpperCase() : b.label.toUpperCase();
                            const dbMatch = dbBanks.find(dbb => {
                              const dbN = dbb.name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]/g, '');
                              const bN = bName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]/g, '');
                              return dbN === bN;
                            });
                            
                            const subMatchList = subLogos.find(sub => {
                              const subN = sub.name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]/g, '');
                              const bN = bName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]/g, '');
                              return subN === bN;
                            });
                            const logoUrl = subMatchList?.logo_url ? getStaticUrl(subMatchList.logo_url) : (dbMatch?.logo_url ? getStaticUrl(dbMatch.logo_url) : null);
                            return (
                              <li 
                                key={b.value} 
                                onMouseDown={(e) => {
                                  e.preventDefault(); // Prevent input from losing focus immediately
                                  handleContractChange(c.id, { target: { name: 'banco', value: b.label } });
                                  setDropdownOpen({...dropdownOpen, [c.id]: false});
                                }}
                                className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-3 border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                              >
                                {logoUrl ? (
                                  <img src={logoUrl} className="w-8 h-8 object-cover rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700 bg-white" alt="" />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px]">🏛️</div>
                                )}
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase">{b.label}</span>
                              </li>
                            );
                          })}
                          {inssBanks.filter(b => !c.banco || b.label.toLowerCase().includes(c.banco.toLowerCase())).length === 0 && (
                             <li className="px-4 py-4 text-xs text-slate-400 font-bold uppercase text-center">Nenhum banco encontrado</li>
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                  {user && user.role === 'admin' && c.banco && (
                    <div className="mt-2 text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded-md">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">UPLOAD LOGO BANCO (ADMIN):</label>
                      {uploadingLogo ? (
                        <div className="text-blue-600 font-bold text-[10px] animate-pulse py-1 flex items-center gap-2">
                           <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                           ENVIANDO LOGO...
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <input type="file" accept="image/*" onChange={(e) => { setFormData({...formData, banco: c.banco}); handleLogoUpload(e, c.banco); }} className="w-full text-sm" />
                          {cLogo && cBankData?.id && (
                             <button type="button" onClick={() => handleLogoDelete(cBankData.id)} className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase self-start px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-100 dark:border-red-900/30 transition-all active:scale-95">
                               🗑️ Excluir Logo Atual
                             </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="md:col-span-5 space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Valor da Parcela (R$)</label>
                  <input type="text" name="parcela" value={c.parcela} onChange={(e) => handleContractChange(c.id, e)} className="input-premium w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-600 shadow-sm font-black text-xl py-1" placeholder="0,00" required />
                </div>

                <div className="md:col-span-5 space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Saldo Devedor (R$)</label>
                  <input type="text" name="saldoDevedor" value={c.saldoDevedor} onChange={(e) => handleContractChange(c.id, e)} className="input-premium w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-600 shadow-sm font-black text-xl py-1" placeholder="0,00" required />
                </div>

                <div className="md:col-span-7 grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Prazo Contratual</label>
                    <input type="number" name="prazoTotal" value={c.prazoTotal} onChange={(e) => handleContractChange(c.id, e)} className="input-premium w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white py-1.5" placeholder="84" required />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Parcelas Pagas</label>
                    <input type="number" name="parcelasPagas" value={c.parcelasPagas} onChange={(e) => handleContractChange(c.id, e)} className="input-premium w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white py-1.5" placeholder="Ex: 12" required />
                  </div>
                </div>

                <div className="col-span-1 md:col-span-12 space-y-6 pt-6 border-t border-slate-50 dark:border-white/5">
                  <h4 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">💹 Cálculo de Taxa & Preview de Motor</h4>
                  <div className="bg-blue-50/40 dark:bg-blue-900/10 rounded-[2.5rem] p-8 shadow-xl text-slate-800 dark:text-white space-y-6 border border-blue-100 dark:border-white/5 animate-slide-up">
                    <div className="flex flex-col md:flex-row items-center justify-between border-b border-blue-100 dark:border-white/10 pb-6 gap-4">
                       <div>
                          <span className="text-[11px] uppercase font-bold text-blue-600 dark:text-blue-400 block mb-1">Taxa HP-12C Simulada (Cliente)</span>
                       </div>
                       <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-blue-200 dark:border-white/10 shadow-sm">
                          <input 
                             type="text" 
                             value={c.taxaAjustada || c.taxaAtual || "0.00"} 
                             onChange={(e) => handleContractChange(c.id, {target: {name: 'taxaAjustada', value: e.target.value.replace(',', '.')}})}
                             className="w-24 bg-transparent border-none text-blue-600 dark:text-blue-400 font-black text-3xl text-right outline-none tracking-tighter"
                          />
                          <span className="text-xl font-black text-blue-300">%</span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
              );
            })()}
          </div>

          <div className="pt-16 border-t border-slate-50 dark:border-white/5 flex justify-center">
             <button 
               type="submit" 
               disabled={loading} 
               className="w-full md:w-3/4 py-6 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-black text-[12px] uppercase tracking-[0.4em] shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 relative overflow-hidden group"
             >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>PROCESSANDO...</span>
                  </>
                ) : (
                  <>
                    <span>🚀 EFETUAR SIMULAÇÃO</span>
                    <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all">✨</span>
                  </>
                )}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
