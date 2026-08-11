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


  // CARD_SALE_SALE_CENTER_STATE_V1
  const [
    saleCenter,
    setSaleCenter,
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


  // CARD_SALE_RECEIPT_PREMIUM_V2
  const openReceipt = (
    sale: CardSaleFinanceItem
  ) => {
    if (!sale.receipt_available) {
      return;
    }

    const popup = window.open(
      "",
      "_blank",
      "noopener,noreferrer,width=1060,height=980"
    );

    if (!popup) {
      window.alert(
        "O navegador bloqueou a abertura do comprovante."
      );
      return;
    }

    const item = sale as any;
    const payment = item.payment || {};
    const receipt = item.receipt || {};
    const pricing = item.pricing || {};
    const snapshot = pricing.snapshot || {};
    const customer = item.customer || {};

    const brl = (value: any) =>
      new Intl.NumberFormat(
        "pt-BR",
        {
          style: "currency",
          currency: "BRL",
        }
      ).format(Number(value) || 0);

    const percent = (
      value: any,
      digits = 2
    ) => {
      if (
        value === null
        || value === undefined
        || value === ""
      ) {
        return "?";
      }

      return (
        new Intl.NumberFormat(
          "pt-BR",
          {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
          }
        ).format(Number(value) || 0)
        + "%"
      );
    };

    const escapeHtml = (value: any) =>
      String(
        value === null
        || value === undefined
        || value === ""
          ? "-"
          : value
      ).replace(
        /[&<>"']/g,
        (char) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        }[char] || char)
      );

    const formatDate = (
      value: any
    ) => {
      if (!value) return "-";

      const parsed = new Date(value);

      if (
        Number.isNaN(
          parsed.getTime()
        )
      ) {
        return escapeHtml(value);
      }

      return parsed.toLocaleString(
        "pt-BR",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    };

    const grossAmount = Number(
      pricing.customer_total
      ?? payment.amount
      ?? receipt.amount
      ?? 0
    );

    const netAmount = Number(
      snapshot.net_amount
      ?? snapshot.seller_net_amount
      ?? pricing.reference_amount
      ?? 0
    );

    const installments = Number(
      receipt.installments
      ?? payment.installments
      ?? pricing.installments
      ?? 1
    ) || 1;

    const installmentValue = Number(
      pricing.installment_value
      ?? receipt.installment_value
      ?? (
        grossAmount
        / installments
      )
    );

    const mpFeePercent =
      snapshot.mp_total_fee_percent
      ?? snapshot.total_fee_percent
      ?? snapshot.mercado_pago_fee_percent
      ?? null;

    const monthlyRate =
      snapshot.monthly_rate_percent
      ?? snapshot.monthly_rate
      ?? null;

    const rawPaymentType = String(
      receipt.payment_type_id
      ?? payment.payment_type_id
      ?? ""
    ).toLowerCase();

    const rawMethod = String(
      receipt.payment_method_id
      ?? payment.payment_method_id
      ?? ""
    ).toLowerCase();

    let paymentMethod = "Pagamento";

    if (
      rawPaymentType.includes(
        "credit"
      )
      || rawMethod.includes(
        "credit"
      )
    ) {
      paymentMethod =
        "Cart?o de cr?dito";
    }
    else if (
      rawPaymentType.includes(
        "debit"
      )
      || rawMethod.includes(
        "debit"
      )
    ) {
      paymentMethod =
        "Cart?o de d?bito";
    }
    else if (
      rawPaymentType.includes("pix")
      || rawMethod.includes("pix")
    ) {
      paymentMethod = "PIX";
    }
    else if (
      rawPaymentType
      || rawMethod
    ) {
      paymentMethod = (
        rawPaymentType
        || rawMethod
      )
        .replace(/_/g, " ")
        .replace(
          /\b\w/g,
          (letter) =>
            letter.toUpperCase()
        );
    }

    const cardBrand = String(
      receipt.card_brand
      ?? payment.card_brand
      ?? (
        [
          "visa",
          "master",
          "mastercard",
          "elo",
          "amex",
          "hipercard",
        ].includes(rawMethod)
          ? rawMethod
          : ""
      )
      ?? ""
    );

    const orderId =
      receipt.order_id
      ?? payment.order_id
      ?? receipt.mercado_pago_payment_id
      ?? payment.mercado_pago_payment_id
      ?? "-";

    const reference =
      receipt.external_reference
      ?? payment.external_reference
      ?? receipt.receipt_number
      ?? `PP-${sale.sale_id}`;

    const paidAt =
      receipt.paid_at
      ?? payment.paid_at
      ?? null;

    const brandLabel = cardBrand
      ? cardBrand.toUpperCase()
      : "-";

    const isRefunded =
      sale.finance_status === "refunded";

    const refundNote = isRefunded
      ? `
        <div class="refund-note">
          Este ? o comprovante original da
          transa??o aprovada. A venda possui
          registro posterior de estorno.
        </div>
      `
      : "";

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />

<meta
  name="viewport"
  content="width=device-width, initial-scale=1"
/>

<title>
  Comprovante ${escapeHtml(reference)}
</title>

<style>
  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    min-height: 100%;
    font-family:
      Inter,
      Arial,
      Helvetica,
      sans-serif;
    color: #172554;
  }

  body {
    background:
      radial-gradient(
        circle at 10% 10%,
        #0478ef 0,
        transparent 34%
      ),
      radial-gradient(
        circle at 90% 85%,
        #8b35ff 0,
        transparent 35%
      ),
      linear-gradient(
        135deg,
        #003b9f 0%,
        #081b74 50%,
        #5220d5 100%
      );

    padding: 38px 20px;
  }

  .receipt {
    width: min(
      860px,
      calc(100vw - 32px)
    );

    margin: 0 auto;

    background: #ffffff;

    border-radius: 30px;

    padding: 38px 44px 34px;

    box-shadow:
      0 30px 80px
      rgba(2, 21, 78, 0.38);

    border:
      1px solid
      rgba(255,255,255,.7);
  }

  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  .pp-logo {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .pp-mark {
    width: 67px;
    height: 58px;
    display: grid;
    place-items: center;

    border-radius: 18px;

    background:
      linear-gradient(
        145deg,
        #0478ef,
        #5030db 65%,
        #a229ed
      );

    color: white;
    font-size: 28px;
    font-weight: 950;
    font-style: italic;
    letter-spacing: -5px;

    box-shadow:
      0 8px 22px
      rgba(50, 65, 210, .22);
  }

  .pp-name {
    font-size: 22px;
    font-weight: 950;
    line-height: .95;
    letter-spacing: -.6px;
    color: #101b56;
  }

  .pp-pro {
    display: block;
    margin-top: 7px;
    color: #8f29e9;
    font-size: 19px;
    font-style: italic;
  }

  .mp-logo {
    display: flex;
    align-items: center;
    gap: 9px;
    font-weight: 900;
    font-size: 22px;
    color: #173b91;
    line-height: .9;
  }

  .mp-icon {
    width: 54px;
    height: 38px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: #57c4ff;
    border: 3px solid #153a96;
    font-size: 21px;
  }

  .mp-second {
    display: block;
    color: #22a8eb;
  }

  .secure {
    margin: 28px 0 30px;

    display: flex;
    align-items: center;
    gap: 14px;

    color: #70809e;
    font-size: 14px;
  }

  .secure::before,
  .secure::after {
    content: "";
    flex: 1;
    height: 1px;
    background: #dfe5ef;
  }

  h1 {
    margin: 0 0 26px;
    text-align: center;
    color: #131f58;
    font-size: 31px;
    letter-spacing: -.8px;
  }

  .approved {
    display: grid;
    grid-template-columns:
      120px 1fr;
    align-items: center;
    gap: 25px;

    min-height: 155px;

    border:
      1.5px solid #a7e7bd;

    border-radius: 19px;

    background:
      linear-gradient(
        90deg,
        #f8fffa,
        #f4fff7
      );

    padding: 25px 34px;

    margin-bottom: 27px;
  }

  .shield {
    width: 92px;
    height: 102px;

    margin: 0 auto;

    display: grid;
    place-items: center;

    color: white;
    font-size: 48px;
    font-weight: 950;

    background:
      linear-gradient(
        145deg,
        #08c451,
        #00852e
      );

    clip-path:
      polygon(
        50% 0,
        96% 19%,
        91% 70%,
        50% 100%,
        9% 70%,
        4% 19%
      );

    filter:
      drop-shadow(
        0 10px 8px
        rgba(2, 136, 51, .18)
      );
  }

  .approved-label {
    color: #07933b;
    font-size: 23px;
    font-weight: 900;
  }

  .check-round {
    display: inline-grid;
    place-items: center;

    width: 25px;
    height: 25px;

    margin-left: 7px;

    border-radius: 50%;

    background: #07933b;
    color: white;

    font-size: 16px;
  }

  .approved-value {
    margin-top: 7px;

    color: #078b35;

    font-size: 50px;
    line-height: 1;
    font-weight: 950;
    letter-spacing: -1.6px;
  }

  .details {
    padding: 2px 7px;
  }

  .row {
    display: grid;
    grid-template-columns:
      31px
      auto
      minmax(50px, 1fr)
      auto;

    align-items: center;

    min-height: 49px;

    color: #465a7b;
    font-size: 17px;
  }

  .row-icon {
    color: #536685;
    font-size: 19px;
    text-align: center;
  }

  .row-label {
    white-space: nowrap;
  }

  .dots {
    margin: 0 14px;
    border-bottom:
      1px dotted #c8d1df;
    height: 1px;
  }

  .row-value {
    color: #111b4f;
    text-align: right;
    font-weight: 700;
  }

  .row.receive .row-icon,
  .row.receive .row-label,
  .row.receive .row-value {
    color: #07933b;
    font-weight: 900;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .brand-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;

    min-width: 55px;
    height: 31px;

    padding: 0 9px;

    border:
      1px solid #d6dce6;

    border-radius: 6px;

    background: white;

    color: #153c9d;
    font-style: italic;
    font-weight: 950;
    font-size: 15px;
  }

  .security-note {
    margin-top: 24px;

    display: grid;
    grid-template-columns:
      78px 1fr;
    gap: 18px;

    align-items: center;

    border:
      1.5px solid #efc35d;

    border-radius: 16px;

    padding: 17px 22px;

    background:
      linear-gradient(
        90deg,
        #fffdf7,
        #fffaf0
      );
  }

  .lock-circle {
    width: 58px;
    height: 58px;

    display: grid;
    place-items: center;

    margin: auto;

    border-radius: 50%;

    background: #fff1c7;

    font-size: 28px;
  }

  .security-title {
    color: #29231f;
    font-weight: 900;
    font-size: 16px;
  }

  .security-text {
    margin-top: 4px;

    color: #465a7b;
    font-size: 14px;
    line-height: 1.4;
  }

  .refund-note {
    margin-top: 14px;

    border-radius: 13px;

    padding: 12px 16px;

    background: #faf5ff;

    border: 1px solid #e9d5ff;

    color: #7e22ce;

    font-size: 13px;
    font-weight: 700;
  }

  .divider {
    height: 1px;
    background: #dfe4ed;
    margin: 25px 0 18px;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .action {
    border-radius: 13px;

    min-height: 59px;

    display: flex;
    align-items: center;
    justify-content: center;
    gap: 11px;

    border: 2px solid #0759d4;

    font-size: 17px;
    font-weight: 900;

    cursor: pointer;

    transition:
      transform .15s ease,
      box-shadow .15s ease;
  }

  .action:hover {
    transform: translateY(-1px);
  }

  .print-button {
    background: white;
    color: #0759d4;
  }

  .pdf-button {
    background:
      linear-gradient(
        135deg,
        #0757cf,
        #063bb0
      );

    color: white;

    box-shadow:
      0 9px 24px
      rgba(0, 70, 190, .2);
  }

  .small-id {
    margin-top: 17px;
    text-align: center;
    color: #9aa6b8;
    font-size: 10px;
  }

  @media (
    max-width: 700px
  ) {
    body {
      padding: 12px;
    }

    .receipt {
      padding: 24px 18px;
      border-radius: 22px;
    }

    .top {
      gap: 12px;
    }

    .pp-mark {
      width: 48px;
      height: 44px;
      font-size: 21px;
    }

    .pp-name,
    .mp-logo {
      font-size: 15px;
    }

    h1 {
      font-size: 25px;
    }

    .approved {
      grid-template-columns:
        86px 1fr;

      padding: 20px 14px;
    }

    .shield {
      width: 70px;
      height: 78px;
      font-size: 37px;
    }

    .approved-label {
      font-size: 18px;
    }

    .approved-value {
      font-size: 36px;
    }

    .row {
      font-size: 13px;

      grid-template-columns:
        24px
        auto
        minmax(15px, 1fr)
        auto;
    }

    .dots {
      margin: 0 6px;
    }

    .security-note {
      grid-template-columns:
        52px 1fr;
    }

    .actions {
      grid-template-columns: 1fr;
      gap: 10px;
    }
  }

  @media print {
    @page {
      size: A4 portrait;
      margin: 8mm;
    }

    html,
    body {
      background: white !important;
    }

    body {
      padding: 0;
    }

    .receipt {
      width: 100%;
      max-width: 190mm;
      padding: 10mm;

      box-shadow: none;

      border:
        1px solid #e4e8ef;

      border-radius: 12px;
    }

    .actions,
    .divider,
    .small-id {
      display: none !important;
    }

    * {
      -webkit-print-color-adjust:
        exact !important;

      print-color-adjust:
        exact !important;
    }
  }
</style>
</head>

<body>

<div
  id="receipt-document"
  class="receipt"
>

  <div class="top">

    <div class="pp-logo">
      <div class="pp-mark">
        PP
      </div>

      <div class="pp-name">
        PORTABILIDADE
        <span class="pp-pro">
          PRO
        </span>
      </div>
    </div>

    <div class="mp-logo">
      <div class="mp-icon">
        ??
      </div>

      <div>
        mercado
        <span class="mp-second">
          pago
        </span>
      </div>
    </div>

  </div>

  <div class="secure">
    ?? Ambiente seguro
  </div>

  <h1>
    Comprovante de Pagamento
  </h1>

  <div class="approved">

    <div class="shield">
      ?
    </div>

    <div>
      <div class="approved-label">
        Pagamento aprovado
        <span class="check-round">
          ?
        </span>
      </div>

      <div class="approved-value">
        ${escapeHtml(
          brl(grossAmount)
        )}
      </div>
    </div>

  </div>

  <div class="details">

    <div class="row">
      <span class="row-icon">
        ?
      </span>

      <span class="row-label">
        Cliente
      </span>

      <span class="dots"></span>

      <span class="row-value">
        ${escapeHtml(
          customer.name
          ?? receipt.customer_name
          ?? "-"
        )}
      </span>
    </div>

    <div class="row">
      <span class="row-icon">
        ?
      </span>

      <span class="row-label">
        Data
      </span>

      <span class="dots"></span>

      <span class="row-value">
        ${escapeHtml(
          formatDate(paidAt)
        )}
      </span>
    </div>

    <div class="row">
      <span class="row-icon">
        #
      </span>

      <span class="row-label">
        Order ID
      </span>

      <span class="dots"></span>

      <span class="row-value">
        ${escapeHtml(orderId)}
      </span>
    </div>

    <div class="row">
      <span class="row-icon">
        ?
      </span>

      <span class="row-label">
        Refer?ncia
      </span>

      <span class="dots"></span>

      <span class="row-value">
        ${escapeHtml(reference)}
      </span>
    </div>

    <div class="row">
      <span class="row-icon">
        ?
      </span>

      <span class="row-label">
        Forma de pagamento
      </span>

      <span class="dots"></span>

      <span class="row-value">
        ${escapeHtml(
          paymentMethod
        )}
      </span>
    </div>

    <div class="row">
      <span class="row-icon">
        ?
      </span>

      <span class="row-label">
        Bandeira
      </span>

      <span class="dots"></span>

      <span class="row-value">
        <span class="brand">
          ${
            cardBrand
              ? `
                <span
                  class="brand-badge"
                >
                  ${escapeHtml(
                    brandLabel
                  )}
                </span>
              `
              : ""
          }

          ${escapeHtml(
            cardBrand
              ? (
                  cardBrand
                    .charAt(0)
                    .toUpperCase()
                  + cardBrand
                    .slice(1)
                )
              : "-"
          )}
        </span>
      </span>
    </div>

    <div class="row">
      <span class="row-icon">
        ?
      </span>

      <span class="row-label">
        Parcelamento
      </span>

      <span class="dots"></span>

      <span class="row-value">
        ${escapeHtml(
          `${installments}x de ${
            brl(
              installmentValue
            )
          }`
        )}
      </span>
    </div>

    <div class="row receive">
      <span class="row-icon">
        ?
      </span>

      <span class="row-label">
        Pra receber
      </span>

      <span class="dots"></span>

      <span class="row-value">
        ${escapeHtml(
          brl(netAmount)
        )}
      </span>
    </div>

    <div class="row">
      <span class="row-icon">
        %
      </span>

      <span class="row-label">
        Taxa Mercado Pago
      </span>

      <span class="dots"></span>

      <span class="row-value">
        ${escapeHtml(
          percent(
            mpFeePercent,
            2
          )
        )}
      </span>
    </div>

    <div class="row">
      <span class="row-icon">
        ?
      </span>

      <span class="row-label">
        Taxa a.m.
      </span>

      <span class="dots"></span>

      <span class="row-value">
        ${escapeHtml(
          percent(
            monthlyRate,
            4
          )
        )}
      </span>
    </div>

  </div>

  <div class="security-note">

    <div class="lock-circle">
      ??
    </div>

    <div>
      <div class="security-title">
        Estorno protegido por senha
        do administrador
      </div>

      <div class="security-text">
        Para solicitar estornos, ?
        obrigat?ria a autentica??o
        com a senha do administrador
        do sistema.
      </div>
    </div>

  </div>

  ${refundNote}

  <div class="divider"></div>

  <div class="actions">

    <button
      type="button"
      class="action print-button"
      onclick="window.print()"
    >
      ?? Imprimir
    </button>

    <button
      id="download-pdf"
      type="button"
      class="action pdf-button"
      onclick="downloadReceiptPdf()"
    >
      ? Baixar PDF
    </button>

  </div>

  <div class="small-id">
    Portabilidade PRO ?
    Venda #${escapeHtml(
      sale.sale_id
    )}
  </div>

</div>

<script>
async function downloadReceiptPdf() {
  var button =
    document.getElementById(
      "download-pdf"
    );

  var actions =
    document.querySelector(
      ".actions"
    );

  var divider =
    document.querySelector(
      ".divider"
    );

  try {
    if (button) {
      button.disabled = true;
      button.textContent =
        "Gerando PDF...";
    }

    if (!window.html2pdf) {
      await new Promise(
        function(
          resolve,
          reject
        ) {
          var script =
            document.createElement(
              "script"
            );

          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";

          script.onload =
            resolve;

          script.onerror =
            reject;

          document.head
            .appendChild(
              script
            );
        }
      );
    }

    if (actions) {
      actions.style.display =
        "none";
    }

    if (divider) {
      divider.style.display =
        "none";
    }

    var element =
      document.getElementById(
        "receipt-document"
      );

    await window
      .html2pdf()
      .set({
        margin: [
          5,
          5,
          5,
          5
        ],
        filename:
          "comprovante-venda-${sale.sale_id}.pdf",
        image: {
          type: "jpeg",
          quality: 0.98
        },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor:
            "#ffffff"
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation:
            "portrait"
        }
      })
      .from(element)
      .save();
  }
  catch (error) {
    console.error(
      "Erro ao gerar PDF:",
      error
    );

    window.alert(
      "N?o foi poss?vel gerar o PDF automaticamente. A janela de impress?o ser? aberta para salvar como PDF."
    );

    window.print();
  }
  finally {
    if (actions) {
      actions.style.display = "";
    }

    if (divider) {
      divider.style.display = "";
    }

    if (button) {
      button.disabled = false;
      button.textContent =
        "? Baixar PDF";
    }
  }
}
</script>

