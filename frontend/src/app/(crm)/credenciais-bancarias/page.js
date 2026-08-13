"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/utils/api";

const PROVIDERS = [
  {
    id: "PRESENCA",
    name: "Presença Bank",
    subtitle: "Consulta e simulação CLT",
    description:
      "Utilize suas próprias credenciais do Presença Bank para realizar consultas pelo Portabilidade PRO.",
    accent: "from-blue-600 to-cyan-500",
    extraField: null,
  },
  {
    id: "LOTUS",
    name: "Lotus+",
    subtitle: "Crédito Privado CLT",
    description:
      "Conecte sua conta Lotus para consultar análise de crédito, limite e ofertas diretamente no CLT Multibancos.",
    accent: "from-violet-600 to-fuchsia-500",
    extraField: null,
  },
  {
    id: "FINTECH_CORBAN",
    name: "Fintech do Corban",
    subtitle: "Consulta CLT via Celcoin e QI",
    description:
      "Cadastre uma única credencial para utilizar os fluxos Celcoin e QI disponibilizados pela Fintech do Corban.",
    accent: "from-emerald-600 to-cyan-500",
    extraField: null,
  },
];

const Icon = {
  Shield: ({ className = "w-6 h-6" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),

  Key: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15 7 2 2" />
      <path d="m18 4 2 2" />
    </svg>
  ),

  Eye: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),

  EyeOff: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="m3 3 18 18" />
      <path d="M10.6 10.6A2 2 0 0 0 13.4 13.4" />
      <path d="M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-2 3.1" />
      <path d="M6.6 6.6C3.5 8.7 2 12 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.4-1.6" />
    </svg>
  ),

  Check: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  ),

  Trash: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  ),

  Refresh: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 7h-5V2" />
      <path d="M20 7a8 8 0 1 0 1.5 8" />
    </svg>
  ),

  Lock: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  ),
};

function emptyForm() {
  return {
    login: "",
    password: "",
    subscription: "",
  };
}

