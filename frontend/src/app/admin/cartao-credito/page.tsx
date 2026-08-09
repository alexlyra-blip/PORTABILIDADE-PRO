"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api } from "@/utils/api";


type ViewMode =
  | "dashboard"
  | "new-sale"
  | "sales";


type Sale = {
  id: number;
  created_by_user_id: number;
  customer_name: string;
  customer_cpf: string;
  customer_phone: string;
  customer_email?: string | null;
  description: string;
  amount: number;
  installments: number;
  status: string;
  payment_id?: number | null;

  documents_received: number;
  documents_total: number;

  document_front: boolean;
  document_back: boolean;
  selfie: boolean;

  documentation_completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};


type DocumentType =
  | "document_front"
  | "document_back"
  | "selfie";


const EMPTY_FORM = {
  customer_name: "",
  customer_cpf: "",
  customer_phone: "",
  customer_email: "",
  description: "",
  amount: "",
  installments: "1",
};


function formatMoney(value: number) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(value || 0);
}


function maskCPF(value: string) {
  const digits = value
    .replace(/\D/g, "")
    .slice(0, 11);

  return digits
    .replace(
      /^(\d{3})(\d)/,
      "$1.$2"
    )
    .replace(
      /^(\d{3})\.(\d{3})(\d)/,
      "$1.$2.$3"
    )
    .replace(
      /(\d{3})(\d{1,2})$/,
      "$1-$2"
    );
}


function maskPhone(value: string) {
  const digits = value
    .replace(/\D/g, "")
    .slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(
        /^(\d{2})(\d)/,
        "($1) $2"
      )
      .replace(
        /(\d{4})(\d)/,
        "$1-$2"
      );
  }

  return digits
    .replace(
      /^(\d{2})(\d)/,
      "($1) $2"
    )
    .replace(
      /(\d{5})(\d)/,
      "$1-$2"
    );
}


function parseAmount(value: string) {
  let normalized = value
    .trim()
    .replace(/[R$\s]/g, "");

  if (normalized.includes(",")) {
    normalized = normalized
      .replace(/\./g, "")
      .replace(",", ".");
  }

  return Number(normalized);
}


function statusLabel(status: string) {
  switch (status) {
    case "documentation_complete":
      return "Documentação completa";

    case "documentation_pending":
      return "Aguardando documentação";

    default:
      return status
        .replaceAll("_", " ");
  }
}


