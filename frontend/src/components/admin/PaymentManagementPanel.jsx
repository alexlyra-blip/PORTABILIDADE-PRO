"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/utils/api";
import { openPremiumPaymentReceipt } from "@/components/admin/PremiumPaymentReceipt";


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
    label: "Aprovado",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },

  pending: {
    label: "Pendente",
    className:
      "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },

  created: {
    label: "Aguardando",
    className:
      "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
  },

  rejected: {
    label: "Recusado",
    className:
      "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
  },

  cancelled: {
    label: "Cancelado",
    className:
      "border-slate-200 bg-slate-100 text-slate-700",
    dot: "bg-slate-500",
  },

  refunded: {
    label: "Estornado",
    className:
      "border-violet-200 bg-violet-50 text-violet-700",
    dot: "bg-violet-500",
  },
};


function StatusBadge({ status }) {
  const config =
    statusConfig[status] || {
      label: status || "-",
      className:
        "border-slate-200 bg-slate-50 text-slate-600",
      dot: "bg-slate-400",
    };

  return (
    <span
      className={
        "inline-flex items-center gap-2 rounded-full "
        + "border px-3 py-1 text-xs font-black "
        + config.className
      }
    >
      <span
        className={
          "h-2 w-2 rounded-full "
          + config.dot
        }
      />

      {config.label}
    </span>
  );
}


function CardBrand({ brand }) {
  const value = String(
    brand || ""
  ).toLowerCase();

  if (value === "visa") {
    return (
      <span className="inline-flex rounded-md border border-blue-100 bg-white px-3 py-1 text-sm font-black italic tracking-tight text-blue-700 shadow-sm">
        VISA
      </span>
    );
  }

  if (
    value === "master"
    || value === "mastercard"
  ) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="relative block h-7 w-11">
          <span className="absolute left-0 top-0 h-7 w-7 rounded-full bg-red-500" />
          <span className="absolute right-0 top-0 h-7 w-7 rounded-full bg-amber-400 opacity-90" />
        </span>

        <span className="text-sm font-bold text-slate-700">
          Mastercard
        </span>
      </span>
    );
  }

  if (
    value === "amex"
    || value === "american_express"
  ) {
    return (
      <span className="inline-flex rounded-md bg-sky-500 px-2.5 py-1 text-xs font-black text-white">
        AMERICAN EXPRESS
      </span>
    );
  }

  if (value === "elo") {
    return (
      <span className="inline-flex rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
        elo
      </span>
    );
  }

  if (value === "hipercard") {
    return (
      <span className="inline-flex rounded-md bg-red-600 px-3 py-1 text-xs font-black text-white">
        HIPERCARD
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold uppercase text-slate-600">
      {brand || "Cartão"}
    </span>
  );
}


function DetailRow({
  label,
  children,
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <div className="break-all text-sm font-bold text-slate-900 sm:text-right">
        {children || "-"}
      </div>
    </div>
  );
}


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


