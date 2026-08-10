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
import PageHeader from "@/components/PageHeader";
import { Icons } from "@/components/Icons";
import CardSaleAuthorizationPanel from "@/components/CardSaleAuthorizationPanel";


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

    case "authorization_pending":
      return "Aguardando autorização";

    case "authorized":
      return "Autorização concluída";

    case "payment_created":
      return "Aguardando pagamento";

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
            "/card-sales"
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
            "/card-sales",
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
            <Icons.ShieldLock size={34} />
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
    <div className="space-y-6 animate-in fade-in duration-700 max-w-7xl mx-auto pb-10">

      <PageHeader
        title="Cartão de"
        highlight="Crédito"
        subtitle="Vendas • Segurança • Documentação • Pagamentos"
      >
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 shadow-sm">
          <Icons.ShieldCheck size={18} />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Acesso autorizado
          </span>
        </div>

        <div
          className={`flex items-center gap-2 rounded-2xl border px-4 py-3 shadow-sm ${
            storageReady
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {storageReady ? (
            <Icons.CheckCircle size={18} />
          ) : (
            <Icons.AlertCircle size={18} />
          )}

          <span className="text-[10px] font-black uppercase tracking-widest">
            {storageReady
              ? "Storage privado"
              : "Storage pendente"}
          </span>
        </div>

        {userRole && (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm">
            {userRole}
          </div>
        )}
      </PageHeader>


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
          <span className="flex items-center gap-2">
            <Icons.LayoutDashboard size={16} />
            Visão Geral
          </span>
        </button>

        <button
          onClick={startNewSale}
          className={`rounded-xl px-5 py-3 text-sm font-black transition ${
            view === "new-sale"
              ? "bg-violet-600 text-white shadow-lg"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <span className="flex items-center gap-2">
            <Icons.Plus size={16} />
            Nova Venda
          </span>
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
          <span className="flex items-center gap-2">
            <Icons.Briefcase size={16} />
            {userRole === "admin"
              ? "Todas as Vendas"
              : "Minhas Vendas"}
          </span>
        </button>

        <Link
          href="/calculadora-taxas"
          className="rounded-xl px-5 py-3 text-sm font-black text-slate-500 transition hover:bg-slate-50"
        >
          <span className="flex items-center gap-2">
            <Icons.Calculator size={16} />
            Calculadora
          </span>
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
              icon={<Icons.CreditCard size={25} />}
            />

            <MetricCard
              label="Documentação completa"
              value={completedSales}
              icon={<Icons.CheckCircle size={25} />}
            />

            <MetricCard
              label="Aguardando documentos"
              value={pendingSales}
              icon={<Icons.FileText size={25} />}
            />

          </section>


          <section className="grid gap-5 lg:grid-cols-3">

            <button
              onClick={startNewSale}
              className="group rounded-[2rem] border border-violet-100 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-violet-100 text-2xl">
                <Icons.Plus size={26} />
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
                <Icons.Calculator size={26} />
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
                <Icons.Briefcase size={26} />
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
                <Icons.ShieldCheck size={26} />
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

          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-xl md:p-8">

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


          <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-xl md:p-8">

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
                  <Icons.FileText size={34} />
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
                  icon={<Icons.FileText size={25} />}
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
                  icon={<Icons.FileText size={23} />}
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
                  icon={<Icons.UserCheck size={23} />}
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


                {activeSale.status !==
                  "documentation_pending" ? (

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">

                    <div className="flex gap-3">
                      <div className="text-2xl">
                        <Icons.CheckCircle size={24} />
                      </div>

                      <div>
                        <h3 className="font-black text-emerald-900">
                          Documentação completa
                        </h3>

                        <p className="mt-1 text-sm leading-6 text-emerald-700">
                          Frente, verso e selfie foram armazenados com segurança.
                        </p>
                      </div>
                    </div>

                  </div>

                ) : (

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">

                    <div className="flex gap-3">
                      <div className="text-2xl">
                        <Icons.Lock size={24} />
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


                  {activeSale.status !==
                    "documentation_pending" && (

                    <CardSaleAuthorizationPanel
                      saleId={activeSale.id}
                      saleStatus={
                        activeSale.status
                      }
                      onStateChange={(
                        status,
                        paymentId
                      ) => {
                        setActiveSale(
                          (current) =>
                            current
                              ? {
                                  ...current,
                                  status,
                                  payment_id:
                                    paymentId
                                    ?? current.payment_id,
                                }
                              : current
                        );

                        void loadSales();
                      }}
                    />

                  )}

              </div>

            )}

          </div>

        </section>
      )}


      {view === "sales" && (

        <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-xl md:p-8">

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
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-xl">

      <div className="flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
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
  icon: React.ReactNode;
  complete: boolean;
  loading: boolean;
  capture: "user" | "environment";
  onChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
}) {
  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  const [selectedFileName, setSelectedFileName] =
    useState("");


  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }
    };
  }, [previewUrl]);


  const handleSelectedFile = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.currentTarget.files?.[0];

    if (file) {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }

      setPreviewUrl(
        URL.createObjectURL(file)
      );

      setSelectedFileName(
        file.name
      );
    }

    onChange(event);
  };


  return (
    <div
      className={`relative overflow-hidden rounded-[1.4rem] border transition-all duration-300 ${
        complete
          ? "border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white shadow-sm"
          : loading
            ? "border-blue-300 bg-white shadow-lg shadow-blue-100/60"
            : "border-slate-200 bg-gradient-to-br from-slate-50 to-white hover:border-blue-200 hover:shadow-md"
      }`}
    >

      {/* ==================================================
          CARREGAMENTO PREMIUM
      ================================================== */}

      {loading && (
        <div className="absolute inset-0 z-30 flex items-center bg-white/95 px-5 backdrop-blur-sm">

          <div className="flex w-full items-center gap-4">

            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50 ring-1 ring-blue-100">

              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Imagem selecionada"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Icons.Image
                  size={25}
                  className="text-blue-600"
                />
              )}

              <div className="absolute inset-0 bg-slate-950/25" />

              <Icons.Loader2
                size={26}
                className="absolute animate-spin text-white drop-shadow"
              />

            </div>


            <div className="min-w-0 flex-1">

              <div className="flex items-center justify-between gap-3">

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
                    Upload seguro
                  </p>

                  <h4 className="mt-1 text-sm font-black text-slate-950">
                    Enviando e protegendo imagem...
                  </h4>
                </div>


                <div className="hidden rounded-full bg-blue-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-blue-600 sm:block">
                  Processando
                </div>

              </div>


              {selectedFileName && (
                <p className="mt-1 truncate text-[11px] font-medium text-slate-400">
                  {selectedFileName}
                </p>
              )}


              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">

                <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-blue-600 via-violet-500 to-cyan-400" />

              </div>


              <p className="mt-2 text-[10px] font-semibold text-slate-400">
                Validando formato, integridade e armazenamento privado.
              </p>

            </div>

          </div>

        </div>
      )}


      {/* ==================================================
          CONTEÚDO NORMAL
      ================================================== */}

      <div className="p-5">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex min-w-0 items-center gap-4">

            <div
              className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ${
                complete
                  ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
                  : "bg-white text-blue-600 ring-slate-100"
              }`}
            >
              {complete ? (
                <Icons.CheckCircle
                  size={24}
                />
              ) : (
                icon
              )}
            </div>


            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-2">

                <h3 className="font-black text-slate-950">
                  {title}
                </h3>


                {complete && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">

                    <Icons.Check
                      size={11}
                    />

                    Recebido

                  </span>
                )}

              </div>


              <p className="mt-1 text-xs leading-5 text-slate-500">
                {description}
              </p>


              <p className="mt-1.5 text-[10px] font-semibold text-slate-400 sm:hidden">
                Escolha uma foto da galeria ou capture agora usando a câmera.
              </p>

            </div>

          </div>


          {/* ==================================================
              AÇÕES
          ================================================== */}

          <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:items-center">

            {/* GALERIA / ARQUIVO */}

            <label
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[11px] font-black transition-all ${
                loading
                  ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
                  : complete
                    ? "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-600"
                    : "border-slate-200 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-600 hover:shadow-md"
              }`}
            >

              <Icons.Image
                size={16}
              />

              <span className="sm:hidden">
                Galeria
              </span>

              <span className="hidden sm:inline">
                {complete
                  ? "Trocar arquivo"
                  : "Selecionar arquivo"}
              </span>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={loading}
                onChange={handleSelectedFile}
                className="hidden"
              />

            </label>


            {/* CÂMERA */}

            <label
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-[11px] font-black text-white shadow-md transition-all ${
                loading
                  ? "pointer-events-none bg-slate-300"
                  : complete
                    ? "bg-slate-950 hover:-translate-y-0.5 hover:bg-slate-800"
                    : "bg-gradient-to-r from-blue-600 to-violet-600 hover:-translate-y-0.5 hover:shadow-lg"
              }`}
            >

              <Icons.Camera
                size={17}
              />

              <span>
                {complete
                  ? "Refazer foto"
                  : "Capturar foto"}
              </span>

              <input
                type="file"
                accept="image/*"
                capture={capture}
                disabled={loading}
                onChange={handleSelectedFile}
                className="hidden"
              />

            </label>

          </div>

        </div>


        {/* ==================================================
            RODAPÉ DE SEGURANÇA
        ================================================== */}

        {!complete && !loading && (
          <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-[10px] font-semibold text-slate-400">

            <Icons.ShieldCheck
              size={13}
              className="text-blue-500"
            />

            JPG, PNG ou WEBP • máximo 5 MB • armazenamento privado

          </div>
        )}


        {complete && !loading && (
          <div className="mt-4 flex items-center gap-2 border-t border-emerald-100 pt-3 text-[10px] font-bold text-emerald-600">

            <Icons.ShieldCheck
              size={13}
            />

            Documento recebido e protegido com sucesso

          </div>
        )}

      </div>

    </div>
  );
}
