"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { api } from "@/utils/api";
import { Icons } from "@/components/Icons";

interface ChatMessage {
  role: string;
  text: string;
  timestamp: string;
}

interface ChatLog {
  id: number;
  protocol: string;
  sender_phone: string;
  client_name: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: number;
  user_name?: string;
  messages: ChatMessage[];
}

export default function WhatsappLogsPage() {
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ChatLog | null>(null);
  const [brandColor, setBrandColor] = useState('#2563eb');

  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      if (u) {
        const user = JSON.parse(u);
        if (user.brand_color) setBrandColor(user.brand_color);
      }
    } catch(e) {}
  }, []);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await api.get("/admin/whatsapp-logs");
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    const matchTerm = log.protocol?.toLowerCase().includes(term) || log.sender_phone?.includes(term) || log.client_name?.toLowerCase().includes(term);
    const matchStatus = statusFilter === "all" || log.status === statusFilter;
    return matchTerm && matchStatus;
  });

  const formatDate = (ds: string) => {
    if (!ds) return "";
    try {
      const d = new Date(ds);
      if (isNaN(d.getTime())) return ds;
      return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR").slice(0,5);
    } catch (e) {
      return ds;
    }
  };
  
  const getMessagesArray = (log: ChatLog) => {
    if (!log.messages) return [];
    if (typeof log.messages === 'string') {
      try {
        const parsed = JSON.parse(log.messages);
        if (Array.isArray(parsed)) return parsed;
        const parsed2 = JSON.parse(parsed);
        if (Array.isArray(parsed2)) return parsed2;
      } catch (e) {
        console.error("Error parsing messages:", e);
        return [];
      }
    }
    if (Array.isArray(log.messages)) return log.messages;
    return [];
  };
  
  const cleanPhone = (p: string) => p ? p.split('@')[0].split(':')[0] : '';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader 
          title="Auditoria" highlight="WhatsApp"
          subtitle="Visualize e audite todos os atendimentos feitos pela assistente Clara."
          icon={Icons.MessageCircle}
        />

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por protocolo, nome ou telefone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 outline-none font-bold text-sm shadow-sm transition-all"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-12 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm shadow-sm outline-none focus:border-blue-500 min-w-[200px]"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Em Atendimento (Ativo)</option>
            <option value="finished">Finalizado</option>
          </select>
          <button 
            onClick={loadLogs}
            className="h-12 px-6 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-slate-900/20 hover:opacity-90 transition-all flex items-center gap-2" style={{ backgroundColor: brandColor }}
          >
            <Icons.RefreshCw size={18} /> Atualizar
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Icons.Loader2 className="animate-spin text-blue-600" size={40} />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-12 text-center shadow-xl shadow-slate-200/50 dark:shadow-none">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icons.Inbox className="text-slate-400" size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Nenhum atendimento encontrado</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Os registros aparecerão aqui conforme as interações acontecem no WhatsApp.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Protocolo</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Usuário</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Data</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Cliente / Telefone</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Interações</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold text-xs">
                          <Icons.Hash size={12} /> {log.protocol}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{log.user_name || 'Desconhecido'}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{formatDate(log.created_at)}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-black text-sm text-slate-900 dark:text-white uppercase">{log.client_name || 'Desconhecido'}</span>
                          <span className="text-[10px] font-bold text-slate-400 mt-0.5">{cleanPhone(log.sender_phone)}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-xs font-black text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                          {log.messages?.length || 0} msgs
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                          log.status === 'finished' 
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {log.status === 'finished' ? 'Finalizado' : 'Ativo'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => { setSelectedLog(log); setModalOpen(true); }}
                          className="inline-flex items-center gap-2 px-4 py-2 text-white font-bold text-xs rounded-xl shadow-md hover:opacity-90 transition-all" style={{ backgroundColor: brandColor }}
                        >
                          <Icons.Eye size={14} /> Ver Chat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Chat Modal */}
      {modalOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Icons.MessageCircle size={24} className="text-green-500" />
                  Chat: {selectedLog.client_name || cleanPhone(selectedLog.sender_phone)}
                </h2>
                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Protocolo: {selectedLog.protocol}</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors">
                <Icons.X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4" style={{ backgroundColor: '#efeae2', backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundRepeat: 'repeat', backgroundSize: '400px' }}>
              {getMessagesArray(selectedLog).map((msg, idx) => {
                const isBot = msg.role === 'bot';
                return (
                  <div key={idx} className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                      isBot 
                        ? 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-tl-sm' 
                        : 'bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-white rounded-tr-sm shadow-sm'
                    }`}>
                      {isBot && <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">Clara</div>}
                      {!isBot && <div className="text-[10px] font-black uppercase tracking-widest text-green-700 dark:text-green-300 mb-2">{selectedLog.client_name || 'Cliente'}</div>}
                      
                      <div className={`text-sm font-medium whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200`}>
                        {msg.text.split(/(\*[^*]+\*)/g).map((part, i) => 
                          part.startsWith('*') && part.endsWith('*') 
                            ? <strong key={i} className="font-bold text-black dark:text-white">{part.slice(1, -1)}</strong> 
                            : part
                        )}
                      </div>
                      <div className={`text-[9px] font-bold mt-2 text-right ${isBot ? 'text-slate-400' : 'text-slate-500 dark:text-green-200'}`}>
                        {formatDate(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })}
              {getMessagesArray(selectedLog).length === 0 && (
                <div className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest py-8">Nenhuma mensagem registrada</div>
              )}
            </div>
            
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest ${
                selectedLog.status === 'finished' 
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                  : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>
                {selectedLog.status === 'finished' ? 'Atendimento Encerrado' : 'Em Atendimento'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