</body>
</html>
    `;

    popup.document.open();
    popup.document.write(html);
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

                          {/* CARD_SALE_SALE_CENTER_BUTTON_V1 */}
                          {(
                            sale.authorization
                            || sale.payment
                            || sale.receipt_available
                          ) && (
                            <button
                              type="button"
                              onClick={() =>
                                setSaleCenter(
                                  sale
                                )
                              }
                              className="
                                rounded-xl
                                bg-indigo-600
                                px-3 py-2
                                text-xs
                                font-black
                                text-white
                                shadow-sm
                                transition
                                hover:-translate-y-0.5
                                hover:bg-indigo-700
                                hover:shadow-md
                              "
                            >
                              {sale.receipt_available
                                ? "Links / Comprovante"
                                : "Links da venda"}
                            </button>
                          )}


                          {/* CARD_SALE_OLD_LINK_ACTIONS_HIDDEN_V1 */}
                          {false
                            && sale.authorization
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
                          {/* CARD_SALE_HIDE_OLD_CHECKOUT_V2 */}
                          {false && sale.payment
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


                          {/* CARD_SALE_HIDE_OLD_RECEIPT_V1 */}
                          {false
                            && sale.receipt_available
                            && sale.receipt && (
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
                              Cancelar
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
                              Estornar
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


      {/* CARD_SALE_SALE_CENTER_MODAL_V1 */}
      {saleCenter && (
        <div
          className="
            fixed inset-0 z-[130]
            flex items-center
            justify-center
            bg-slate-950/75
            p-4
            backdrop-blur-sm
          "
          onClick={() =>
            setSaleCenter(null)
          }
        >
          <div
            className="
              w-full max-w-3xl
              overflow-hidden
              rounded-[2rem]
              bg-white
              shadow-2xl
            "
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* HEADER */}
            <div
              className="
                flex items-start
                justify-between
                gap-5
                bg-gradient-to-r
                from-slate-950
                to-indigo-950
                px-6 py-5
                text-white
              "
            >
              <div>
                <p
                  className="
                    text-[10px]
                    font-black
                    uppercase
                    tracking-[0.25em]
                    text-indigo-300
                  "
                >
                  Financeiro ? Venda #
                  {saleCenter.sale_id}
                </p>

                <h3
                  className="
                    mt-2 text-2xl
                    font-black
                  "
                >
                  Central da Venda
                </h3>

                <p
                  className="
                    mt-1 text-sm
                    text-slate-300
                  "
                >
                  {
                    saleCenter.customer
                      ?.name
                    || "-"
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSaleCenter(null)
                }
                className="
                  rounded-xl
                  bg-white/10
                  px-4 py-2
                  text-sm font-black
                  hover:bg-white/20
                "
              >
                Fechar
              </button>
            </div>


            <div
              className="
                max-h-[75vh]
                space-y-5
                overflow-y-auto
                p-6
              "
            >

              {/* RESUMO */}
              <div
                className="
                  grid gap-3
                  md:grid-cols-3
                "
              >
                <div
                  className="
                    rounded-2xl
                    bg-slate-50
                    p-4
                  "
                >
                  <p
                    className="
                      text-[10px]
                      font-black
                      uppercase
                      tracking-wider
                      text-slate-400
                    "
                  >
                    Valor
                  </p>

                  <p
                    className="
                      mt-1 text-lg
                      font-black
                      text-slate-950
                    "
                  >
                    {money(
                      saleCenter.pricing
                        ?.customer_total
                      ?? saleCenter.payment
                        ?.amount
                    )}
                  </p>
                </div>

                <div
                  className="
                    rounded-2xl
                    bg-slate-50
                    p-4
                  "
                >
                  <p
                    className="
                      text-[10px]
                      font-black
                      uppercase
                      tracking-wider
                      text-slate-400
                    "
                  >
                    Parcelamento
                  </p>

                  <p
                    className="
                      mt-1 text-lg
                      font-black
                      text-slate-950
                    "
                  >
                    {
                      saleCenter.pricing
                        ?.installments
                      ?? saleCenter.payment
                        ?.installments
                      ?? "-"
                    }x
                  </p>
                </div>

                <div
                  className="
                    rounded-2xl
                    bg-slate-50
                    p-4
                  "
                >
                  <p
                    className="
                      text-[10px]
                      font-black
                      uppercase
                      tracking-wider
                      text-slate-400
                    "
                  >
                    Status
                  </p>

                  <p
                    className="
                      mt-1 text-sm
                      font-black
                      text-slate-950
                    "
                  >
                    {
                      STATUS_META[
                        saleCenter
                          .finance_status
                      ]?.label
                      || saleCenter
                        .finance_status
                    }
                  </p>
                </div>
              </div>


              {/* AUTORIZACAO */}
              <section
                className="
                  overflow-hidden
                  rounded-2xl
                  border
                  border-violet-200
                  bg-violet-50
                "
              >
                <div
                  className="
                    flex items-center
                    justify-between
                    border-b
                    border-violet-100
                    px-5 py-4
                  "
                >
                  <div>
                    <p
                      className="
                        text-xs font-black
                        uppercase
                        tracking-widest
                        text-violet-700
                      "
                    >
                      Autoriza??o do cliente
                    </p>

                    <p
                      className="
                        mt-1 text-xs
                        font-bold
                        text-slate-500
                      "
                    >
                      Status:{" "}
                      {
                        saleCenter
                          .authorization
                          ?.status
                        || "Ainda n?o criada"
                      }
                    </p>
                  </div>

                  <span
                    className="
                      rounded-full
                      bg-white
                      px-3 py-1
                      text-[10px]
                      font-black
                      uppercase
                      text-violet-700
                      shadow-sm
                    "
                  >
                    Cliente
                  </span>
                </div>


                <div className="p-5">

                  {saleCenter
                    .authorization
                    ?.url ? (
                    <>
                      <div
                        className="
                          break-all
                          rounded-xl
                          border
                          border-violet-100
                          bg-white
                          px-4 py-3
                          text-xs
                          font-medium
                          text-slate-600
                        "
                      >
                        {
                          saleCenter
                            .authorization
                            ?.url
                        }
                      </div>

                      <div
                        className="
                          mt-3 flex
                          flex-wrap gap-2
                        "
                      >
                        <button
                          type="button"
                          onClick={() =>
                            void copy(
                              saleCenter
                                .authorization
                                ?.url
                            )
                          }
                          className="
                            rounded-xl
                            border
                            border-violet-200
                            bg-white
                            px-4 py-2.5
                            text-xs font-black
                            text-violet-700
                            hover:bg-violet-100
                          "
                        >
                          {copied ===
                          saleCenter
                            .authorization
                            ?.url
                            ? "? Copiado"
                            : "Copiar link"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              saleCenter
                                .authorization
                                ?.url
                                || "",
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                          className="
                            rounded-xl
                            bg-violet-600
                            px-4 py-2.5
                            text-xs font-black
                            text-white
                            hover:bg-violet-700
                          "
                        >
                          Abrir autoriza??o
                        </button>
                      </div>
                    </>
                  ) : (
                    <div
                      className="
                        rounded-xl
                        border
                        border-dashed
                        border-violet-200
                        bg-white/60
                        p-4
                        text-sm
                        font-medium
                        text-slate-500
                      "
                    >
                      O link de autoriza??o
                      ainda n?o foi criado.
                    </div>
                  )}

                </div>
              </section>


              {/* PAGAMENTO */}
              <section
                className="
                  overflow-hidden
                  rounded-2xl
                  border
                  border-blue-200
                  bg-blue-50
                "
              >
                <div
                  className="
                    flex items-center
                    justify-between
                    border-b
                    border-blue-100
                    px-5 py-4
                  "
                >
                  <div>
                    <p
                      className="
                        text-xs font-black
                        uppercase
                        tracking-widest
                        text-blue-700
                      "
                    >
                      Pagamento
                    </p>

                    <p
                      className="
                        mt-1 text-xs
                        font-bold
                        text-slate-500
                      "
                    >
                      Status:{" "}
                      {
                        saleCenter.payment
                          ?.status
                        || "Ainda n?o criado"
                      }
                    </p>
                  </div>

                  <span
                    className="
                      rounded-full
                      bg-white
                      px-3 py-1
                      text-[10px]
                      font-black
                      uppercase
                      text-blue-700
                      shadow-sm
                    "
                  >
                    Mercado Pago
                  </span>
                </div>


                <div className="p-5">

                  {saleCenter.payment
                    ?.checkout_url ? (
                    <>
                      <div
                        className="
                          break-all
                          rounded-xl
                          border
                          border-blue-100
                          bg-white
                          px-4 py-3
                          text-xs
                          font-medium
                          text-slate-600
                        "
                      >
                        {
                          saleCenter.payment
                            ?.checkout_url
                        }
                      </div>

                      <div
                        className="
                          mt-3 flex
                          flex-wrap gap-2
                        "
                      >
                        <button
                          type="button"
                          onClick={() =>
                            void copy(
                              saleCenter.payment
                                ?.checkout_url
                            )
                          }
                          className="
                            rounded-xl
                            border
                            border-blue-200
                            bg-white
                            px-4 py-2.5
                            text-xs font-black
                            text-blue-700
                            hover:bg-blue-100
                          "
                        >
                          {copied ===
                          saleCenter.payment
                            ?.checkout_url
                            ? "? Copiado"
                            : "Copiar link"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              saleCenter.payment
                                ?.checkout_url
                                || "",
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                          className="
                            rounded-xl
                            bg-blue-600
                            px-4 py-2.5
                            text-xs font-black
                            text-white
                            hover:bg-blue-700
                          "
                        >
                          Abrir pagamento
                        </button>
                      </div>
                    </>
                  ) : (
                    <div
                      className="
                        rounded-xl
                        border
                        border-dashed
                        border-blue-200
                        bg-white/60
                        p-4
                        text-sm
                        font-medium
                        text-slate-500
                      "
                    >
                      O link de pagamento
                      ainda n?o foi criado.
                    </div>
                  )}

                </div>
              </section>


              {/* COMPROVANTE */}
              {saleCenter
                .receipt_available
                && saleCenter.receipt && (
                <section
                  className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-emerald-200
                    bg-emerald-50
                  "
                >
                  <div
                    className="
                      flex flex-col
                      gap-4
                      p-5
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                    "
                  >
                    <div>
                      <p
                        className="
                          text-xs
                          font-black
                          uppercase
                          tracking-widest
                          text-emerald-700
                        "
                      >
                        Comprovante da venda
                      </p>

                      <p
                        className="
                          mt-1 text-sm
                          font-bold
                          text-slate-700
                        "
                      >
                        {saleCenter
                          .finance_status
                          === "refunded"
                          ? (
                            "Pagamento aprovado "
                            + "e posteriormente estornado"
                          )
                          : (
                            "Pagamento aprovado "
                            + "pelo Mercado Pago"
                          )}
                      </p>

                      {saleCenter.receipt
                        ?.receipt_number && (
                        <p
                          className="
                            mt-1 text-xs
                            font-medium
                            text-slate-500
                          "
                        >
                          N?{" "}
                          {
                            saleCenter
                              .receipt
                              ?.receipt_number
                          }
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        openReceipt(
                          saleCenter
                        )
                      }
                      className="
                        rounded-xl
                        bg-emerald-600
                        px-5 py-3
                        text-xs
                        font-black
                        text-white
                        shadow-sm
                        hover:bg-emerald-700
                      "
                    >
                      {saleCenter
                        .finance_status
                        === "refunded"
                        ? "Comprovante original"
                        : "Abrir comprovante"}
                    </button>
                  </div>
                </section>
              )}


              {/* DOCUMENTACAO */}
              <div
                className="
                  flex justify-end
                  border-t
                  border-slate-100
                  pt-1
                "
              >
                <button
                  type="button"
                  onClick={() => {
                    setSaleCenter(null);
                    setDocumentSale(
                      saleCenter
                    );
                  }}
                  className="
                    rounded-xl
                    border
                    border-slate-200
                    px-4 py-2.5
                    text-xs
                    font-black
                    text-slate-700
                    hover:bg-slate-50
                  "
                >
                  Ver documenta??o
                </button>
              </div>

            </div>
          </div>
        </div>
      )}


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
