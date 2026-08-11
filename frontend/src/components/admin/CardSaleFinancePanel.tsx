"use client";

import {
  useMemo,
  useState,
} from "react";

import { api } from "@/utils/api";

type FinanceStatus =
  | "documentation_pending"
  | "documentation_complete"
  | "authorization_pending"
  | "authorized"
  | "awaiting_payment"
  | "approved"
  | "rejected"
  | "cancelled"
  | "refunded"
  | string;

type CardSaleRefundInfo = {
  refund_id?: string | number | null;
  payment_id?: string | number | null;
  amount?: number | null;
  status?: string | null;
  date_created?: string | null;
  reason?: string | null;
  refunded_by_user_id?: number | null;
  refunded_by_name?: string | null;
  refunded_at?: string | null;
  idempotency_key?: string | null;
};


type CardSaleFinanceItem = {
  sale_id: number;
  description?: string | null;
  finance_status: FinanceStatus;
  sale_status?: string | null;

  customer?: {
    name?: string | null;
    cpf_masked?: string | null;
    phone?: string | null;
    email?: string | null;
  };

  pricing?: {
    reference_amount?: number | null;
    customer_total?: number | null;
    installments?: number | null;
    installment_value?: number | null;
    simulation_type?: string | null;
    commission_table?: number | null;
    payment_channel?: string | null;
    installment_mode?: string | null;
  };

  documents?: {
    received?: number;
    total?: number;
    document_front?: boolean;
    document_back?: boolean;
    selfie?: boolean;
    completed_at?: string | null;
  };

  authorization?: {
    id?: number;
    status?: string | null;
    url?: string | null;
    expires_at?: string | null;
    authorized_at?: string | null;
    signer_name?: string | null;
    has_signature?: boolean;
  } | null;

  payment?: {
    id?: number;
    status?: string | null;
    status_detail?: string | null;
    mercado_pago_payment_id?: string | null;
    external_reference?: string | null;
    checkout_url?: string | null;
    amount?: number | null;
    payment_method_id?: string | null;
    payment_type_id?: string | null;
    transaction_id?: string | null;
    order_id?: string | null;
    card_brand?: string | null;
    installments?: number | null;
    paid_at?: string | null;
    last_refund?: CardSaleRefundInfo | null;
  } | null;

  receipt_available?: boolean;

  receipt?: {
    receipt_number?: string | null;
    sale_id?: number;
    payment_id?: number;
    mercado_pago_payment_id?: string | null;
    transaction_id?: string | null;
    order_id?: string | null;
    external_reference?: string | null;
    customer_name?: string | null;
    customer_cpf_masked?: string | null;
    amount?: number | null;
    installments?: number | null;
    installment_value?: number | null;
    payment_method_id?: string | null;
    payment_type_id?: string | null;
    card_brand?: string | null;
    statement_descriptor?: string | null;
    paid_at?: string | null;
    status?: string | null;
  } | null;

  created_at?: string | null;
  updated_at?: string | null;
};

type Props = {
  sales?: CardSaleFinanceItem[];
  stats?: Record<string, number>;
  onRefresh?: () => void | Promise<void>;
};

const STATUS: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  documentation_pending: {
    label: "Em documentação",
    className:
      "bg-amber-100 text-amber-800",
  },

  documentation_complete: {
    label: "Documentação completa",
    className:
      "bg-blue-100 text-blue-800",
  },

  authorization_pending: {
    label: "Aguardando autorização",
    className:
      "bg-violet-100 text-violet-800",
  },

  authorized: {
    label: "Autorizado",
    className:
      "bg-indigo-100 text-indigo-800",
  },

  awaiting_payment: {
    label: "Aguardando pagamento",
    className:
      "bg-cyan-100 text-cyan-800",
  },

  approved: {
    label: "Aprovada",
    className:
      "bg-emerald-100 text-emerald-800",
  },

  rejected: {
    label: "Recusada",
    className:
      "bg-red-100 text-red-800",
  },

  cancelled: {
    label: "Cancelada",
    className:
      "bg-slate-200 text-slate-700",
  },

  refunded: {
    label: "Estornada",
    className:
      "bg-purple-100 text-purple-800",
  },
};

const money = (
  value?: number | null
) =>
  new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(
    Number(value || 0)
  );

const dateTime = (
  value?: string | null
) => {
  if (!value) return "-";

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return date.toLocaleString(
    "pt-BR"
  );
};

const escapeHtml = (
  value: unknown
) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");


function StatusBadge({
  status,
}: {
  status?: string | null;
}) {

  const config =
    STATUS[status || ""] || {
      label:
        status ||
        "Desconhecido",
      className:
        "bg-slate-100 text-slate-700",
    };

  return (
    <span
      className={
        "inline-flex rounded-full " +
        "px-3 py-1 text-[10px] " +
        "font-black uppercase " +
        config.className
      }
    >
      {config.label}
    </span>
  );
}


