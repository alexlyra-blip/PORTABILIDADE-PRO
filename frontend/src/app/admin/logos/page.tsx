"use client";

import { useEffect, useState } from "react";
import { api, getStaticUrl } from "@/utils/api";

export default function SubLogosPage() {
  const [logos, setLogos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLogo, setEditingLogo] = useState<any>(null);
  const [formData, setFormData] = useState<any>({ name: "", logo_url: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const norm = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

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

      // If there's a file to upload, do it now using the saved ID
      if (selectedFile && savedLogo?.id) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", selectedFile);
        const response = await api.upload(`/admin/sub-logos/${savedLogo.id}/upload-logo`, uploadFormData);
        
        // Se o upload retornou o novo logo_url (Base64), atualizamos a lista local
        if (response.logo_url) {
          setLogos(prev => prev.map(l => l.id === savedLogo.id ? { ...l, logo_url: response.logo_url } : l));
        }
      }

      handleCloseModal();
      alert("✅ Logo salvo com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar. Verifique se o nome não está duplicado.");
    } finally {
      setIsSubmitting(false);
      loadLogos();
    }
  };

  const handleLogoUpload = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    // Just store in state and show a local preview
    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setFormData({ ...formData, logo_url: localUrl });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Certeza que deseja excluir este logo?")) return;
    try {
      await api.delete(`/admin/sub-logos/${id}`);
      loadLogos();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Logos Secundários</h1>
          <p className="text-slate-500 text-sm mt-1">Configure os logos dos Convênios, Forças Armadas, Governos Estaduais e Instituições de Origem.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="btn-premium flex items-center gap-2 !py-2.5 !px-5 !rounded-xl !bg-blue-600 hover:!bg-blue-500 text-sm"
        >
          <span className="text-lg">➕</span> Novo Logo
        </button>
      </div>

      <div className="admin-card overflow-hidden shadow-sm border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Nome (Força, Estado ou Banco Origem)</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={2} className="px-6 py-12 text-center text-slate-400 italic">Carregando dados...</td></tr>
            ) : logos.length === 0 ? (
              <tr><td colSpan={2} className="px-6 py-12 text-center text-slate-400 italic">Nenhum logo cadastrado.</td></tr>
            ) : (
              logos.map((logo) => (
                <tr key={logo.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {logo.logo_url ? (
                        <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white flex items-center justify-center">
                          <img src={getStaticUrl(logo.logo_url) || ""} alt={logo.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100 shadow-sm">
                          {logo.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-slate-700 block uppercase">{logo.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: #{logo.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        <button 
                            onClick={() => handleOpenModal(logo)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Editar"
                        >
                            ✏️
                        </button>
                        <button 
                            onClick={() => handleDelete(logo.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Excluir"
                        >
                            🗑️
                        </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-up border border-white/20">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingLogo ? "Editar Logo" : "Novo Logo"}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 text-2xl font-light">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nome (Força, Estado ou Banco) *</label>
                <input 
                  type="text" 
                  required
                  list="logoNames"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value.toUpperCase()})}
                  className="input-admin uppercase"
                  placeholder="Selecione na lista ou digite..."
                />
                <datalist id="logoNames">
                  {/* Convênios - Filtrados se já existem */}
                  {["INSS", "SIAPE", "GOVERNOS", "FORÇAS ARMADAS", "CLT PRIVADO"]
                    .filter(c => !logos.some(l => norm(l.name) === norm(c)) || (editingLogo && norm(editingLogo.name) === norm(c)))
                    .map(c => <option key={c} value={c} />)}
                  
                  {/* Forças - Filtradas */}
                  {["EXÉRCITO", "AERONÁUTICA", "MARINHA"]
                    .filter(f => !logos.some(l => norm(l.name) === norm(f)) || (editingLogo && norm(editingLogo.name) === norm(f)))
                    .map(f => <option key={f} value={f} />)}
                  
                  {/* Estados - Filtrados e com nome completo */}
                  {[
                    "AC - ACRE", "AL - ALAGOAS", "AP - AMAPÁ", "AM - AMAZONAS", "BA - BAHIA", "CE - CEARÁ", 
                    "DF - DISTRITO FEDERAL", "ES - ESPÍRITO SANTO", "GO - GOIÁS", "MA - MARANHÃO", "MT - MATO GROSSO", 
                    "MS - MATO GROSSO DO SUL", "MG - MINAS GERAIS", "PA - PARÁ", "PB - PARAÍBA", "PR - PARANÁ", 
                    "PE - PERNAMBUCO", "PI - PIAUÍ", "RJ - RIO DE JANEIRO", "RN - RIO GRANDE DO NORTE", 
                    "RS - RIO GRANDE DO SUL", "RO - RONDÔNIA", "RR - RORAIMA", "SC - SANTA CATARINA", 
                    "SP - SÃO PAULO", "SE - SERGIPE", "TO - TOCANTINS"
                  ]
                    .filter(uf => !logos.some(l => norm(l.name) === norm(uf)) || (editingLogo && norm(editingLogo.name) === norm(uf)))
                    .map(uf => <option key={uf} value={uf} />)}
                  
                  {/* Bancos de Origem - Filtrados */}
                  {[
                    "AGIBANK", "BANCO BCV", "BANCO ALFA", "BANCO CIFRA", "BANCO DO BRASIL", 
                    "BANCO DO ESTADO DO SERGIPE", "BANCO ORIGINAL", "BANCO PINE", "BANCO SEGURO", 
                    "BANRISUL", "BARIGUI", "BMG", "BRADESCO S.A.", "BRB", "C6 CONSIGNADO", 
                    "CCB BRASIL", "CAIXA", "CREFISA", "DAYCOVAL", "DIGIO", "FACTA", "INBURSA", 
                    "ITAÚ CONSIGNADO", "ITAÚ BBA", "ITAÚ UNIBANCO S.A.", "MERCANTIL", 
                    "NU FINANCEIRA S.A.", "NBC BANK", "OLÉ CONSIGNADO", "PAGBANK", "PAN", 
                    "PARANÁ BANCO", "BNP PARIBAS", "PARATI", "PAULISTA", "PICPAY", 
                    "QI SOCIEDADE", "SABEMI", "SAFRA", "SANTANDER", "ZEMA", "BANCO INTER", "SICOOB", "OUTROS"
                  ]
                    .filter(b => !logos.some(l => norm(l.name) === norm(b)) || (editingLogo && norm(editingLogo.name) === norm(b)))
                    .map(b => <option key={b} value={b} />)}
                </datalist>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Logo do Convênio</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl border border-dashed border-slate-300 transition-all font-bold text-xs uppercase">
                    <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                    <span>📁 Selecionar Imagem</span>
                  </label>
                  {formData.logo_url && (
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200">
                        <img src={getStaticUrl(formData.logo_url) || formData.logo_url} className="w-full h-full object-contain bg-white" />
                      </div>
                      <button 
                        type="button" 
                        onClick={() => {
                          setFormData({...formData, logo_url: ""});
                          setSelectedFile(null);
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Remover imagem"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={handleCloseModal} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30">
                  {isSubmitting ? "Salvando..." : "Salvar Logo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