export default function PaymentManagementPanel({
  payments = [],
  cardSalesFinance = [],
  stats = {},
  onRefresh,
}) {
  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("all");

  const [
    selectedPayment,
    setSelectedPayment,
  ] = useState(null);

  const [
    receiptPayment,
    setReceiptPayment,
  ] = useState(null);

  const [
    refundPayment,
    setRefundPayment,
  ] = useState(null);

  const [
    cancelPayment,
    setCancelPayment,
  ] = useState(null);

  const [
    adminPassword,
    setAdminPassword,
  ] = useState("");

  const [
    refundReason,
    setRefundReason,
  ] = useState("");

  const [
    cancelReason,
    setCancelReason,
  ] = useState("");

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const [
    actionError,
    setActionError,
  ] = useState("");

  const [
    actionSuccess,
    setActionSuccess,
  ] = useState("");


  const filteredPayments =
    useMemo(() => {
      const term = search
        .trim()
        .toLowerCase();

      return payments.filter(
        (payment) => {
          if (
            status !== "all"
          ) {
            if (
              status === "pending"
            ) {
              if (
                ![
                  "created",
                  "pending",
                ].includes(
                  payment.status
                )
              ) {
                return false;
              }
            } else if (
              payment.status !== status
            ) {
              return false;
            }
          }

          if (!term) {
            return true;
          }

          return [
            payment.customer_name,
            payment.customer_email,
            payment.external_reference,
            payment.order_id,
            payment.transaction_id,
            payment.payment_id,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(term)
            );
        }
      );
    }, [
      payments,
      search,
      status,
    ]);


  const refresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }
  };


  const openPremiumReceipt = (payment) => {
    const sameValue = (left, right) =>
      left !== null
      && left !== undefined
      && left !== ""
      && right !== null
      && right !== undefined
      && right !== ""
      && String(left) === String(right);

    const normalizedText = (value) =>
      String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();

    const paymentAmount = Number(payment.amount || 0);
    const paymentInstallments = Number(payment.installments || 0);

    const rankedSales = cardSalesFinance.map((sale) => {
      const salePayment = sale?.payment || {};
      const saleReceipt = sale?.receipt || {};
      const salePricing = sale?.pricing || {};
      const saleCustomer = sale?.customer || {};
      let score = 0;

      const identifiers = [
        [salePayment.id, payment.id],
        [salePayment.external_reference, payment.external_reference],
        [saleReceipt.external_reference, payment.external_reference],
        [salePayment.order_id, payment.order_id],
        [saleReceipt.order_id, payment.order_id],
        [salePayment.mercado_pago_payment_id, payment.payment_id],
        [saleReceipt.mercado_pago_payment_id, payment.payment_id],
        [salePayment.mercado_pago_payment_id, payment.mercado_pago_payment_id],
      ];

      score += identifiers.reduce(
        (total, [left, right]) => total + (sameValue(left, right) ? 20 : 0),
        0
      );

      const saleName = normalizedText(
        saleCustomer.name || saleReceipt.customer_name
      );
      const paymentName = normalizedText(payment.customer_name);

      if (saleName && paymentName && saleName === paymentName) {
        score += 5;
      }

      const saleAmount = Number(
        salePricing.customer_total
        ?? salePayment.amount
        ?? saleReceipt.amount
        ?? 0
      );

      if (
        saleAmount > 0
        && paymentAmount > 0
        && Math.abs(saleAmount - paymentAmount) < 0.02
      ) {
        score += 5;
      }

      const saleInstallments = Number(
        saleReceipt.installments
        ?? salePayment.installments
        ?? salePricing.installments
        ?? 0
      );

      if (
        saleInstallments > 0
        && paymentInstallments > 0
        && saleInstallments === paymentInstallments
      ) {
        score += 2;
      }

      return { sale, score };
    });

    rankedSales.sort((left, right) => right.score - left.score);

    const matchingSale = rankedSales[0]?.score >= 7
      ? rankedSales[0].sale
      : null;

    openPremiumPaymentReceipt({
      sale: matchingSale || null,
      payment,
    });
  };


  const requestRefund =
    async () => {
      if (
        !refundPayment
        || !adminPassword
      ) {
        return;
      }

      setActionLoading(true);
      setActionError("");
      setActionSuccess("");

      try {
        await api.post(
          `/payment-orders/admin/${refundPayment.id}/refund`,
          {
            password:
              adminPassword,

            reason:
              refundReason.trim()
              || null,
          }
        );

        setRefundPayment(null);
        setSelectedPayment(null);
        setAdminPassword("");
        setRefundReason("");

        setActionSuccess(
          "Estorno realizado e registrado com sucesso."
        );

        await refresh();

      } catch (error) {
        console.error(error);

        setActionError(
          error?.message
          || (
            "Não foi possível "
            + "realizar o estorno."
          )
        );

      } finally {
        setActionLoading(false);
      }
    };


  const requestCancel =
    async () => {
      if (!cancelPayment) {
        return;
      }

      setActionLoading(true);
      setActionError("");
      setActionSuccess("");

      try {
        await api.post(
          `/payments/admin/${cancelPayment.id}/cancel`,
          {
            reason:
              cancelReason.trim()
              || null,
          }
        );

        setCancelPayment(null);
        setSelectedPayment(null);
        setCancelReason("");

        setActionSuccess(
          "Cobrança cancelada com sucesso."
        );

        await refresh();

      } catch (error) {
        console.error(error);

        setActionError(
          error?.message
          || (
            "Não foi possível "
            + "cancelar a cobrança."
          )
        );

      } finally {
        setActionLoading(false);
      }
    };


  const printReceipt = (
    payment
  ) => {
    const installments =
      Math.max(
        1,
        Number(
          payment.installments || 1
        )
      );

    const amount =
      Number(
        payment.amount || 0
      );

    const installmentValue =
      amount / installments;

    const brand =
      String(
        payment.card_brand
        || payment.payment_method_id
        || "Cartão"
      ).toUpperCase();

    const popup =
      window.open(
        "",
        "_blank",
        "width=900,height=1050"
      );

    if (!popup) {
      setActionError(
        "O navegador bloqueou a janela de impressão."
      );

      return;
    }

    popup.document.write(`
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>
Comprovante ${escapeHtml(
  payment.external_reference
)}
</title>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 40px;
  background: #eef4ff;
  color: #0f172a;
  font-family: Arial, Helvetica, sans-serif;
}

.receipt {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 38px;
  border-radius: 28px;
  background: #ffffff;
  box-shadow:
    0 25px 70px rgba(15,23,42,.12);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.porta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.p-icon {
  display: flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
  background:
    linear-gradient(
      135deg,
      #2563eb,
      #7c3aed
    );
  color: white;
  font-size: 25px;
  font-weight: 900;
}

.porta strong {
  display: block;
  font-size: 15px;
}

.porta small {
  color: #7c3aed;
  font-weight: 900;
  letter-spacing: 4px;
}

.mp {
  font-size: 16px;
  font-weight: 900;
  color: #0ea5e9;
}

.title {
  margin-top: 38px;
  text-align: center;
}

.title h1 {
  margin: 0;
  font-size: 26px;
}

.title p {
  margin-top: 7px;
  color: #64748b;
  font-size: 12px;
}

.approved {
  margin: 25px 0;
  padding: 24px;
  border-radius: 22px;
  background: #ecfdf5;
  text-align: center;
  color: #047857;
}

.approved strong {
  display: block;
  font-size: 16px;
}

.amount {
  margin-top: 8px;
  font-size: 38px;
  font-weight: 900;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 30px;
  padding: 13px 0;
  border-bottom:
    1px solid #e2e8f0;
}

.label {
  color: #64748b;
}

.value {
  text-align: right;
  font-weight: 700;
  word-break: break-all;
}

.invoice {
  margin-top: 24px;
  padding: 18px;
  border:
    1px solid #bfdbfe;
  border-radius: 16px;
  background: #eff6ff;
}

.invoice small {
  color: #64748b;
}

.invoice strong {
  display: block;
  margin-top: 6px;
  color: #1d4ed8;
  font-size: 20px;
  letter-spacing: 1px;
}

.footer {
  margin-top: 28px;
  text-align: center;
  color: #94a3b8;
  font-size: 11px;
  line-height: 1.5;
}

@media print {
  body {
    padding: 0;
    background: white;
  }

  .receipt {
    max-width: 100%;
    box-shadow: none;
  }
}
</style>
</head>

<body>

<div class="receipt">

  <div class="header">

    <div class="porta">
      <div class="p-icon">
        P
      </div>

      <div>
        <strong>
          PORTABILIDADE
        </strong>

        <small>
          PRO
        </small>
      </div>
    </div>

    <div class="mp">
      Mercado Pago
    </div>

  </div>


  <div class="title">

    <h1>
      Comprovante de Pagamento
    </h1>

    <p>
      Pagamento processado por
      Mercado Pago
    </p>

  </div>


  <div class="approved">

    <strong>
      ✓ PAGAMENTO APROVADO
    </strong>

    <div class="amount">
      ${escapeHtml(
        money(amount)
      )}
    </div>

  </div>


  <div class="row">
    <span class="label">
      Cliente
    </span>

    <span class="value">
      ${escapeHtml(
        payment.customer_name
        || "-"
      )}
    </span>
  </div>


  <div class="row">
    <span class="label">
      Data
    </span>

    <span class="value">
      ${escapeHtml(
        dateTime(
          payment.paid_at
          || payment.created_at
        )
      )}
    </span>
  </div>


  <div class="row">
    <span class="label">
      Order ID
    </span>

    <span class="value">
      ${escapeHtml(
        payment.order_id
        || "-"
      )}
    </span>
  </div>


  <div class="row">
    <span class="label">
      Referência
    </span>

    <span class="value">
      ${escapeHtml(
        payment.external_reference
        || "-"
      )}
    </span>
  </div>


  <div class="row">
    <span class="label">
      Pagamento
    </span>

    <span class="value">
      Cartão de crédito
    </span>
  </div>


  <div class="row">
    <span class="label">
      Bandeira
    </span>

    <span class="value">
      ${escapeHtml(brand)}
    </span>
  </div>


  <div class="row">
    <span class="label">
      Parcelamento
    </span>

    <span class="value">
      ${installments}x de
      ${escapeHtml(
        money(
          installmentValue
        )
      )}
    </span>
  </div>


  <div class="invoice">

    <small>
      Nome que normalmente
      aparecerá na fatura
    </small>

    <strong>
      ${escapeHtml(
        payment.statement_descriptor
        || "PORTAPRO"
      )}
    </strong>

  </div>


  <div class="footer">
    Comprovante gerado pelo
    Portabilidade PRO com dados
    registrados da transação
    processada pelo Mercado Pago.
  </div>

</div>

<script>
setTimeout(
  function () {
    window.print();
  },
  300
);
</script>

</body>
</html>
    `);

    popup.document.close();
  };


  const filters = [
    ["all", "Todos"],
    ["approved", "Aprovados"],
    ["pending", "Pendentes"],
    ["rejected", "Recusados"],
    ["refunded", "Estornados"],
    ["cancelled", "Cancelados"],
  ];


  return (
    <section className="mb-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">

      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-950 via-blue-950 to-violet-950 p-6 text-white">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-300">
              Mercado Pago
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Gestão de Pagamentos
            </h2>

            <p className="mt-1 text-sm text-slate-300">
              Histórico, comprovantes,
              cancelamentos e estornos.
            </p>

          </div>


          <button
            type="button"
            onClick={refresh}
            className="w-fit rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold transition hover:bg-white/15"
          >
            Atualizar histórico
          </button>

        </div>


        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">

          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">

            <p className="text-xs text-slate-300">
              Receita aprovada
            </p>

            <p className="mt-2 text-xl font-black">
              {money(
                stats.valor_recebido
              )}
            </p>

          </div>


          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">

            <p className="text-xs text-slate-300">
              Aprovados
            </p>

            <p className="mt-2 text-xl font-black">
              {stats.pagamentos_aprovados || 0}
            </p>

          </div>


          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">

            <p className="text-xs text-slate-300">
              Pendentes
            </p>

            <p className="mt-2 text-xl font-black">
              {stats.cobrancas_pendentes || 0}
            </p>

          </div>


          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">

            <p className="text-xs text-slate-300">
              Recusados
            </p>

            <p className="mt-2 text-xl font-black">
              {stats.pagamentos_rejeitados || 0}
            </p>

          </div>


          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">

            <p className="text-xs text-slate-300">
              Estornados
            </p>

            <p className="mt-2 text-xl font-black">
              {stats.pagamentos_estornados || 0}
            </p>

          </div>

        </div>

      </div>


      <div className="p-5 sm:p-6">

        {actionError && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {actionError}
          </div>
        )}


        {actionSuccess && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {actionSuccess}
          </div>
        )}


        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Buscar cliente, referência ou Order ID..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 lg:max-w-md"
          />


          <div className="flex flex-wrap gap-2">

            {filters.map(
              ([
                value,
                label,
              ]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setStatus(value)
                  }
                  className={
                    "rounded-xl px-3.5 py-2 text-xs font-black transition "
                    + (
                      status === value
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )
                  }
                >
                  {label}
                </button>
              )
            )}

          </div>

        </div>


        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">

          <table className="min-w-full divide-y divide-slate-200">

            <thead className="bg-slate-50">

              <tr>

                {[
                  "Cliente",
                  "Cartão",
                  "Valor",
                  "Status",
                  "Data",
                  "",
                ].map(
                  (label) => (
                    <th
                      key={label}
                      className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-500"
                    >
                      {label}
                    </th>
                  )
                )}

              </tr>

            </thead>


            <tbody className="divide-y divide-slate-100 bg-white">

              {filteredPayments.map(
                (payment) => (

                  <tr
                    key={payment.id}
                    className="hover:bg-slate-50"
                  >

                    <td className="px-4 py-4">

                      <p className="font-bold text-slate-900">
                        {payment.customer_name}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {payment.external_reference}
                      </p>

                    </td>


                    <td className="px-4 py-4">

                      <CardBrand
                        brand={
                          payment.card_brand
                          || payment.payment_method_id
                        }
                      />

                      {payment.installments && (
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {payment.installments}x
                        </p>
                      )}

                    </td>


                    <td className="px-4 py-4 font-black text-slate-900">
                      {money(
                        payment.amount
                      )}
                    </td>


                    <td className="px-4 py-4">
                      <StatusBadge
                        status={
                          payment.status
                        }
                      />
                    </td>


                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                      {dateTime(
                        payment.paid_at
                        || payment.created_at
                      )}
                    </td>


                    <td className="px-4 py-4 text-right">

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedPayment(
                            payment
                          )
                        }
                        className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
                      >
                        Ver detalhes
                      </button>

                    </td>

                  </tr>
                )
              )}


              {!filteredPayments.length && (

                <tr>

                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-slate-400"
                  >
                    Nenhum pagamento encontrado.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>


      {selectedPayment
        && typeof document !== "undefined"
        && createPortal(

        <div
          className="fixed inset-0 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          style={{ zIndex: 2147483000 }}
        >

          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">

            <div className="border-b border-slate-100 p-6">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <StatusBadge
                    status={
                      selectedPayment.status
                    }
                  />

                  <h3 className="mt-3 text-3xl font-black text-slate-950">
                    {money(
                      selectedPayment.amount
                    )}
                  </h3>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    setSelectedPayment(
                      null
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl font-black text-slate-500"
                >
                  ×
                </button>

              </div>

            </div>


            <div className="p-6">

              <DetailRow label="Cliente">
                {selectedPayment.customer_name}
              </DetailRow>


              <DetailRow label="Data">
                {dateTime(
                  selectedPayment.paid_at
                  || selectedPayment.created_at
                )}
              </DetailRow>


              <DetailRow label="Order ID">
                {selectedPayment.order_id}
              </DetailRow>


              <DetailRow label="Transaction ID">
                {selectedPayment.transaction_id}
              </DetailRow>


              <DetailRow label="Referência">
                {selectedPayment.external_reference}
              </DetailRow>


              <DetailRow label="Bandeira">
                <CardBrand
                  brand={
                    selectedPayment.card_brand
                    || selectedPayment.payment_method_id
                  }
                />
              </DetailRow>


              <DetailRow label="Parcelamento">
                {selectedPayment.installments
                  ? (
                    selectedPayment.installments
                    + "x"
                  )
                  : "-"}
              </DetailRow>


              <DetailRow label="Nome na fatura">

                <span className="tracking-wide text-blue-700">
                  {selectedPayment.statement_descriptor
                    || "PORTAPRO"}
                </span>

              </DetailRow>


              {selectedPayment.status_detail && (

                <DetailRow label="Detalhe do status">
                  {selectedPayment.status_detail}
                </DetailRow>

              )}


              {selectedPayment.last_refund && (

                <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-4">

                  <p className="font-black text-violet-800">
                    Estorno registrado
                  </p>

                  <p className="mt-1 text-sm text-violet-700">
                    {money(
                      selectedPayment
                        .last_refund
                        ?.amount
                    )}
                    {" • "}
                    {dateTime(
                      selectedPayment
                        .last_refund
                        ?.refunded_at
                    )}
                  </p>

                </div>

              )}


              <div className="mt-6 flex flex-wrap gap-2">

                {selectedPayment.status
                  === "approved" && (

                  <button
                    type="button"
                    onClick={() =>
                      openPremiumReceipt(
                        selectedPayment
                      )
                    }
                    className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
                  >
                    Comprovante
                  </button>

                )}


                {selectedPayment.status
                  === "approved"
                  && selectedPayment.order_id && (

                  <button
                    type="button"
                    onClick={() => {
                      setRefundPayment(
                        selectedPayment
                      );

                      setAdminPassword("");
                      setRefundReason("");
                      setActionError("");
                    }}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700"
                  >
                    Estornar venda
                  </button>

                )}


                {[
                  "created",
                  "pending",
                ].includes(
                  selectedPayment.status
                )
                  && selectedPayment.order_id && (

                  <button
                    type="button"
                    onClick={() => {
                      setCancelPayment(
                        selectedPayment
                      );

                      setCancelReason("");
                      setActionError("");
                    }}
                    className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-black text-amber-700"
                  >
                    Cancelar cobrança
                  </button>

                )}

              </div>

            </div>

          </div>

        </div>,

        document.body

      )}


      {receiptPayment && (

        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">

          <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-[30px] bg-white p-6 shadow-2xl sm:p-8">

            <div className="flex items-center justify-between gap-5">

              <div className="flex items-center gap-3">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-xl font-black text-white">
                  P
                </div>

                <div>

                  <p className="text-sm font-black text-slate-950">
                    PORTABILIDADE
                  </p>

                  <p className="text-xs font-black tracking-[0.3em] text-violet-600">
                    PRO
                  </p>

                </div>

              </div>


              <div className="text-right">

                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Processado por
                </p>

                <p className="text-lg font-black text-sky-500">
                  Mercado Pago
                </p>

              </div>

            </div>


            <div className="my-7 border-t border-slate-100" />


            <div className="text-center">

              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                Comprovante de Pagamento
              </p>


              <div className="mx-auto mt-5 w-fit rounded-full bg-emerald-50 px-5 py-2 text-sm font-black text-emerald-700">
                ✓ PAGAMENTO APROVADO
              </div>


              <p className="mt-5 text-4xl font-black tracking-tight text-emerald-700">
                {money(
                  receiptPayment.amount
                )}
              </p>

            </div>


            <div className="mt-8">

              <DetailRow label="Cliente">
                {receiptPayment.customer_name}
              </DetailRow>


              <DetailRow label="Data">
                {dateTime(
                  receiptPayment.paid_at
                  || receiptPayment.created_at
                )}
              </DetailRow>


              <DetailRow label="Order ID">
                {receiptPayment.order_id}
              </DetailRow>


              <DetailRow label="Referência">
                {receiptPayment.external_reference}
              </DetailRow>


              <DetailRow label="Forma de pagamento">
                Cartão de crédito
              </DetailRow>


              <DetailRow label="Bandeira">
                <CardBrand
                  brand={
                    receiptPayment.card_brand
                    || receiptPayment.payment_method_id
                  }
                />
              </DetailRow>


              <DetailRow label="Parcelamento">
                {Math.max(
                  1,
                  Number(
                    receiptPayment.installments
                    || 1
                  )
                )}
                x de{" "}
                {money(
                  Number(
                    receiptPayment.amount
                    || 0
                  )
                  /
                  Math.max(
                    1,
                    Number(
                      receiptPayment.installments
                      || 1
                    )
                  )
                )}
              </DetailRow>

            </div>


            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">

              <p className="text-xs font-bold text-slate-500">
                Nome que normalmente aparecerá na fatura
              </p>

              <p className="mt-1 text-lg font-black tracking-wide text-blue-700">
                {receiptPayment.statement_descriptor
                  || "PORTAPRO"}
              </p>

            </div>


            <div className="mt-7 flex flex-col gap-3 sm:flex-row">

              <button
                type="button"
                onClick={() =>
                  printReceipt(
                    receiptPayment
                  )
                }
                className="flex-1 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700"
              >
                Imprimir / Salvar PDF
              </button>


              <button
                type="button"
                onClick={() =>
                  setReceiptPayment(
                    null
                  )
                }
                className="rounded-xl px-4 py-3 text-sm font-bold text-slate-500"
              >
                Fechar
              </button>

            </div>

          </div>

        </div>

      )}


      {refundPayment && (

        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl">
              🔐
            </div>


            <h3 className="mt-5 text-2xl font-black text-slate-950">
              Confirmar estorno
            </h3>


            <p className="mt-2 text-sm leading-6 text-slate-500">

              O valor de{" "}

              <strong>
                {money(
                  refundPayment.amount
                )}
              </strong>

              {" "}será devolvido ao cliente.

            </p>


            <label className="mt-5 block text-sm font-bold text-slate-700">
              Motivo do estorno
            </label>


            <textarea
              value={refundReason}
              onChange={(event) =>
                setRefundReason(
                  event.target.value
                )
              }
              rows={3}
              placeholder="Informe o motivo..."
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
            />


            <label className="mt-4 block text-sm font-bold text-slate-700">
              Senha do administrador
            </label>


            <input
              type="password"
              value={adminPassword}
              onChange={(event) =>
                setAdminPassword(
                  event.target.value
                )
              }
              autoComplete="current-password"
              placeholder="Digite sua senha atual"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50"
            />


            <p className="mt-3 text-xs leading-5 text-slate-400">
              A senha é utilizada somente
              para confirmar sua identidade
              e não é armazenada.
            </p>


            <div className="mt-6 flex gap-3">

              <button
                type="button"
                onClick={() => {
                  setRefundPayment(null);
                  setAdminPassword("");
                  setRefundReason("");
                }}
                disabled={actionLoading}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600"
              >
                Voltar
              </button>


              <button
                type="button"
                onClick={requestRefund}
                disabled={
                  actionLoading
                  || !adminPassword
                }
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading
                  ? "Estornando..."
                  : "Confirmar estorno"}
              </button>

            </div>

          </div>

        </div>

      )}


      {cancelPayment && (

        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">

            <h3 className="text-2xl font-black text-slate-950">
              Cancelar cobrança
            </h3>


            <p className="mt-2 text-sm leading-6 text-slate-500">
              A cobrança será cancelada
              no Mercado Pago quando
              o status permitir.
            </p>


            <label className="mt-5 block text-sm font-bold text-slate-700">
              Motivo
            </label>


            <textarea
              value={cancelReason}
              onChange={(event) =>
                setCancelReason(
                  event.target.value
                )
              }
              rows={3}
              placeholder="Informe o motivo..."
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-3 outline-none"
            />


            <div className="mt-6 flex gap-3">

              <button
                type="button"
                onClick={() =>
                  setCancelPayment(
                    null
                  )
                }
                disabled={actionLoading}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-600"
              >
                Voltar
              </button>


              <button
                type="button"
                onClick={requestCancel}
                disabled={actionLoading}
                className="flex-1 rounded-xl bg-amber-500 px-4 py-3 font-black text-white disabled:opacity-50"
              >
                {actionLoading
                  ? "Cancelando..."
                  : "Confirmar"}
              </button>

            </div>

          </div>

        </div>

      )}

    </section>
  );
}