export default function CredenciaisBancariasPage() {
  const [credentials, setCredentials] = useState([]);
  const [forms, setForms] = useState({});
  const [showPassword, setShowPassword] = useState({});
  const [editing, setEditing] = useState({});
  const [saving, setSaving] = useState({});
  const [deleting, setDeleting] = useState({});
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [message, setMessage] = useState(null);

  const credentialMap = useMemo(() => {
    const map = {};
    for (const item of credentials) {
      map[item.provider] = item;
    }
    return map;
  }, [credentials]);

  const loadCredentials = async () => {
    setLoading(true);
    setPageError("");

    try {
      const data = await api.get("/bank-credentials");
      setCredentials(Array.isArray(data) ? data : data ? [data] : []);
    } catch (error) {
      setPageError(
        error?.message ||
          "Não foi possível carregar as credenciais bancárias."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  const getForm = (provider) => {
    return forms[provider] || emptyForm();
  };

  const updateForm = (provider, field, value) => {
    setForms((current) => ({
      ...current,
      [provider]: {
        ...(current[provider] || emptyForm()),
        [field]: value,
      },
    }));
  };

  const openEditor = (provider) => {
    setEditing((current) => ({
      ...current,
      [provider]: true,
    }));

    setMessage(null);
  };

  const closeEditor = (provider) => {
    setEditing((current) => ({
      ...current,
      [provider]: false,
    }));

    setForms((current) => ({
      ...current,
      [provider]: emptyForm(),
    }));

    setShowPassword((current) => ({
      ...current,
      [provider]: false,
    }));
  };

  const saveCredential = async (providerConfig) => {
    const provider = providerConfig.id;
    const currentCredential = credentialMap[provider];
    const form = getForm(provider);

    if (!currentCredential?.configured) {
      if (!form.login.trim()) {
        setMessage({
          type: "error",
          text: `Informe o usuário/login para ${providerConfig.name}.`,
        });
        return;
      }

      if (!form.password.trim()) {
        setMessage({
          type: "error",
          text: `Informe a senha para ${providerConfig.name}.`,
        });
        return;
      }
    }

    setSaving((current) => ({
      ...current,
      [provider]: true,
    }));

    setMessage(null);

    try {
      const extra =
        providerConfig.extraField && form.subscription.trim()
          ? {
              [providerConfig.extraField.key]: form.subscription.trim(),
            }
          : null;

      const payload = {
        provider,
        login: form.login.trim() || null,
        password: form.password || null,
        extra_credentials: extra,
        is_active: true,
      };

      await api.put(`/bank-credentials/${provider}`, payload);

      await loadCredentials();

      closeEditor(provider);

      setMessage({
        type: "success",
        text: `${providerConfig.name} configurado com segurança.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error?.message ||
          `Não foi possível salvar as credenciais de ${providerConfig.name}.`,
      });
    } finally {
      setSaving((current) => ({
        ...current,
        [provider]: false,
      }));
    }
  };

  const removeCredential = async (providerConfig) => {
    const provider = providerConfig.id;

    const confirmed = window.confirm(
      `Deseja remover as credenciais de ${providerConfig.name}?`
    );

    if (!confirmed) return;

    setDeleting((current) => ({
      ...current,
      [provider]: true,
    }));

    setMessage(null);

    try {
      await api.delete(`/bank-credentials/${provider}`);

      await loadCredentials();

      closeEditor(provider);

      setMessage({
        type: "success",
        text: `Credenciais de ${providerConfig.name} removidas.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error?.message ||
          `Não foi possível remover as credenciais de ${providerConfig.name}.`,
      });
    } finally {
      setDeleting((current) => ({
        ...current,
        [provider]: false,
      }));
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-6 py-8 text-white md:px-9 md:py-10">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-blue-200">
                <Icon.Shield className="h-4 w-4" />
                Cofre Bancário
              </div>

              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                Minhas Credenciais Bancárias
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-300 md:text-base">
                Conecte suas contas bancárias ao Portabilidade PRO para que
                cada consulta CLT utilize suas próprias credenciais.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-emerald-400/10 p-2 text-emerald-300">
                  <Icon.Lock />
                </div>

                <div>
                  <p className="text-sm font-black text-white">
                    Proteção criptografada
                  </p>
                  <p className="mt-1 max-w-sm text-xs leading-5 text-slate-300">
                    Senhas não são exibidas novamente e permanecem
                    criptografadas no servidor.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02] md:px-9">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>✓ Credenciais vinculadas ao seu usuário</span>
            <span>✓ Senha nunca retornada pelo frontend</span>
            <span>✓ Você pode atualizar ou remover quando desejar</span>
          </div>
        </div>
      </section>

      {message && (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm font-bold ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {pageError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {pageError}
        </div>
      )}

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2">
          {PROVIDERS.map((provider) => (
            <div
              key={provider.id}
              className="h-72 animate-pulse rounded-[26px] border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {PROVIDERS.map((provider) => {
            const credential = credentialMap[provider.id];
            const configured = Boolean(credential?.configured);
            const isEditing = Boolean(editing[provider.id]);
            const form = getForm(provider.id);

            return (
              <section
                key={provider.id}
                className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-slate-900"
              >
                <div
                  className={`h-1.5 bg-gradient-to-r ${provider.accent}`}
                />

                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${provider.accent} text-white shadow-lg`}
                        >
                          <Icon.Key />
                        </div>

                        <div>
                          <h2 className="text-lg font-black text-slate-900 dark:text-white">
                            {provider.name}
                          </h2>

                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            {provider.subtitle}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wider ${
                        configured
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          configured ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />

                      {configured ? "Configurado" : "Não configurado"}
                    </div>
                  </div>

                  <p className="mt-5 min-h-[48px] text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {provider.description}
                  </p>

                  {configured && !isEditing && (
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/[0.04]">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Usuário/Login
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-sm font-black text-emerald-600 dark:text-emerald-300">
                          <Icon.Check className="h-4 w-4" />
                          {credential.has_login
                            ? "Configurado"
                            : "Não informado"}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/[0.04]">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Senha
                        </p>
                        <div className="mt-2 flex items-center gap-2 text-sm font-black text-emerald-600 dark:text-emerald-300">
                          <Icon.Check className="h-4 w-4" />
                          {credential.has_password
                            ? "Protegida"
                            : "Não informada"}
                        </div>
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                      {configured && (
                        <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs font-semibold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
                          Deixe um campo vazio para manter o valor já
                          armazenado.
                        </div>
                      )}

                      <div>
                        <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Usuário / E-mail
                        </label>
                        <input
                          type="text"
                          autoComplete="off"
                          value={form.login}
                          onChange={(event) =>
                            updateForm(
                              provider.id,
                              "login",
                              event.target.value
                            )
                          }
                          placeholder={
                            configured
                              ? "Digite apenas para alterar"
                              : "Informe seu usuário ou e-mail"
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-500/10"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Senha
                        </label>

                        <div className="relative">
                          <input
                            type={
                              showPassword[provider.id]
                                ? "text"
                                : "password"
                            }
                            autoComplete="new-password"
                            value={form.password}
                            onChange={(event) =>
                              updateForm(
                                provider.id,
                                "password",
                                event.target.value
                              )
                            }
                            placeholder={
                              configured
                                ? "Digite apenas para alterar"
                                : "Informe sua senha"
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-500/10"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword((current) => ({
                                ...current,
                                [provider.id]:
                                  !current[provider.id],
                              }))
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                            aria-label="Mostrar ou ocultar senha"
                          >
                            {showPassword[provider.id] ? (
                              <Icon.EyeOff />
                            ) : (
                              <Icon.Eye />
                            )}
                          </button>
                        </div>
                      </div>

                      {provider.extraField && (
                        <div>
                          <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {provider.extraField.label}
                          </label>
                          <input
                            type="password"
                            autoComplete="off"
                            value={form.subscription}
                            onChange={(event) =>
                              updateForm(
                                provider.id,
                                "subscription",
                                event.target.value
                              )
                            }
                            placeholder={
                              configured
                                ? "Digite apenas para alterar"
                                : provider.extraField.placeholder
                            }
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:ring-blue-500/10"
                          />
                        </div>
                      )}

                      <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                        <button
                          type="button"
                          disabled={saving[provider.id]}
                          onClick={() => saveCredential(provider)}
                          className={`flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${provider.accent} px-4 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60`}
                        >
                          {saving[provider.id] ? (
                            <Icon.Refresh className="h-4 w-4 animate-spin" />
                          ) : (
                            <Icon.Check className="h-4 w-4" />
                          )}

                          {saving[provider.id]
                            ? "Salvando..."
                            : "Salvar com segurança"}
                        </button>

                        <button
                          type="button"
                          onClick={() => closeEditor(provider.id)}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {!isEditing && (
                    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => openEditor(provider.id)}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${provider.accent} px-4 py-3 text-sm font-black text-white shadow-lg transition hover:brightness-110`}
                      >
                        <Icon.Key className="h-4 w-4" />
                        {configured
                          ? "Atualizar credenciais"
                          : "Configurar credenciais"}
                      </button>

                      {configured && (
                        <button
                          type="button"
                          disabled={deleting[provider.id]}
                          onClick={() => removeCredential(provider)}
                          className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                        >
                          <Icon.Trash className="h-4 w-4" />
                          {deleting[provider.id]
                            ? "Removendo..."
                            : "Remover"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
            <Icon.Shield />
          </div>

          <div>
            <h3 className="font-black text-slate-900 dark:text-white">
              Como suas credenciais serão utilizadas?
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Quando conectarmos esta área ao motor CLT, o Portabilidade PRO
              utilizará primeiro as credenciais vinculadas ao seu usuário.
              Nenhuma senha será exibida novamente na tela.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}