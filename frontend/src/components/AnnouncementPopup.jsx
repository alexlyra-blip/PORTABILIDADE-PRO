"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getStaticUrl } from "@/utils/api";
import { getActiveAnnouncement } from "@/utils/globalDataCache";

export default function AnnouncementPopup() {
  const [announcement, setAnnouncement] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    let timerId = null;

    const fetchAnnouncement = async () => {
      try {
        const data = await getActiveAnnouncement();
        if (data && data.active) {
          // Check if user already saw this specific announcement
          const readKey = `announcement_read_${data.id}`;
          if (!localStorage.getItem(readKey)) {
            setAnnouncement(data);
            setIsVisible(true);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar comunicado:", err);
      }
    };
    
    // Only fetch if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      // Small delay so it feels like a natural popup after loading the dashboard
      timerId = setTimeout(fetchAnnouncement, 1000);
    }

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  const handleClose = () => {
    if (announcement) {
      localStorage.setItem(`announcement_read_${announcement.id}`, 'true');
    }
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && announcement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div 
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: -20, opacity: 0 }}
            className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 max-w-lg w-full z-10 border border-slate-100 dark:border-white/10 overflow-hidden"
          >
            {/* Top Decoration */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-3xl shadow-inner border border-blue-100 dark:border-blue-500/20">
                📢
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none">
                  {announcement.title || "Comunicado Importante"}
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Notificação do Sistema</p>
              </div>
            </div>
            
            {announcement.image_url && (
              <div className="mb-6 rounded-2xl overflow-hidden border border-slate-100 dark:border-white/10 shadow-md max-h-[300px] flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <img 
                  src={getStaticUrl(announcement.image_url)} 
                  className="w-full h-full object-contain max-h-[300px] cursor-zoom-in hover:scale-[1.01] transition-transform" 
                  onClick={() => setIsZoomed(true)}
                  alt="Comunicado" 
                  title="Clique para ampliar"
                />
              </div>
            )}
            
            <div className="text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-white/5 font-medium whitespace-pre-line">
              {announcement.message}
            </div>
            
            <div className="mt-8">
              <button 
                onClick={handleClose}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 active:scale-95"
              >
                Ciente, Fechar Aviso
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Lightbox para zoom do Card */}
      <AnimatePresence>
        {isZoomed && announcement && announcement.image_url && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 cursor-zoom-out"
              onClick={() => setIsZoomed(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-[95vw] max-h-[90vh] z-10 flex flex-col items-center select-none"
            >
              <img 
                src={getStaticUrl(announcement.image_url)} 
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl cursor-zoom-out border border-white/10"
                onClick={() => setIsZoomed(false)}
                alt="Card Ampliado" 
              />
              <button 
                onClick={() => setIsZoomed(false)}
                className="mt-6 px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-white/10 active:scale-95 shadow-2xl"
              >
                Fechar Visualização
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