export default function CreditCardPage() {
  const [allowed, setAllowed] =
    useState<boolean | null>(null);

  const [userRole, setUserRole] =
    useState("");

  const [view, setView] =
    useState<ViewMode>("dashboard");

  const [sales, setSales] =
    useState<Sale[]>([]);

  const [activeSale, setActiveSale] =
    useState<Sale | null>(null);

  const [loadingSales, setLoadingSales] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [uploading, setUploading] =
    useState<DocumentType | null>(null);

  const [storageReady, setStorageReady] =
    useState<boolean | null>(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [form, setForm] =
    useState(EMPTY_FORM);


  const loadSales = useCallback(
    async () => {
      setLoadingSales(true);

      try {
        const response =
          await api.get(
            "/card-sales/"
          );

        setSales(
          Array.isArray(response?.sales)
            ? response.sales
            : []
        );
      } catch (err) {
        console.error(
          "Erro ao carregar vendas:",
          err
        );
      } finally {
        setLoadingSales(false);
      }
    },
    []
  );


  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const response =
          await api.get(
            "/card-sales/access"
          );

        if (cancelled) {
          return;
        }

        setAllowed(true);

        setUserRole(
          response?.role || ""
        );

        try {
          await api.get(
            "/card-sales/storage-check"
          );

          if (!cancelled) {
            setStorageReady(true);
          }
        } catch {
          if (!cancelled) {
            setStorageReady(false);
          }
        }
      } catch {
        if (!cancelled) {
          setAllowed(false);
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);


  useEffect(() => {
    if (allowed) {
      loadSales();
    }
  }, [
    allowed,
    loadSales,
  ]);


  const completedSales =
    useMemo(
      () =>
        sales.filter(
          (sale) =>
            sale.status ===
            "documentation_complete"
        ).length,
      [sales]
    );


  const pendingSales =
    useMemo(
      () =>
        sales.filter(
          (sale) =>
            sale.status ===
            "documentation_pending"
        ).length,
      [sales]
    );


  const resetMessages = () => {
    setError("");
    setSuccess("");
  };


  const handleCreateSale =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      resetMessages();

      const amount =
        parseAmount(form.amount);

      if (
        !Number.isFinite(amount)
        || amount <= 0
      ) {
        setError(
          "Informe um valor válido para a venda."
        );
        return;
      }

      setCreating(true);

      try {
        const response =
          await api.post(
            "/card-sales/",
            {
              customer_name:
                form.customer_name,

              customer_cpf:
                form.customer_cpf,

              customer_phone:
                form.customer_phone,

              customer_email:
                form.customer_email
                  .trim()
                  || null,

              description:
                form.description,

              amount,

              installments:
                Number(
                  form.installments
                ),
            }
          );

        const sale =
          response?.sale as Sale;

        if (!sale?.id) {
          throw new Error(
            "Venda criada sem identificador."
          );
        }

        setActiveSale(sale);

        setSuccess(
          `Venda #${sale.id} criada. Agora envie a documentação do cliente.`
        );

        await loadSales();

      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível criar a venda."
        );
      } finally {
        setCreating(false);
      }
    };


  const openSale =
    async (saleId: number) => {
      resetMessages();

      try {
        const response =
          await api.get(
            `/card-sales/${saleId}`
          );

        if (response?.sale) {
          setActiveSale(
            response.sale
          );

          setView(
            "new-sale"
          );
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível abrir a venda."
        );
      }
    };


  const uploadDocument =
    async (
      type: DocumentType,
      event: ChangeEvent<HTMLInputElement>
    ) => {
      const input =
        event.currentTarget;

      const file =
        input.files?.[0];

      if (
        !file
        || !activeSale
      ) {
        return;
      }

      resetMessages();

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      if (
        !allowedTypes.includes(
          file.type
        )
      ) {
        setError(
          "Envie uma imagem JPG, PNG ou WEBP."
        );

        input.value = "";
        return;
      }

      if (
        file.size >
        5 * 1024 * 1024
      ) {
        setError(
          "O arquivo deve possuir no máximo 5 MB."
        );

        input.value = "";
        return;
      }

      setUploading(type);

      try {
        const data =
          new FormData();

        data.append(
          "file",
          file
        );

        const response =
          await api.upload(
            `/card-sales/${activeSale.id}/documents/${type}`,
            data
          );

        if (response?.sale) {
          setActiveSale(
            response.sale
          );
        }

        setSuccess(
          response?.sale
            ?.status ===
            "documentation_complete"
            ? "Documentação completa. Os três documentos foram recebidos."
            : "Documento enviado com sucesso."
        );

        await loadSales();

      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível enviar o documento."
        );
      } finally {
        setUploading(null);
        input.value = "";
      }
    };


  const startNewSale = () => {
    resetMessages();

    setForm(
      EMPTY_FORM
    );

    setActiveSale(null);

    setView(
      "new-sale"
    );
  };


  if (allowed === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600" />

          <p className="mt-4 text-sm font-bold text-slate-500">
            Validando acesso seguro...
          </p>
        </div>
      </div>
    );
  }


  if (!allowed) {
    return (
      <div className="p-6 md:p-10">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-red-100 bg-white p-8 text-center shadow-xl">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-3xl">
            🔒
          </div>

          <h1 className="mt-5 text-2xl font-black text-slate-900">
            Acesso não autorizado
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            O módulo Cartão de Crédito ainda não foi habilitado para seu usuário.
          </p>

          <Link
            href="/simulador"
            className="mt-6 inline-flex rounded-xl bg-slate-900 px-6 py-3 text-sm font-black text-white"
          >
            Voltar ao Simulador
          </Link>
        </div>
      </div>
    );
  }


  const documentsReceived =
    activeSale?.documents_received || 0;

  const progress =
    Math.min(
      100,
      Math.round(
        (documentsReceived / 3)
        * 100
      )
    );


  return (
    <div className="space-y-7 p-4 pb-28 md:p-8 lg:p-10">

      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950 p-7 text-white shadow-2xl md:p-10">

        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="absolute -bottom-24 left-32 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">

          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-3xl shadow-xl backdrop-blur">
              💳
            </div>

            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">
              Portabilidade PRO
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              CARTÃO DE CRÉDITO
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Propostas, documentação e acompanhamento das vendas em um único ambiente seguro.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">

            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-300">
              ✓ ACESSO AUTORIZADO
            </span>

            <span
              className={`rounded-full border px-4 py-2 text-xs font-black ${
                storageReady
                  ? "border-sky-400/20 bg-sky-400/10 text-sky-300"
                  : "border-amber-400/20 bg-amber-400/10 text-amber-300"
              }`}
            >
              {storageReady
                ? "✓ STORAGE PRIVADO"
                : "● STORAGE PENDENTE"}
            </span>

            {userRole && (
              <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black">
                {userRole.toUpperCase()}
              </span>
            )}

          </div>
        </div>
      </section>


      <nav className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">

        <button
          onClick={() =>
            setView("dashboard")
          }
          className={`rounded-xl px-5 py-3 text-sm font-black transition ${
            view === "dashboard"
              ? "bg-slate-950 text-white shadow-lg"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          Visão Geral
        </button>

        <button
          onClick={startNewSale}
          className={`rounded-xl px-5 py-3 text-sm font-black transition ${
            view === "new-sale"
              ? "bg-violet-600 text-white shadow-lg"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          + Nova Venda
        </button>

        <button
          onClick={() =>
            setView("sales")
          }
          className={`rounded-xl px-5 py-3 text-sm font-black transition ${
            view === "sales"
              ? "bg-blue-600 text-white shadow-lg"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          {userRole === "admin"
            ? "Todas as Vendas"
            : "Minhas Vendas"}
        </button>

        <Link
          href="/calculadora-taxas"
          className="rounded-xl px-5 py-3 text-sm font-black text-slate-500 transition hover:bg-slate-50"
        >
          🧮 Calculadora
        </Link>

      </nav>


      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}


      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
          {success}
        </div>
      )}


      {view === "dashboard" && (
        <>

          <section className="grid gap-4 md:grid-cols-3">

            <MetricCard
              label={
                userRole === "admin"
                  ? "Vendas cadastradas"
                  : "Minhas vendas"
              }
              value={sales.length}
              icon="💳"
            />

            <MetricCard
              label="Documentação completa"
              value={completedSales}
              icon="✅"
            />

            <MetricCard
              label="Aguardando documentos"
              value={pendingSales}
              icon="🪪"
            />

          </section>


          <section className="grid gap-5 lg:grid-cols-3">

            <button
              onClick={startNewSale}
              className="group rounded-[2rem] border border-violet-100 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-violet-100 text-2xl">
                ➕
              </div>

              <h2 className="mt-5 text-xl font-black text-slate-950">
                Nova Venda
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Cadastre o cliente e inicie o fluxo seguro de documentação.
              </p>

              <div className="mt-6 text-xs font-black uppercase tracking-wider text-violet-600">
                Criar proposta →
              </div>
            </button>


            <Link
              href="/calculadora-taxas"
              className="group rounded-[2rem] border border-blue-100 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
                🧮
              </div>

              <h2 className="mt-5 text-xl font-black text-slate-950">
                Calculadora
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Calcule o valor a cobrar ou o valor líquido da operação.
              </p>

              <div className="mt-6 text-xs font-black uppercase tracking-wider text-blue-600">
                Abrir calculadora →
              </div>
            </Link>


            <button
              onClick={() =>
                setView("sales")
              }
              className="group rounded-[2rem] border border-sky-100 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-sky-100 text-2xl">
                💼
              </div>

              <h2 className="mt-5 text-xl font-black text-slate-950">
                {userRole === "admin"
                  ? "Todas as Vendas"
                  : "Minhas Vendas"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Acompanhe documentação, assinatura e situação das propostas.
              </p>

              <div className="mt-6 text-xs font-black uppercase tracking-wider text-sky-600">
                Acompanhar vendas →
              </div>
            </button>

          </section>


          <section className="rounded-[2rem] border border-blue-100 bg-blue-50/60 p-6">
            <div className="flex gap-4">
              <div className="text-2xl">
                🛡️
              </div>

              <div>
                <h3 className="font-black text-slate-900">
                  Venda protegida
                </h3>

                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                  O link de pagamento ainda não é criado nesta etapa. Primeiro coletamos identificação, frente e verso do documento e selfie de confirmação. Na próxima fase entra o termo com assinatura eletrônica do cliente.
                </p>
              </div>
            </div>
          </section>

        </>
      )}


      {view === "new-sale" && (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">

            <div className="flex items-start justify-between gap-4">

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-600">
                  Etapa 1
                </p>

                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Dados da Venda
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Cadastre os dados antes de solicitar os documentos.
                </p>
              </div>

              {activeSale && (
                <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
                  #{activeSale.id}
                </span>
              )}

            </div>


            {!activeSale ? (

              <form
                onSubmit={handleCreateSale}
                className="mt-7 space-y-5"
              >

                <Field
                  label="Nome do cliente"
                  required
                >
                  <input
                    value={form.customer_name}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        customer_name:
                          event.target.value,
                      })
                    }
                    required
                    minLength={2}
                    maxLength={150}
                    placeholder="Nome completo"
                    className={inputClass}
                  />
                </Field>


                <div className="grid gap-4 md:grid-cols-2">

                  <Field
                    label="CPF"
                    required
                  >
                    <input
                      value={form.customer_cpf}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          customer_cpf:
                            maskCPF(
                              event.target.value
                            ),
                        })
                      }
                      required
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      className={inputClass}
                    />
                  </Field>


                  <Field
                    label="WhatsApp"
                    required
                  >
                    <input
                      value={form.customer_phone}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          customer_phone:
                            maskPhone(
                              event.target.value
                            ),
                        })
                      }
                      required
                      inputMode="tel"
                      placeholder="(81) 99999-9999"
                      className={inputClass}
                    />
                  </Field>

                </div>


                <Field label="E-mail">
                  <input
                    value={form.customer_email}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        customer_email:
                          event.target.value,
                      })
                    }
                    type="email"
                    placeholder="cliente@email.com"
                    className={inputClass}
                  />
                </Field>


                <Field
                  label="Descrição da venda"
                  required
                >
                  <input
                    value={form.description}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        description:
                          event.target.value,
                      })
                    }
                    required
                    maxLength={250}
                    placeholder="Ex.: Venda de produto / serviço"
                    className={inputClass}
                  />
                </Field>


                <div className="grid gap-4 md:grid-cols-2">

                  <Field
                    label="Valor"
                    required
                  >
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                        R$
                      </span>

                      <input
                        value={form.amount}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            amount:
                              event.target.value,
                          })
                        }
                        required
                        inputMode="decimal"
                        placeholder="1.500,00"
                        className={`${inputClass} pl-12`}
                      />
                    </div>
                  </Field>


                  <Field
                    label="Parcelas"
                    required
                  >
                    <select
                      value={form.installments}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          installments:
                            event.target.value,
                        })
                      }
                      className={inputClass}
                    >
                      {Array.from(
                        { length: 18 },
                        (_, index) =>
                          index + 1
                      ).map(
                        (installment) => (
                          <option
                            key={installment}
                            value={installment}
                          >
                            {installment}x
                          </option>
                        )
                      )}
                    </select>
                  </Field>

                </div>


                <button
                  disabled={creating}
                  className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-6 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating
                    ? "Criando venda..."
                    : "Criar Venda Segura →"}
                </button>

              </form>

            ) : (

              <div className="mt-7 space-y-4">

                <InfoRow
                  label="Cliente"
                  value={activeSale.customer_name}
                />

                <InfoRow
                  label="CPF"
                  value={maskCPF(activeSale.customer_cpf)}
                />

                <InfoRow
                  label="WhatsApp"
                  value={maskPhone(activeSale.customer_phone)}
                />

                <InfoRow
                  label="Descrição"
                  value={activeSale.description}
                />

                <InfoRow
                  label="Valor"
                  value={formatMoney(activeSale.amount)}
                />

                <InfoRow
                  label="Parcelamento"
                  value={`${activeSale.installments}x`}
                />

                <button
                  onClick={startNewSale}
                  className="mt-4 w-full rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50"
                >
                  + Criar outra venda
                </button>

              </div>

            )}

          </div>


          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">

            <div className="flex items-start justify-between gap-4">

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-600">
                  Etapa 2
                </p>

                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Documentação
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Frente, verso e selfie de confirmação.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-white">
                <div className="text-xl font-black">
                  {documentsReceived}/3
                </div>
                <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  recebidos
                </div>
              </div>

            </div>


            <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 via-blue-600 to-emerald-500 transition-all duration-500"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>


            {!activeSale ? (

              <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">

                <div className="text-4xl">
                  🪪
                </div>

                <h3 className="mt-4 font-black text-slate-900">
                  Crie a venda primeiro
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Após salvar os dados do cliente, os campos de documentação serão liberados.
                </p>

              </div>

            ) : (

              <div className="mt-7 space-y-4">

                <DocumentUpload
                  title="Frente do documento"
                  description="RG ou CIN — lado da frente"
                  icon="🪪"
                  complete={activeSale.document_front}
                  loading={
                    uploading ===
                    "document_front"
                  }
                  capture="environment"
                  onChange={(event) =>
                    uploadDocument(
                      "document_front",
                      event
                    )
                  }
                />


                <DocumentUpload
                  title="Verso do documento"
                  description="RG ou CIN — lado do verso"
                  icon="📄"
                  complete={activeSale.document_back}
                  loading={
                    uploading ===
                    "document_back"
                  }
                  capture="environment"
                  onChange={(event) =>
                    uploadDocument(
                      "document_back",
                      event
                    )
                  }
                />


                <DocumentUpload
                  title="Selfie de confirmação"
                  description="Foto atual do cliente para confirmação"
                  icon="🤳"
                  complete={activeSale.selfie}
                  loading={
                    uploading ===
                    "selfie"
                  }
                  capture="user"
                  onChange={(event) =>
                    uploadDocument(
                      "selfie",
                      event
                    )
                  }
                />


                {activeSale.status ===
                "documentation_complete" ? (

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">

                    <div className="flex gap-3">
                      <div className="text-2xl">
                        ✅
                      </div>

                      <div>
                        <h3 className="font-black text-emerald-900">
                          Documentação completa
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-emerald-700">
                          Os três documentos foram armazenados. A próxima etapa será gerar o termo e coletar a assinatura eletrônica do cliente.
                        </p>
                      </div>
                    </div>

                  </div>

                ) : (

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">

                    <div className="flex gap-3">
                      <div className="text-2xl">
                        🔒
                      </div>

                      <div>
                        <h3 className="font-black text-amber-900">
                          Pagamento bloqueado
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-amber-700">
                          Complete os três documentos para avançar no fluxo de segurança.
                        </p>
                      </div>
                    </div>

                  </div>

                )}

              </div>

            )}

          </div>

        </section>
      )}


      {view === "sales" && (

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-600">
                Acompanhamento
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {userRole === "admin"
                  ? "Todas as Vendas"
                  : "Minhas Vendas"}
              </h2>
            </div>

            <button
              onClick={loadSales}
              disabled={loadingSales}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
            >
              {loadingSales
                ? "Atualizando..."
                : "↻ Atualizar"}
            </button>

          </div>


          {sales.length === 0 ? (

            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">

              <div className="text-4xl">
                💳
              </div>

              <h3 className="mt-4 font-black text-slate-900">
                Nenhuma venda cadastrada
              </h3>

              <button
                onClick={startNewSale}
                className="mt-5 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white"
              >
                Criar primeira venda
              </button>

            </div>

          ) : (

            <div className="mt-7 grid gap-4">

              {sales.map(
                (sale) => (

                  <button
                    key={sale.id}
                    onClick={() =>
                      openSale(sale.id)
                    }
                    className="grid gap-4 rounded-2xl border border-slate-200 p-5 text-left transition hover:border-blue-200 hover:bg-blue-50/30 md:grid-cols-[1.3fr_0.8fr_0.7fr_auto] md:items-center"
                  >

                    <div>
                      <div className="text-xs font-black text-violet-600">
                        VENDA #{sale.id}
                      </div>

                      <div className="mt-1 font-black text-slate-950">
                        {sale.customer_name}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {sale.description}
                      </div>
                    </div>


                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Valor
                      </div>

                      <div className="mt-1 font-black text-slate-900">
                        {formatMoney(
                          sale.amount
                        )}
                      </div>
                    </div>


                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Documentos
                      </div>

                      <div className="mt-1 font-black text-slate-900">
                        {sale.documents_received}/3
                      </div>
                    </div>


                    <div className="md:text-right">
                      <span
                        className={`inline-flex rounded-full px-3 py-2 text-[10px] font-black uppercase ${
                          sale.status ===
                          "documentation_complete"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {statusLabel(
                          sale.status
                        )}
                      </span>

                      <div className="mt-2 text-xs font-black text-blue-600">
                        Abrir →
                      </div>
                    </div>

                  </button>

                )
              )}

            </div>

          )}

        </section>

      )}

    </div>
  );
}


