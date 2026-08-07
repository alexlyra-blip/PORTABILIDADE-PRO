"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/utils/api";
import { Icons } from "@/components/Icons";

const initialForm = {
  customer_name: "",
  customer_email: "",
  customer_document: "",
  customer_phone: "",
  description: "Pacote Portabilidade PRO",
  package_name: "",
  consultation_quantity: "",
  amount: "",
  expiration_days: 7,
  internal_note: "",
};

const money = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

const dateTime = (value) => {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const statusConfig = {
  approved: {
    label: "Pago",
    className: "bg-emerald-100 text-emerald-700",
  },
  pending: {
    label: "Pendente",
    className: "bg-amber-100 text-amber-700",
  },
  created: {
    label: "Aguardando",
    className: "bg-blue-100 text-blue-700",
  },
  rejected: {
    label: "Recusado",
    className: "bg-red-100 text-red-700",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-slate-200 text-slate-700",
  },
  refunded: {
    label: "Estornado",
    className: "bg-purple-100 text-purple-700",
  },
};

function StatusBadge({ status }) {
  const config = statusConfig[status] || {
    label: status || "Desconhecido",
    className: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>

          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function FinanceiroPage() {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    total_cobrancas: 0,
    pagamentos_aprovados: 0,
    valor_recebido: 0,
    cobrancas_pendentes: 0,
    valor_pendente: 0,
    ticket_medio: 0,
  });

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [filter, setFilter] = useState("all");

  const loadData = useCallback(async () => {
    try {
      setError("");

      const [paymentsResponse, statsResponse] =
        await Promise.all([
          api.get("/payments/admin"),
          api.get("/payments/admin/stats"),
        ]);

      setPayments(paymentsResponse?.payments || []);
      setStats(statsResponse || {});
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Não foi possível carregar os dados financeiros."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const interval = setInterval(loadData, 30000);

    return () => clearInterval(interval);
  }, [loadData]);

  const filteredPayments = useMemo(() => {
    if (filter === "all") return payments;

    if (filter === "pending") {
      return payments.filter((payment) =>
        ["created", "pending"].includes(payment.status)
      );
    }

    return payments.filter(
      (payment) => payment.status === filter
    );
  }, [payments, filter]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.customer_name.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }

    const amount = Number(
      String(form.amount).replace(",", ".")
    );

    if (!amount || amount < 1) {
      setError("Informe um valor válido.");
      return;
    }

    setCreating(true);
    setError("");
    setSuccess(null);

    try {
      const payload = {
        customer_name: form.customer_name.trim(),
        customer_email:
          form.customer_email.trim() || null,
        customer_document:
          form.customer_document.trim() || null,
        customer_phone:
          form.customer_phone.trim() || null,
        description:
          form.description.trim() ||
          "Pacote Portabilidade PRO",
        amount,
        package_name:
          form.package_name.trim() || null,
        consultation_quantity:
          form.consultation_quantity !== ""
            ? Number(form.consultation_quantity)
            : null,
        expiration_days:
          Number(form.expiration_days) || 7,
        internal_note:
          form.internal_note.trim() || null,
      };

      const response = await api.post(
        "/payments/admin/create-link",
        payload
      );

      setSuccess(response);
      setForm(initialForm);

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Não foi possível gerar o link de pagamento."
      );
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async (url) => {
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copie o link:", url);
    }
  };

  const sendWhatsApp = (payment) => {
    if (!payment?.checkout_url) return;

    const text = [
      "Olá!",
      "",
      `Segue seu link de pagamento do Portabilidade PRO.`,
      "",
      `Valor: ${money(payment.amount)}`,
      payment.package_name
        ? `Pacote: ${payment.package_name}`
        : null,
      payment.external_reference
        ? `Referência: ${payment.external_reference}`
        : null,
      "",
      payment.checkout_url,
    ]
      .filter(Boolean)
      .join("\n");

    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-6 lg:p-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                <Icons.Wallet size={26} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
                  Financeiro
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Mercado Pago • cobranças e pagamentos
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Atualizar
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Valor recebido"
            value={money(stats.valor_recebido)}
            subtitle={`${stats.pagamentos_aprovados || 0} pagamentos aprovados`}
            icon={Icons.Banknote}
          />

          <StatCard
            title="Valor pendente"
            value={money(stats.valor_pendente)}
            subtitle={`${stats.cobrancas_pendentes || 0} cobranças aguardando`}
            icon={Icons.Wallet}
          />

          <StatCard
            title="Total de cobranças"
            value={stats.total_cobrancas || 0}
            subtitle="Links registrados"
            icon={Icons.Receipt}
          />

          <StatCard
            title="Ticket médio"
            value={money(stats.ticket_medio)}
            subtitle="Pagamentos aprovados"
            icon={Icons.CreditCard}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-lg font-bold text-slate-900">
                Nova cobrança
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Gere um link com qualquer valor.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 p-5"
            >
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Cliente *
                </label>

                <input
                  name="customer_name"
                  value={form.customer_name}
                  onChange={handleChange}
                  placeholder="Nome do cliente ou empresa"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  E-mail
                </label>

                <input
                  type="email"
                  name="customer_email"
                  value={form.customer_email}
                  onChange={handleChange}
                  placeholder="cliente@email.com"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    CPF/CNPJ
                  </label>

                  <input
                    name="customer_document"
                    value={form.customer_document}
                    onChange={handleChange}
                    placeholder="CPF ou CNPJ"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Telefone
                  </label>

                  <input
                    name="customer_phone"
                    value={form.customer_phone}
                    onChange={handleChange}
                    placeholder="DDD + número"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Pacote
                </label>

                <input
                  name="package_name"
                  value={form.package_name}
                  onChange={handleChange}
                  placeholder="Ex.: Pacote 1.000 consultas"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Consultas
                  </label>

                  <input
                    type="number"
                    min="0"
                    name="consultation_quantity"
                    value={form.consultation_quantity}
                    onChange={handleChange}
                    placeholder="1000"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Validade
                  </label>

                  <select
                    name="expiration_days"
                    value={form.expiration_days}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value={1}>1 dia</option>
                    <option value={3}>3 dias</option>
                    <option value={7}>7 dias</option>
                    <option value={15}>15 dias</option>
                    <option value={30}>30 dias</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Valor da cobrança *
                </label>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-slate-500">
                    R$
                  </span>

                  <input
                    name="amount"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={handleChange}
                    placeholder="0,00"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-3.5 text-lg font-bold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Descrição
                </label>

                <input
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Observação interna
                </label>

                <textarea
                  name="internal_note"
                  value={form.internal_note}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Opcional"
                  className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icons.CreditCard size={20} />

                {creating
                  ? "Gerando cobrança..."
                  : "Gerar link de pagamento"}
              </button>
            </form>

            {success?.payment_url && (
              <div className="border-t border-emerald-100 bg-emerald-50 p-5">
                <p className="font-bold text-emerald-800">
                  Cobrança criada com sucesso!
                </p>

                <p className="mt-1 text-sm text-emerald-700">
                  {success.reference}
                </p>

                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {money(success.amount)}
                </p>

                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      copyLink(success.payment_url)
                    }
                    className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm"
                  >
                    Copiar link
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      window.open(
                        success.payment_url,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
                  >
                    Abrir Checkout
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Cobranças
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Histórico de links e pagamentos
                </p>
              </div>

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value)
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium outline-none"
              >
                <option value="all">Todos</option>
                <option value="approved">Pagos</option>
                <option value="pending">Pendentes</option>
                <option value="rejected">Recusados</option>
                <option value="cancelled">Cancelados</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Cliente</th>
                    <th className="px-5 py-3">Pacote</th>
                    <th className="px-5 py-3">Valor</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Criado</th>
                    <th className="px-5 py-3 text-right">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center text-sm text-slate-500"
                      >
                        Carregando cobranças...
                      </td>
                    </tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center text-sm text-slate-500"
                      >
                        Nenhuma cobrança encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {payment.customer_name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {payment.customer_email ||
                              payment.external_reference}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-slate-700">
                            {payment.package_name || "-"}
                          </p>

                          {payment.consultation_quantity !=
                            null && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              {payment.consultation_quantity} consultas
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 font-bold text-slate-900">
                          {money(payment.amount)}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={payment.status}
                          />
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {dateTime(payment.created_at)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            {payment.checkout_url && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyLink(
                                      payment.checkout_url
                                    )
                                  }
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                >
                                  Copiar
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    sendWhatsApp(payment)
                                  }
                                  className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                                >
                                  WhatsApp
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    window.open(
                                      payment.checkout_url,
                                      "_blank",
                                      "noopener,noreferrer"
                                    )
                                  }
                                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"
                                >
                                  Abrir
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