export default function CardSaleFinancePanel({
  sales = [],
  stats = {},
  onRefresh,
}: Props) {

  const [filter, setFilter] =
    useState("all");

  const [copied, setCopied] =
    useState("");

  // CARD_SALE_FINANCE_DOCUMENTS_V1
  const [
    documentSale,
    setDocumentSale,
  ] = useState<
    CardSaleFinanceItem | null
  >(null);


  // CARD_SALE_FINANCE_ACTIONS_V1
  const [
    financialAction,
    setFinancialAction,
  ] = useState<{
    mode: "cancel" | "refund";
    sale: CardSaleFinanceItem;
  } | null>(null);

  const [
    actionPassword,
    setActionPassword,
  ] = useState("");

  const [
    actionReason,
    setActionReason,
  ] = useState("");

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const [
    actionError,
    setActionError,
  ] = useState("");

  const filtered =
    useMemo(() => {

      if (filter === "all") {
        return sales;
      }

      return sales.filter(
        (sale) =>
          sale.finance_status
          === filter
      );

    }, [
      sales,
      filter,
    ]);


  const counts =
    useMemo(() => {

      const result:
        Record<string, number> = {
          total: sales.length,
        };

      for (const sale of sales) {
        const status =
          sale.finance_status
          || "unknown";

        result[status] =
          (result[status] || 0)
          + 1;
      }

      return result;

    }, [sales]);


  const copy = async (
    value?: string | null
  ) => {

    if (!value) return;

    await navigator
      .clipboard
      .writeText(value);

    setCopied(value);

    window.setTimeout(
      () => setCopied(""),
      1800
    );
  };


  const beginFinancialAction =
    (
      sale: CardSaleFinanceItem,
      mode: "cancel" | "refund"
    ) => {

      setFinancialAction({
        sale,
        mode,
      });

      setActionPassword("");
      setActionReason("");
      setActionError("");
    };


  const closeFinancialAction =
    () => {

      if (actionLoading) {
        return;
      }

      setFinancialAction(null);
      setActionPassword("");
      setActionReason("");
      setActionError("");
    };


  const submitFinancialAction =
    async () => {

      if (
        !financialAction
        || actionLoading
      ) {
        return;
      }

      if (
        financialAction.mode
          === "refund"
        && !actionPassword.trim()
      ) {
        setActionError(
          "Informe sua senha de administrador."
        );

        return;
      }

      setActionLoading(true);
      setActionError("");

      try {

        const saleId =
          financialAction.sale.sale_id;

        if (
          financialAction.mode
          === "refund"
        ) {

          await api.post(
            `/card-sales/admin/${saleId}/refund`,
            {
              password:
                actionPassword,
              reason:
                actionReason.trim()
                || null,
            },
            {
              timeout: 45000,
            }
          );

        }
        else {

          await api.post(
            `/card-sales/admin/${saleId}/cancel`,
            {
              reason:
                actionReason.trim()
                || null,
            },
            {
              timeout: 45000,
            }
          );
        }

        setFinancialAction(null);
        setActionPassword("");
        setActionReason("");
        setActionError("");

        await onRefresh?.();

      }
      catch (error) {

        setActionError(
          error instanceof Error
            ? error.message
            : (
                "Não foi possível concluir " +
                "a operação."
              )
        );

      }
      finally {

        setActionLoading(false);
      }
    };


  const openProtectedFile =
    async (
      path: string
    ) => {

      const popup =
        window.open(
          "about:blank",
          "_blank"
        );

      if (popup) {
        popup.opener = null;

        popup.document.write(
          "<p style='font-family:Arial;padding:24px'>" +
          "Carregando documento..." +
          "</p>"
        );
      }

      try {

        const token =
          localStorage.getItem(
            "token"
          );

        const response =
          await fetch(
            `/api${path}`,
            {
              headers: {
                ...(token
                  ? {
                      Authorization:
                        `Bearer ${token}`,
                    }
                  : {}),
              },
              cache: "no-store",
            }
          );

        if (
          response.status === 401
        ) {

          popup?.close();

          localStorage.removeItem(
            "token"
          );

          localStorage.removeItem(
            "user"
          );

          window.location.href =
            "/login";

          return;
        }

        if (!response.ok) {

          let detail = "";

          try {
            detail =
              await response.text();
          }
          catch {
            detail = "";
          }

          throw new Error(
            detail
            || "Não foi possível abrir o documento."
          );
        }

        const blob =
          await response.blob();

        const url =
          URL.createObjectURL(
            blob
          );

        if (popup) {
          popup.location.href =
            url;
        }
        else {

          const anchor =
            document.createElement(
              "a"
            );

          anchor.href = url;
          anchor.target =
            "_blank";
          anchor.rel =
            "noopener noreferrer";

          document.body.appendChild(
            anchor
          );

          anchor.click();
          anchor.remove();
        }

        window.setTimeout(
          () => {
            URL.revokeObjectURL(
              url
            );
          },
          120000
        );

      }
      catch (error) {

        popup?.close();

        window.alert(
          error instanceof Error
            ? error.message
            : (
                "Não foi possível " +
                "abrir o documento."
              )
        );
      }
    };


  const openReceipt = (
    sale: CardSaleFinanceItem
  ) => {

    const receipt =
      sale.receipt;

    if (
      !sale.receipt_available
      || !receipt
    ) {
      return;
    }

    const receiptNumber =
      escapeHtml(
        receipt.receipt_number
      );

    const customer =
      escapeHtml(
        receipt.customer_name
      );

    const cpf =
      escapeHtml(
        receipt
          .customer_cpf_masked
      );

    const mpId =
      escapeHtml(
        receipt
          .mercado_pago_payment_id
      );

    const transaction =
      escapeHtml(
        receipt.transaction_id
        || receipt.order_id
        || "-"
      );

    const reference =
      escapeHtml(
        receipt.external_reference
        || "-"
      );

    const paymentMethod =
      escapeHtml(
        receipt.payment_method_id
        || receipt.payment_type_id
        || "-"
      );

    const brand =
      escapeHtml(
        receipt.card_brand
        || "-"
      );

    const paidAt =
      escapeHtml(
        dateTime(
          receipt.paid_at
        )
      );

    const installments =
      Number(
        receipt.installments
        || sale.pricing
          ?.installments
        || 1
      );

    const installmentValue =
      receipt.installment_value
      ?? sale.pricing
        ?.installment_value
      ?? null;

    const popup =
      window.open(
        "",
        "_blank",
        "width=850,height=900"
      );

    if (!popup) {
      return;
    }

    popup.document.write(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Comprovante ${receiptNumber}</title>

<style>
  * {
    box-sizing: border-box;
  }

  body {
    font-family:
      Arial,
      Helvetica,
      sans-serif;
    margin: 0;
    background: #f8fafc;
    color: #0f172a;
  }

  .page {
    width: 760px;
    max-width: calc(100% - 32px);
    margin: 30px auto;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    padding: 36px;
  }

  .brand {
    font-size: 24px;
    font-weight: 900;
  }

  .title {
    margin-top: 5px;
    color: #475569;
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08em;
  }

  .approved {
    display: inline-block;
    margin-top: 22px;
    background: #dcfce7;
    color: #166534;
    font-size: 12px;
    font-weight: 900;
    padding: 8px 14px;
    border-radius: 999px;
  }

  .section {
    margin-top: 28px;
    border-top: 1px solid #e2e8f0;
    padding-top: 18px;
  }

  .row {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    padding: 7px 0;
    font-size: 14px;
  }

  .label {
    color: #64748b;
  }

  .value {
    text-align: right;
    font-weight: 700;
  }

  .amount {
    font-size: 26px;
    font-weight: 900;
  }

  .footer {
    margin-top: 30px;
    color: #94a3b8;
    font-size: 11px;
    line-height: 1.6;
  }

  .actions {
    margin: 20px auto;
    width: 760px;
    max-width: calc(100% - 32px);
    display: flex;
    justify-content: flex-end;
  }

  button {
    border: 0;
    background: #0f172a;
    color: white;
    padding: 11px 18px;
    border-radius: 10px;
    font-weight: 700;
    cursor: pointer;
  }

  @media print {
    body {
      background: white;
    }

    .page {
      border: 0;
      margin: 0 auto;
      width: 100%;
      max-width: none;
    }

    .actions {
      display: none;
    }
  }
</style>
</head>

<body>

<div class="actions">
  <button
    onclick="window.print()"
  >
    Imprimir / Salvar PDF
  </button>
</div>

<div class="page">

  <div class="brand">
    PORTABILIDADE PRO
  </div>

  <div class="title">
    Comprovante de pagamento
  </div>

  <div class="approved">
    PAGAMENTO APROVADO
  </div>

  <div class="section">

    <div class="row">
      <span class="label">
        Comprovante
      </span>

      <span class="value">
        ${receiptNumber}
      </span>
    </div>

    <div class="row">
      <span class="label">
        Venda
      </span>

      <span class="value">
        #${escapeHtml(
          receipt.sale_id
        )}
      </span>
    </div>

    <div class="row">
      <span class="label">
        Cobrança
      </span>

      <span class="value">
        #${escapeHtml(
          receipt.payment_id
        )}
      </span>
    </div>

  </div>


  <div class="section">

    <div class="row">
      <span class="label">
        Cliente
      </span>

      <span class="value">
        ${customer}
      </span>
    </div>

    <div class="row">
      <span class="label">
        CPF
      </span>

      <span class="value">
        ${cpf}
      </span>
    </div>

  </div>


  <div class="section">

    <div class="row">
      <span class="label">
        Valor pago
      </span>

      <span class="value amount">
        ${escapeHtml(
          money(
            receipt.amount
          )
        )}
      </span>
    </div>

    <div class="row">
      <span class="label">
        Parcelamento
      </span>

      <span class="value">
        ${escapeHtml(
          installments
        )}x
        ${
          installmentValue
            ? escapeHtml(
                money(
                  installmentValue
                )
              )
            : ""
        }
      </span>
    </div>

    <div class="row">
      <span class="label">
        Forma
      </span>

      <span class="value">
        ${paymentMethod}
      </span>
    </div>

    <div class="row">
      <span class="label">
        Bandeira
      </span>

      <span class="value">
        ${brand}
      </span>
    </div>

  </div>


  <div class="section">

    <div class="row">
      <span class="label">
        ID Mercado Pago
      </span>

      <span class="value">
        ${mpId || "-"}
      </span>
    </div>

    <div class="row">
      <span class="label">
        Transação
      </span>

      <span class="value">
        ${transaction}
      </span>
    </div>

    <div class="row">
      <span class="label">
        Referência
      </span>

      <span class="value">
        ${reference}
      </span>
    </div>

    <div class="row">
      <span class="label">
        Data da aprovação
      </span>

      <span class="value">
        ${paidAt}
      </span>
    </div>

  </div>


  <div class="footer">
    Este comprovante foi emitido
    pelo Portabilidade PRO a partir
    dos dados registrados para a
    transação de pagamento aprovada.
  </div>