const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100";


function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
        {label}
        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}


function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-4">

      <span className="text-xs font-black uppercase tracking-wider text-slate-400">
        {label}
      </span>

      <span className="max-w-[65%] text-right text-sm font-black text-slate-900">
        {value}
      </span>

    </div>
  );
}


function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">

      <div className="flex items-center justify-between">
        <div className="text-3xl">
          {icon}
        </div>

        <div className="text-3xl font-black text-slate-950">
          {value}
        </div>
      </div>

      <div className="mt-5 text-xs font-black uppercase tracking-wider text-slate-500">
        {label}
      </div>

    </div>
  );
}


function DocumentUpload({
  title,
  description,
  icon,
  complete,
  loading,
  capture,
  onChange,
}: {
  title: string;
  description: string;
  icon: string;
  complete: boolean;
  loading: boolean;
  capture: "user" | "environment";
  onChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 transition ${
        complete
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-slate-200 bg-slate-50"
      }`}
    >

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex items-center gap-4">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
            {icon}
          </div>

          <div>
            <h3 className="font-black text-slate-900">
              {title}
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              {description}
            </p>
          </div>

        </div>


        <div className="flex items-center gap-3">

          {complete && (
            <span className="text-xs font-black text-emerald-600">
              ✓ RECEBIDO
            </span>
          )}

          <label
            className={`cursor-pointer rounded-xl px-4 py-3 text-xs font-black transition ${
              loading
                ? "cursor-wait bg-slate-200 text-slate-400"
                : complete
                  ? "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                  : "bg-slate-950 text-white hover:bg-slate-800"
            }`}
          >
            {loading
              ? "Enviando..."
              : complete
                ? "Substituir"
                : "Enviar"}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture={capture}
              disabled={loading}
              onChange={onChange}
              className="hidden"
            />
          </label>

        </div>

      </div>

    </div>
  );
}
