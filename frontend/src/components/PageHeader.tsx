"use client";

import { useEffect, useState } from "react";

export default function PageHeader({ title, highlight, subtitle, children }) {
  const [userColor, setUserColor] = useState('#1e3a8a'); // blue-900 as fallback
  const [userColorSec, setUserColorSec] = useState('#312e81'); // indigo-900 as fallback
  const [brandColor, setBrandColor] = useState('#3b82f6'); // blue-500 as fallback
  const [highlightColor, setHighlightColor] = useState('#3b82f6'); // fallback

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.brand_color) {
          setBrandColor(user.brand_color);
        }
        if (user.highlight_color) {
          setHighlightColor(user.highlight_color);
        } else if (user.sidebar_color_secondary) {
          setHighlightColor(user.sidebar_color_secondary);
        } else if (user.brand_color) {
          setHighlightColor(user.brand_color);
        }
        
        if (user.sidebar_color) {
          setUserColor(user.sidebar_color);
          setUserColorSec(user.sidebar_color_secondary || '#0f172a'); 
        } else if (user.brand_color) {
          setUserColor(user.brand_color);
          setUserColorSec('#0f172a');
        }
      } catch (e) {}
    }
  }, []);

  return (
    <div 
      className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden mb-8"
      style={{
        background: `linear-gradient(135deg, ${userColor} 0%, ${userColorSec} 100%)`
      }}
    >
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      
      <div className="relative z-10">
        <h1 className="text-3xl font-black text-white tracking-tight uppercase mb-1">
          {title} {highlight && <span style={{ color: highlightColor }}>{highlight}</span>}
        </h1>
        {subtitle && (
          <p className="text-white/70 font-bold text-[10px] uppercase tracking-widest mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {children && (
        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {children}
        </div>
      )}
    </div>
  );
}
