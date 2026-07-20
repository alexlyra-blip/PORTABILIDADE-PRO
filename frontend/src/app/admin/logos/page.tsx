"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { api, getStaticUrl } from "@/utils/api";
import { useToast } from "@/components/ToastProvider";

export default function SubLogosPage() {
  const { toast } = useToast();
  const [logos, setLogos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLogo, setEditingLogo] = useState<any>(null);
  const [formData, setFormData] = useState<any>({ name: "", logo_url: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const norm = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

  useEffect(() => {
    loadLogos();
  }, []);

  const loadLogos = async () => {
    try {
      setLoading(true);
      const data = await api.get("/admin/sub-logos");
      const mapped = (data || []).map((l: any) => {
        if (l.name === "FORCAS") l.name = "FORÇAS ARMADAS";
        if (l.name === "GOV_EST") l.name = "GOVERNOS";
        if (l.name === "CLT_PRIVADO") l.name = "CLT PRIVADO";
        return l;
      });
      setLogos(mapped);
    } catch (error) {
      console.error("Erro ao carregar logos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (logo: any = null) => {
    if (logo) {
      setEditingLogo(logo);
      setFormData({ name: logo.name, logo_url: logo.logo_url || "" });
    } else {
      setEditingLogo(null);
      setFormData({ name: "", logo_url: "" });
    }
    setSelectedFile(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingLogo(null);
    setFormData({ name: "", logo_url: "" });
    setSelectedFile(null);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { name: formData.name, logo_url: formData.logo_url };
      let savedLogo;
      if (editingLogo) {
        savedLogo = await api.patch(`/admin/sub-logos/${editingLogo.id}`, payload);
      } else {
        savedLogo = await api.post("/admin/sub-logos", payload);
      }

      if (selectedFile && savedLogo?.id) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", selectedFile);
        const response = await api.upload(`/admin/sub-logos/${savedLogo.id}/upload-logo`, uploadFormData);
        if (response.logo_url) {
          setLogos(prev => prev.map(l => l.id === savedLogo.id ? { ...l, logo_url: response.logo_url } : l));
        }
      }

      handleCloseModal();
      loadLogos();
      toast.success("Logo salvo com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar. Verifique se o nome não está duplicado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAddBank = async (e: any) => {
    e.preventDefault();
    if (!newBankName.trim()) return;
    try {
      await api.post("/admin/sub-logos", { name: newBankName.trim().toUpperCase(), logo_url: "" });
      setNewBankName("");
      loadLogos();
      toast.success("Banco adicionado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.warning("Erro ao adicionar banco. Verifique se o nome já não existe.");
    }
  };

  const handleLogoUpload = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setFormData({ ...formData, logo_url: localUrl });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Certeza que deseja excluir este logo?")) return;
    try {
      await api.delete(`/admin/sub-logos/${id}`);
      loadLogos();
      toast.success("Logo excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir.");
    }
  };

  const defaultConvenios = ["INSS", "SIAPE", "GOVERNOS", "FORÇAS ARMADAS", "CLT PRIVADO"];
  const defaultForcas = ["EXÉRCITO", "AERONÁUTICA", "MARINHA"];
  const defaultSiape = ["01- ATIVO", "02- APOSENTADO", "03- PENSIONISTA"];
  const defaultEstados = [
    "AC - ACRE", "AL - ALAGOAS", "AP - AMAPÁ", "AM - AMAZONAS", "BA - BAHIA", "CE - CEARÁ", 
    "DF - DISTRITO FEDERAL", "ES - ESPÍRITO SANTO", "GO - GOIÁS", "MA - MARANHÃO", "MT - MATO GROSSO", 
    "MS - MATO GROSSO DO SUL", "MG - MINAS GERAIS", "PA - PARÁ", "PB - PARAÍBA", "PR - PARANÁ", 
    "PE - PERNAMBUCO", "PI - PIAUÍ", "RJ - RIO DE JANEIRO", "RN - RIO GRANDE DO NORTE", 
    "RS - RIO GRANDE DO SUL", "RO - RONDÔNIA", "RR - RORAIMA", "SC - SANTA CATARINA", 
    "SP - SÃO PAULO", "SE - SERGIPE", "TO - TOCANTINS"
  ];
  const defaultBanks = [
    "465 - CAPITAL CONSIG", "AGIBANK", "BANCO BCV", "BANCO ALFA", "BANCO CIFRA", "BANCO DO BRASIL", 
    "BANCO DO ESTADO DO SERGIPE", "BANCO ORIGINAL", "BANCO PINE", "BANCO SEGURO", 
    "BANRISUL", "BARIGUI", "BMG", "BRADESCO S.A.", "BRB", "C6 CONSIGNADO", 
    "CCB BRASIL", "CAIXA", "CREFISA", "DAYCOVAL", "DIGIO", "FACTA", "INBURSA", 
    "ITAÚ CONSIGNADO", "ITAÚ BBA", "ITAÚ UNIBANCO S.A.", "MERCANTIL", 
    "NU FINANCEIRA S.A.", "NBC BANK", "OLÉ CONSIGNADO", "PAGBANK", "PAN", 
    "PARANÁ BANCO", "BNP PARIBAS", "PARATI", "PAULISTA", "PICPAY", 
    "QI SOCIEDADE", "SABEMI", "SAFRA", "SANTANDER", "ZEMA", "BANCO INTER", "SICOOB", "OUTROS"
  ];

  const allOtherLogoNames = logos
    .map((l: any) => l.name)
    .filter((name: string) => {
      const uName = norm(name);
      const isConvenio = defaultConvenios.some(x => norm(x) === uName);
      const isForca = defaultForcas.some(x => norm(x) === uName);
      const isSiape = defaultSiape.some(x => norm(x) === uName);
      const isEstado = defaultEstados.some(x => norm(x) === uName);
      return !isConvenio && !isForca && !isSiape && !isEstado;
    });

  const mergedBanks = Array.from(new Set([
    ...defaultBanks,
    ...allOtherLogoNames
  ]));

  const categories = [
    { title: "Convênios", items: defaultConvenios },
    { title: "Forças Armadas", items: defaultForcas },
    { title: "Situação Funcional (SIAPE)", items: defaultSiape },
    { title: "Bancos de Origem", items: mergedBanks },
    { title: "Estados (Subconvênios)", items: defaultEstados }
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader
        title="Logos"
        highlight="Secundários"
        subtitle="Personalize a identidade visual de convênios, estados e instituições."
      >
        <button 
          onClick={() => handleOpenModal()}
          className="relative overflow-hidden bg-blue-600 hover:bg-blue-500 text-white font-black py-3 px-8 rounded-2xl transition-all shadow-2xl shadow-blue-500/40 hover:-translate-y-1 active:scale-95 text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 group"
        >
          <span className="text-base group-hover:rotate-90 transition-transform duration-300">＋</span> 
          Novo Logo
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-8">
        {loading ? (
           <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest animate-pulse">Carregando Logos...</p>
           </div>
        ) : categories.map(cat => {
            const catLogos = logos.filter(l => cat.items.some(item => norm(item) === norm(l.name)));
            return (
              <div key={cat.title} className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-white/10 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
                <div className="px-8 py-6 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight">{cat.title}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configurações de Identidade Visual</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">{catLogos.length} Configurados</span>
                    <button onClick={() => handleOpenModal()} className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20 hover:scale-110 transition-transform">＋</button>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {cat.title === "Bancos de Origem" && (
                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-center gap-2">
                       <span className="text-[9px] font-black text-slate-400 dark:text-slate-350 uppercase tracking-widest">Cadastro Rápido</span>
                       <input 
                         type="text"
                         placeholder="CÓDIGO - BANCO"
                         value={newBankName}
                         onChange={(e) => setNewBankName(e.target.value.toUpperCase())}
                         className="w-full text-center text-[10px] font-black uppercase bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-2 py-1.5 outline-none focus:border-blue-500 text-slate-800 dark:text-white"
                       />
                       <button 
                         type="button"
                         onClick={handleQuickAddBank}
                         className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20"
                       >
                         ＋ Adicionar
                       </button>
                    </div>
                  )}

                  {catLogos.length === 0 && cat.title !== "Bancos de Origem" ? (
                    <div className="col-span-full py-10 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum logo configurado nesta categoria</p>
                    </div>
                  ) : catLogos.map(logo => (
                    <div key={logo.id} className="group relative bg-slate-50 dark:bg-white/5 p-4 rounded-[2rem] border border-slate-100 dark:border-white/5 hover:border-blue-500/30 transition-all flex flex-col items-center text-center">
                       <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-white/5 overflow-hidden mb-4 group-hover:scale-105 transition-transform">
                          {logo.logo_url ? (
                             <img src={getStaticUrl(logo.logo_url)} className="w-full h-full object-cover" />
                          ) : (
                             <div className="w-full h-full flex items-center justify-center font-black text-blue-600 text-xl">{logo.name.charAt(0)}</div>
                          )}
                       </div>
                       <h4 className="text-[9px] font-black text-slate-700 dark:text-white uppercase tracking-tight line-clamp-1">{logo.name}</h4>
                       
                       <div className="absolute inset-0 bg-blue-600/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all rounded-[2rem] flex flex-col items-center justify-center gap-2">
                          <button onClick={() => handleOpenModal(logo)} className="w-full px-4 py-2 text-[9px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-colors">Editar</button>
                          <div className="h-[1px] w-8 bg-white/20"></div>
                          <button onClick={() => handleDelete(logo.id)} className="w-full px-4 py-2 text-[9px] font-black text-red-200 uppercase tracking-widest hover:bg-red-500/20 transition-colors">Excluir</button>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            );
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-up border border-white/20">
            <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-800 text-base uppercase tracking-tight">
                  {editingLogo ? "Editar Logo" : "Novo Logo"}
                </h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Configuração de Identidade</p>
              </div>
              <button onClick={handleCloseModal} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-400 hover:text-red-500 transition-colors text-2xl">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Selecione o Item *</label>
                <input 
                  type="text" 
                  required
                  list="logoNames"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value.toUpperCase()})}
                  className="input-admin !rounded-2xl !bg-slate-50 border-none shadow-inner uppercase font-black text-xs"
                  placeholder="Ex: INSS, PAN, MARINHA..."
                />
                <datalist id="logoNames">
                  {categories.flatMap(c => c.items).map(item => <option key={item} value={item} />)}
                </datalist>
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Upload da Logo</label>
                <div className="flex flex-col items-center gap-4 p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                  {formData.logo_url ? (
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-xl border-2 border-white">
                        <img src={getStaticUrl(formData.logo_url) || formData.logo_url} className="w-full h-full object-cover" />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => { setFormData({...formData, logo_url: ""}); setSelectedFile(null); }}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                      >🗑️</button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center gap-2">
                      <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl shadow-xl shadow-blue-500/20 animate-bounce">📁</div>
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Selecionar Imagem</span>
                      <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/30 disabled:opacity-50">
                  {isSubmitting ? "Salvando..." : "Salvar Agora"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
