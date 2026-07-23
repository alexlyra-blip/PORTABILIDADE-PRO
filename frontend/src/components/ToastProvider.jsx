"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast deve ser usado dentro de um ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 150);
  }, []);

  const addToast = useCallback((type, message, title = "") => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const duration = type === "error" ? 7000 : 5000;

    setToasts((prev) => {
      const activeToasts = prev.filter((t) => !t.isExiting);
      const newToasts = [
        ...prev,
        { id, type, message, title, duration, isExiting: false }
      ];
      if (activeToasts.length >= 4) {
        const oldestActive = activeToasts[0];
        return newToasts.map((t) =>
          t.id === oldestActive.id ? { ...t, isExiting: true } : t
        );
      }
      return newToasts;
    });

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const toast = {
    success: (msg, title) => addToast("success", msg, title),
    error: (msg, title) => addToast("error", msg, title),
    warning: (msg, title) => addToast("warning", msg, title),
    info: (msg, title) => addToast("info", msg, title),
  };

  const getIcon = (type) => {
    switch (type) {
      case "success":
        return (
          <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        );
      case "error":
        return (
          <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case "warning":
        return (
          <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case "info":
      default:
        return (
          <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getTypeClasses = (type) => {
    switch (type) {
      case "success":
        return {
          bg: "bg-white/95 dark:bg-slate-900/95 border-emerald-500/30 text-slate-800 dark:text-slate-100",
          progress: "bg-emerald-500 dark:bg-emerald-400",
        };
      case "error":
        return {
          bg: "bg-white/95 dark:bg-slate-900/95 border-red-500/30 text-slate-800 dark:text-slate-100",
          progress: "bg-red-500 dark:bg-red-400",
        };
      case "warning":
        return {
          bg: "bg-white/95 dark:bg-slate-900/95 border-amber-500/30 text-slate-800 dark:text-slate-100",
          progress: "bg-amber-500 dark:bg-amber-400",
        };
      case "info":
      default:
        return {
          bg: "bg-white/95 dark:bg-slate-900/95 border-blue-500/30 text-slate-800 dark:text-slate-100",
          progress: "bg-blue-500 dark:bg-blue-400",
        };
    }
  };

  return (
    <ToastContext.Provider
      value={{
        ...toast,
        toast,
      }}
    >
      {children}

      <style>{`
        @keyframes toast-shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        @keyframes toast-fade-in {
          from { opacity: 0; transform: translateY(-12px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toast-fade-out {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.9); }
        }
        .animate-toast-in {
          animation: toast-fade-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-toast-out {
          animation: toast-fade-out 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div
        aria-live="assertive"
        className="fixed top-4 right-4 z-[999999] flex flex-col gap-3 w-full max-w-[400px] pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => {
          const { bg, progress } = getTypeClasses(t.type);
          return (
            <div
              key={t.id}
              className={`pointer-events-auto w-full rounded-2xl border shadow-xl backdrop-blur-md overflow-hidden flex flex-col relative ${bg} ${
                t.isExiting ? "animate-toast-out" : "animate-toast-in"
              }`}
            >
              <div className="flex p-4 items-start gap-3">
                {getIcon(t.type)}
                <div className="flex-1 min-w-0">
                  {t.title && (
                    <p className="text-xs font-black uppercase tracking-wider mb-0.5 text-slate-500 dark:text-slate-400">
                      {t.title}
                    </p>
                  )}
                  <p className="text-xs font-bold leading-relaxed">{t.message}</p>
                </div>
                <button
                  onClick={() => removeToast(t.id)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg p-0.5"
                  aria-label="Fechar notificação"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div
                className={`h-1 w-full ${progress}`}
                style={{
                  animation: `toast-shrink ${t.duration}ms linear forwards`
                }}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
