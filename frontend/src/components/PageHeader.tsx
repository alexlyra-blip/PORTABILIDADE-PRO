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
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 pb-6 border-b border-slate-100 dark:border-slate-800/50 brand-themed w-full max-w-[98%] mx-auto">
      <div className="space-y-2">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-sm uppercase">
          {title} {highlight && <span style={{ color: brandColor }}>{highlight}</span>}
        </h1>
        {subtitle && (
          <p className="text-slate-500 dark:text-slate-400 font-bold italic text-sm uppercase tracking-[0.3em]">
            {subtitle}
          </p>
        )}
      </div>

      {children && (
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto md:justify-end">
          {children}
        </div>
      )}
    </div>
  );
}