</div>

</body>
</html>
    `);

    popup.document.close();
  };


  return (
    <section
      className="
        mb-8 overflow-hidden
        rounded-3xl
        border border-slate-200
        bg-white shadow-sm
      "
    >

      <div
        className="
          border-b border-slate-200
          bg-gradient-to-r
          from-slate-950
          via-slate-900
          to-indigo-950
          p-6 text-white
        "
      >
        <div
          className="
            flex flex-col gap-4
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >

          <div>
            <p
              className="
                text-xs font-black
                uppercase
                tracking-[0.2em]
                text-indigo-300
              "
            >
              Cartão de crédito
            </p>

            <h2
              className="
                mt-2 text-2xl
                font-black
              "
            >
              Vendas no Cartão
            </h2>

            <p
              className="
                mt-2 text-sm
                text-slate-300
              "
            >
              Acompanhamento completo
              da proposta, autorização
              e pagamento.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void onRefresh?.()
            }
            className="
              rounded-xl
              border border-white/20
              bg-white/10
              px-4 py-2
              text-sm font-bold
              hover:bg-white/20
            "
          >
            Atualizar
          </button>

        </div>
      </div>


      <div
        className="
          grid gap-3 p-5
          sm:grid-cols-2
          xl:grid-cols-7
        "
      >

        {[
          [
            "Todas",
            counts.total,
            "all",
          ],
          [
            "Documentação",
            counts
              .documentation_pending
              || 0,
            "documentation_pending",
          ],
          [
            "Autorização",
            counts
              .authorization_pending
              || 0,
            "authorization_pending",
          ],
          [
            "Pagamento",
            counts
              .awaiting_payment
              || 0,
            "awaiting_payment",
          ],
          [
            "Aprovadas",
            counts.approved || 0,
            "approved",
          ],
          [
            "Canceladas",
            counts.cancelled || 0,
            "cancelled",
          ],
          [
            "Estornadas",
            counts.refunded || 0,
            "refunded",
          ],
        ].map(
          ([
            label,
            value,
            valueFilter,
          ]) => (
            <button
              key={String(
                valueFilter
              )}
              type="button"
              onClick={() =>
                setFilter(
                  String(
                    valueFilter
                  )
                )
              }
              className={
                "rounded-2xl border " +
                "p-4 text-left " +
                "transition " +
                (
                  filter ===
                  valueFilter
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                )
              }
            >
              <div
                className="
                  text-xs font-bold
                  uppercase
                  text-slate-500
                "
              >
                {label}
              </div>

              <div
                className="
                  mt-2 text-2xl
                  font-black
                  text-slate-950
                "
              >
                {value}
              </div>
            </button>
          )
        )}

      </div>


      <div
        className="
          overflow-x-auto
          border-t
          border-slate-200
        "
      >

        <table
          className="
            min-w-[1200px]
            w-full
            text-left
          "
        >

          <thead
            className="
              bg-slate-50
              text-xs uppercase
              text-slate-500
            "
          >
            <tr>
              <th className="px-5 py-4">
                Venda / Cliente
              </th>

              <th className="px-5 py-4">
                Valores
              </th>

              <th className="px-5 py-4">
                Parcelamento
              </th>

              <th className="px-5 py-4">
                Documentos
              </th>

              <th className="px-5 py-4">
                Status
              </th>

              <th className="px-5 py-4">
                Data
              </th>

              <th className="px-5 py-4">
                Ações
              </th>
            </tr>
          </thead>


          <tbody
            className="
              divide-y
              divide-slate-100
            "
          >

            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="
                    px-5 py-10
                    text-center
                    text-sm
                    text-slate-500
                  "
                >
                  Nenhuma venda encontrada.
                </td>
              </tr>
            ) : (
              filtered.map(
                (sale) => {

                  const reference =
                    sale.pricing
                      ?.reference_amount;

                  const total =
                    sale.pricing
                      ?.customer_total;

                  const installments =
                    sale.pricing
                      ?.installments
                    || 1;

                  const installmentValue =
                    sale.pricing
                      ?.installment_value;

                  return (
                    <tr
                      key={
                        sale.sale_id
                      }
                      className="
                        align-top
                        hover:bg-slate-50
                      "
                    >

                      <td className="px-5 py-4">

                        <div
                          className="
                            text-xs
                            font-black
                            text-indigo-600
                          "
                        >
                          Venda #
                          {sale.sale_id}
                        </div>

                        <div
                          className="
                            mt-1
                            font-bold
                            text-slate-950
                          "
                        >
                          {sale.customer
                            ?.name
                            || "-"}
                        </div>

                        <div
                          className="
                            mt-1 text-xs
                            text-slate-500
                          "
                        >
                          {sale.customer
                            ?.cpf_masked
                            || "-"}
                        </div>

                        <div
                          className="
                            mt-1 text-xs
                            text-slate-400
                          "
                        >
                          {sale.description
                            || "-"}
                        </div>

                      </td>


                      <td className="px-5 py-4">

                        <div
                          className="
                            text-xs
                            text-slate-500
                          "
                        >
                          Base
                        </div>

                        <div
                          className="
                            font-bold
                            text-slate-800
                          "
                        >
                          {money(
                            reference
                          )}
                        </div>

                        <div
                          className="
                            mt-2 text-xs
                            text-slate-500
                          "
                        >
                          Cliente
                        </div>

                        <div
                          className="
                            font-black
                            text-slate-950
                          "
                        >
                          {money(total)}
                        </div>

                      </td>


                      <td className="px-5 py-4">

                        <div
                          className="
                            font-bold
                            text-slate-900
                          "
                        >
                          {installments}x
                          {
                            installmentValue
                              ? ` ${money(
                                  installmentValue
                                )}`
                              : ""
                          }
                        </div>

                        <div
                          className="
                            mt-1 text-xs
                            text-slate-500
                          "
                        >
                          Tabela{" "}
                          {sale.pricing
                            ?.commission_table
                            || "-"}
                        </div>

                        <div
                          className="
                            mt-1 text-xs
                            text-slate-500
                          "
                        >
                          {sale.pricing
                            ?.simulation_type
                            === "charge"
                            ? "Cobrar"
                            : "Receber"}
                        </div>

                      </td>


                      <td className="px-5 py-4">

                        <div
                          className="
                            font-bold
                            text-slate-800
                          "
                        >
                          {sale.documents
                            ?.received
                            || 0}
                          /
                          {sale.documents
                            ?.total
                            || 3}
                        </div>

                        <div
                          className="
                            mt-1 text-xs
                            text-slate-500
                          "
                        >
                          Frente{" "}
                          {sale.documents
                            ?.document_front
                            ? "?"
                            : "?"}
                          {" ? "}
                          Verso{" "}
                          {sale.documents
                            ?.document_back
                            ? "?"
                            : "?"}
                          {" ? "}
                          Selfie{" "}
                          {sale.documents
                            ?.selfie
                            ? "?"
                            : "?"}
                        </div>

                      </td>


                      <td className="px-5 py-4">
                        <StatusBadge
                          status={
                            sale.finance_status
                          }
                        />

                        {sale.payment
                          ?.mercado_pago_payment_id && (
                          <div
                            className="
                              mt-2 text-[11px]
                              text-slate-500
                            "
                          >
                            MP:{" "}
                            {
                              sale.payment
                                .mercado_pago_payment_id
                            }
                          </div>
                        )}

                      </td>


                      <td
                        className="
                          px-5 py-4
                          text-sm
                          text-slate-600
                        "
                      >
                        {dateTime(
                          sale.created_at
                        )}

                        {sale.payment
                          ?.paid_at && (
                          <div
                            className="
                              mt-2 text-xs
                              font-bold
                              text-emerald-700
                            "
                          >
                            Pago:{" "}
                            {dateTime(
                              sale.payment
                                .paid_at
                            )}
                          </div>
                        )}
                      </td>


                      <td className="px-5 py-4">

                        <div
                          className="
                            flex max-w-[260px]
                            flex-wrap gap-2
                          "
                        >

                          {sale.authorization
                            ?.url && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  void copy(
                                    sale
                                      .authorization
                                      ?.url
                                  )
                                }
                                className="
                                  rounded-lg
                                  border
                                  border-violet-200
                                  px-3 py-2
                                  text-xs
                                  font-bold
                                  text-violet-700
                                  hover:bg-violet-50
                                "
                              >
                                {copied ===
                                sale
                                  .authorization
                                  ?.url
                                  ? "? Copiado"
                                  : "Copiar autorização"}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  window.open(
                                    sale
                                      .authorization
                                      ?.url
                                      || "",
                                    "_blank",
                                    "noopener,noreferrer"
                                  )
                                }
                                className="
                                  rounded-lg
                                  border
                                  border-violet-200
                                  px-3 py-2
                                  text-xs
                                  font-bold
                                  text-violet-700
                                  hover:bg-violet-50
                                "
                              >
                                Abrir autorização
                              </button>
                            </>
                          )}


                          {/* CARD_SALE_HIDE_CLOSED_CHECKOUT_V1 */}
                          {sale.payment
                            ?.checkout_url
                            && ![
                              "approved",
                              "refunded",
                              "cancelled",
                            ].includes(
                              sale.finance_status
                            ) && (
                            <button
                              type="button"
                              onClick={() =>
                                window.open(
                                  sale.payment
                                    ?.checkout_url
                                    || "",
                                  "_blank",
                                  "noopener,noreferrer"
                                )
                              }
                              className="
                                rounded-lg
                                border
                                border-blue-200
                                px-3 py-2
                                text-xs
                                font-bold
                                text-blue-700
                                hover:bg-blue-50
                              "
                            >
                              Abrir pagamento
                            </button>
                          )}


                          {sale.receipt_available &&
                            sale.receipt && (
                            <button
                              type="button"
                              onClick={() =>
                                openReceipt(
                                  sale
                                )
                              }
                              className="
                                rounded-lg
                                bg-emerald-600
                                px-3 py-2
                                text-xs
                                font-black
                                text-white
                                hover:bg-emerald-700
                              "
                            >
                              Comprovante
                            </button>
                          )}


                          <button
                            type="button"
                            onClick={() =>
                              setDocumentSale(
                                sale
                              )
                            }
                            className="
                              rounded-lg
                              border
                              border-slate-300
                              px-3 py-2
                              text-xs
                              font-black
                              text-slate-700
                              hover:bg-slate-100
                            "
                          >
                            Documentação
                          </button>


                          {![
                            "approved",
                            "refunded",
                            "cancelled",
                          ].includes(
                            sale.finance_status
                          ) && (
                            <button
                              type="button"
                              onClick={() =>
                                beginFinancialAction(
                                  sale,
                                  "cancel"
                                )
                              }
                              className="
                                rounded-lg
                                border
                                border-red-200
                                px-3 py-2
                                text-xs
                                font-black
                                text-red-700
                                hover:bg-red-50
                              "
                            >
                              Cancelar venda
                            </button>
                          )}


                          {sale.finance_status
                            === "approved"
                            && sale.payment
                              ?.status
                              === "approved" && (
                            <button
                              type="button"
                              onClick={() =>
                                beginFinancialAction(
                                  sale,
                                  "refund"
                                )
                              }
                              className="
                                rounded-lg
                                bg-red-600
                                px-3 py-2
                                text-xs
                                font-black
                                text-white
                                hover:bg-red-700
                              "
                            >
                              Estornar pagamento
                            </button>
                          )}


                          {sale.finance_status
                            === "refunded"
                            && sale.payment
                              ?.last_refund && (
                            <div
                              className="
                                w-full
                                rounded-xl
                                border
                                border-purple-200
                                bg-purple-50
                                p-3
                                text-[11px]
                                text-purple-900
                              "
                            >
                              <div
                                className="
                                  font-black
                                  uppercase
                                "
                              >
                                Dados do estorno
                              </div>

                              <div className="mt-1">
                                Valor:{" "}
                                {money(
                                  sale.payment
                                    .last_refund
                                    ?.amount
                                )}
                              </div>

                              <div>
                                Data:{" "}
                                {dateTime(
                                  sale.payment
                                    .last_refund
                                    ?.refunded_at
                                  || sale.payment
                                    .last_refund
                                    ?.date_created
                                )}
                              </div>

                              {sale.payment
                                .last_refund
                                ?.reason && (
                                <div>
                                  Motivo:{" "}
                                  {
                                    sale.payment
                                      .last_refund
                                      ?.reason
                                  }
                                </div>
                              )}
                            </div>
                          )}


                          <a
                            href="/admin/cartao-credito"
                            className="
                              rounded-lg
                              border
                              border-slate-200
                              px-3 py-2
                              text-xs
                              font-bold
                              text-slate-700
                              hover:bg-slate-50
                            "
                          >
                            Ver venda
                          </a>

                        </div>

                      </td>

                    </tr>
                  );
                }
              )
            )}

          </tbody>
        </table>

      </div>


      <div
        className="
          border-t border-slate-200
          bg-slate-50
          px-5 py-3
          text-xs text-slate-500
        "
      >
        Total carregado:{" "}
        {stats.total
          ?? sales.length}
      </div>


      {financialAction && (
        <div
          className="
            fixed inset-0 z-[110]
            flex items-center
            justify-center
            bg-slate-950/70
            p-4 backdrop-blur-sm
          "
          onClick={
            closeFinancialAction
          }
        >

          <div
            className="
              w-full max-w-lg
              overflow-hidden
              rounded-3xl
              bg-white
              shadow-2xl
            "
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div
              className="
                bg-slate-950
                p-6 text-white
              "
            >
              <p
                className="
                  text-xs font-black
                  uppercase
                  tracking-[0.18em]
                  text-red-300
                "
              >
                Venda #
                {
                  financialAction
                    .sale.sale_id
                }
              </p>

              <h3
                className="
                  mt-2 text-xl
                  font-black
                "
              >
                {financialAction.mode
                  === "refund"
                  ? "Estornar pagamento"
                  : "Cancelar venda"}
              </h3>

              <p
                className="
                  mt-2 text-sm
                  text-slate-300
                "
              >
                {
                  financialAction
                    .sale.customer
                    ?.name
                  || "-"
                }
              </p>
            </div>


            <div
              className="
                space-y-5 p-6
              "
            >

              {financialAction.mode
                === "refund" ? (
                <div
                  className="
                    rounded-2xl
                    border
                    border-red-200
                    bg-red-50
                    p-4
                    text-sm
                    text-red-900
                  "
                >
                  O pagamento já foi
                  aprovado. Esta operação
                  solicitar? o estorno
                  integral ao Mercado Pago.

                  <div
                    className="
                      mt-2 font-black
                    "
                  >
                    Valor:{" "}
                    {money(
                      financialAction
                        .sale.payment
                        ?.amount
                      ?? financialAction
                        .sale.pricing
                        ?.customer_total
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className="
                    rounded-2xl
                    border
                    border-amber-200
                    bg-amber-50
                    p-4
                    text-sm
                    text-amber-900
                  "
                >
                  A venda ser? marcada
                  como cancelada e a
                  cobrança pendente ser?
                  cancelada quando existir.
                </div>
              )}


              <div>
                <label
                  className="
                    mb-2 block
                    text-sm font-black
                    text-slate-800
                  "
                >
                  Motivo
                </label>

                <textarea
                  value={actionReason}
                  onChange={(event) =>
                    setActionReason(
                      event.target.value
                    )
                  }
                  rows={3}
                  maxLength={500}
                  placeholder={
                    financialAction.mode
                      === "refund"
                      ? "Motivo do estorno"
                      : "Motivo do cancelamento"
                  }
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-300
                    px-4 py-3
                    text-sm
                    outline-none
                    focus:border-indigo-500
                  "
                />
              </div>


              {financialAction.mode
                === "refund" && (
                <div>
                  <label
                    className="
                      mb-2 block
                      text-sm font-black
                      text-slate-800
                    "
                  >
                    Confirme sua senha
                    de administrador
                  </label>

                  <input
                    type="password"
                    value={
                      actionPassword
                    }
                    onChange={(event) =>
                      setActionPassword(
                        event.target.value
                      )
                    }
                    autoComplete=
                      "current-password"
                    className="
                      w-full
                      rounded-xl
                      border
                      border-slate-300
                      px-4 py-3
                      text-sm
                      outline-none
                      focus:border-red-500
                    "
                  />

                  <p
                    className="
                      mt-2 text-xs
                      text-slate-500
                    "
                  >
                    A senha ? usada apenas
                    para confirmar esta
                    operação e não é salva.
                  </p>
                </div>
              )}


              {actionError && (
                <div
                  className="
                    rounded-xl
                    border
                    border-red-200
                    bg-red-50
                    p-3
                    text-sm font-bold
                    text-red-700
                  "
                >
                  {actionError}
                </div>
              )}


              <div
                className="
                  flex flex-col-reverse
                  gap-3
                  sm:flex-row
                  sm:justify-end
                "
              >

                <button
                  type="button"
                  disabled={
                    actionLoading
                  }
                  onClick={
                    closeFinancialAction
                  }
                  className="
                    rounded-xl
                    border
                    border-slate-300
                    px-5 py-3
                    text-sm font-black
                    text-slate-700
                    disabled:opacity-50
                  "
                >
                  Voltar
                </button>

                <button
                  type="button"
                  disabled={
                    actionLoading
                  }
                  onClick={() =>
                    void
                    submitFinancialAction()
                  }
                  className="
                    rounded-xl
                    bg-red-600
                    px-5 py-3
                    text-sm font-black
                    text-white
                    hover:bg-red-700
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {actionLoading
                    ? "Processando..."
                    : (
                      financialAction.mode
                        === "refund"
                        ? "Confirmar estorno"
                        : "Confirmar cancelamento"
                    )}
                </button>

              </div>

            </div>
          </div>
        </div>
      )}


      {documentSale && (
        <div
          className="
            fixed inset-0 z-[100]
            flex items-center
            justify-center
            bg-slate-950/70
            p-4 backdrop-blur-sm
          "
          onClick={() =>
            setDocumentSale(null)
          }
        >

          <div
            className="
              w-full max-w-xl
              overflow-hidden
              rounded-3xl
              bg-white
              shadow-2xl
            "
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div
              className="
                flex items-start
                justify-between
                bg-slate-950
                p-6 text-white
              "
            >

              <div>
                <p
                  className="
                    text-xs font-black
                    uppercase
                    tracking-[0.18em]
                    text-indigo-300
                  "
                >
                  Venda #
                  {documentSale.sale_id}
                </p>

                <h3
                  className="
                    mt-2 text-xl
                    font-black
                  "
                >
                  Documentação da proposta
                </h3>

                <p
                  className="
                    mt-1 text-sm
                    text-slate-300
                  "
                >
                  {documentSale
                    .customer
                    ?.name
                    || "-"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDocumentSale(null)
                }
                className="
                  rounded-xl
                  bg-white/10
                  px-3 py-2
                  text-sm font-black
                  hover:bg-white/20
                "
              >
                ?
              </button>

            </div>


            <div
              className="
                space-y-3 p-6
              "
            >

              {documentSale
                .documents
                ?.document_front && (
                <button
                  type="button"
                  onClick={() =>
                    void openProtectedFile(
                      `/card-sales/admin/${documentSale.sale_id}/documents/document_front`
                    )
                  }
                  className="
                    flex w-full
                    items-center
                    justify-between
                    rounded-2xl
                    border
                    border-slate-200
                    p-4 text-left
                    hover:bg-slate-50
                  "
                >
                  <span>
                    <span
                      className="
                        block font-black
                        text-slate-900
                      "
                    >
                      Documento ? Frente
                    </span>

                    <span
                      className="
                        mt-1 block
                        text-xs
                        text-slate-500
                      "
                    >
                      Documento enviado
                      pelo administrador
                    </span>
                  </span>

                  <span
                    className="
                      text-sm font-black
                      text-indigo-600
                    "
                  >
                    Abrir
                  </span>
                </button>
              )}


              {documentSale
                .documents
                ?.document_back && (
                <button
                  type="button"
                  onClick={() =>
                    void openProtectedFile(
                      `/card-sales/admin/${documentSale.sale_id}/documents/document_back`
                    )
                  }
                  className="
                    flex w-full
                    items-center
                    justify-between
                    rounded-2xl
                    border
                    border-slate-200
                    p-4 text-left
                    hover:bg-slate-50
                  "
                >
                  <span>
                    <span
                      className="
                        block font-black
                        text-slate-900
                      "
                    >
                      Documento ? Verso
                    </span>

                    <span
                      className="
                        mt-1 block
                        text-xs
                        text-slate-500
                      "
                    >
                      Documento enviado
                      pelo administrador
                    </span>
                  </span>

                  <span
                    className="
                      text-sm font-black
                      text-indigo-600
                    "
                  >
                    Abrir
                  </span>
                </button>
              )}


              {documentSale
                .documents
                ?.selfie && (
                <button
                  type="button"
                  onClick={() =>
                    void openProtectedFile(
                      `/card-sales/admin/${documentSale.sale_id}/documents/selfie`
                    )
                  }
                  className="
                    flex w-full
                    items-center
                    justify-between
                    rounded-2xl
                    border
                    border-slate-200
                    p-4 text-left
                    hover:bg-slate-50
                  "
                >
                  <span>
                    <span
                      className="
                        block font-black
                        text-slate-900
                      "
                    >
                      Selfie
                    </span>

                    <span
                      className="
                        mt-1 block
                        text-xs
                        text-slate-500
                      "
                    >
                      Imagem de validação
                      do cliente
                    </span>
                  </span>

                  <span
                    className="
                      text-sm font-black
                      text-indigo-600
                    "
                  >
                    Abrir
                  </span>
                </button>
              )}


              {documentSale
                .authorization && (
                <button
                  type="button"
                  onClick={() =>
                    void openProtectedFile(
                      `/card-sales/admin/${documentSale.sale_id}/authorization/term`
                    )
                  }
                  className="
                    flex w-full
                    items-center
                    justify-between
                    rounded-2xl
                    border
                    border-violet-200
                    bg-violet-50
                    p-4 text-left
                    hover:bg-violet-100
                  "
                >
                  <span>
                    <span
                      className="
                        block font-black
                        text-violet-950
                      "
                    >
                      Termo de autorização
                    </span>

                    <span
                      className="
                        mt-1 block
                        text-xs
                        text-violet-700
                      "
                    >
                      Termo vinculado
                      à autorização
                    </span>
                  </span>

                  <span
                    className="
                      text-sm font-black
                      text-violet-700
                    "
                  >
                    Abrir
                  </span>
                </button>
              )}


              {documentSale
                .authorization
                ?.has_signature && (
                <button
                  type="button"
                  onClick={() =>
                    void openProtectedFile(
                      `/card-sales/admin/${documentSale.sale_id}/authorization/signature`
                    )
                  }
                  className="
                    flex w-full
                    items-center
                    justify-between
                    rounded-2xl
                    border
                    border-emerald-200
                    bg-emerald-50
                    p-4 text-left
                    hover:bg-emerald-100
                  "
                >
                  <span>
                    <span
                      className="
                        block font-black
                        text-emerald-950
                      "
                    >
                      Assinatura do cliente
                    </span>

                    <span
                      className="
                        mt-1 block
                        text-xs
                        text-emerald-700
                      "
                    >
                      Assinatura vinculada
                      ao termo autorizado
                    </span>
                  </span>

                  <span
                    className="
                      text-sm font-black
                      text-emerald-700
                    "
                  >
                    Abrir
                  </span>
                </button>
              )}


              {!documentSale
                .documents
                ?.received &&
                !documentSale
                  .authorization && (
                <div
                  className="
                    rounded-2xl
                    bg-slate-50
                    p-6 text-center
                    text-sm
                    text-slate-500
                  "
                >
                  Nenhuma documentação
                  disponível para esta venda.
                </div>
              )}

            </div>


            <div
              className="
                border-t
                border-slate-200
                bg-slate-50
                px-6 py-4
                text-xs
                text-slate-500
              "
            >
              Os arquivos são acessados
              através de uma rota administrativa
              autenticada. O endereço físico
              do Storage não é exposto.
            </div>

          </div>
        </div>
      )}


    </section>
  );
}
