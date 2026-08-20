"use client";

const money = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

const percentage = (value, digits = 2) => {
  if (value === null || value === undefined || value === "") {
    return "Não informado";
  }

  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value) || 0)}%`;
};

const truncatedPercentage = (value, digits = 2) => {
  if (value === null || value === undefined || value === "") {
    return "Não informado";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "Não informado";
  }

  const factor = 10 ** digits;
  const truncated = Math.trunc(number * factor) / factor;

  return percentage(truncated, digits);
};

const dateTime = (value) => {
  if (!value) return "-";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  const parts = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Recife",
  }).formatToParts(parsed);

  const part = (type) =>
    parts.find((item) => item.type === type)?.value || "";

  return (
    `${part("day")}/${part("month")}/${part("year")} `
    + `${part("hour")}:${part("minute")}`
  );
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const firstValue = (sources, keys, fallback = null) => {
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;

    for (const key of keys) {
      const value = source[key];

      if (value !== null && value !== undefined && value !== "") {
        return value;
      }
    }
  }

  return fallback;
};

const firstNumber = (sources, keys, fallback = null) => {
  const value = firstValue(sources, keys, null);

  if (value === null) return fallback;

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizePaymentMethod = (paymentType, method) => {
  const rawType = String(paymentType || "").toLowerCase();
  const rawMethod = String(method || "").toLowerCase();

  if (rawType.includes("credit") || rawMethod.includes("credit")) {
    return "Cartão de crédito";
  }

  if (rawType.includes("debit") || rawMethod.includes("debit")) {
    return "Cartão de débito";
  }

  if (rawType.includes("pix") || rawMethod.includes("pix")) {
    return "PIX";
  }

  const raw = rawType || rawMethod;

  if (!raw) return "Cartão de crédito";

  return raw
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const normalizeBrand = (brand, method) => {
  const value = String(brand || method || "").toLowerCase();

  if (value === "master" || value === "mastercard") {
    return { code: "MASTERCARD", label: "Mastercard", className: "mastercard" };
  }

  if (value === "visa") {
    return { code: "VISA", label: "Visa", className: "visa" };
  }

  if (value === "elo") {
    return { code: "ELO", label: "Elo", className: "elo" };
  }

  if (value === "amex" || value === "american_express") {
    return { code: "AMEX", label: "American Express", className: "amex" };
  }

  if (value === "hipercard") {
    return { code: "HIPERCARD", label: "Hipercard", className: "hipercard" };
  }

  const label = value
    ? value.charAt(0).toUpperCase() + value.slice(1)
    : "Cartão";

  return { code: value.toUpperCase() || "CARTÃO", label, className: "generic" };
};

const normalizeReceipt = ({ sale, payment: rawPayment }) => {
  const item = sale || rawPayment?.card_sale_finance || {};
  const payment = rawPayment || item.payment || {};
  const receipt = item.receipt || payment.receipt || {};
  const pricing = item.pricing || payment.pricing || {};
  const customer = item.customer || payment.customer || {};

  const snapshots = [
    pricing.snapshot,
    item.pricing_snapshot,
    item.calculation_snapshot,
    item.fee_snapshot,
    payment.pricing_snapshot,
    payment.calculation_snapshot,
    payment.fee_snapshot,
    payment.metadata?.pricing_snapshot,
    payment.metadata?.calculation_snapshot,
    payment.metadata?.fee_snapshot,
    payment.metadata,
    pricing,
    receipt,
    payment,
    item,
  ];

  const grossAmount = firstNumber(
    [pricing, receipt, payment, item],
    ["customer_total", "gross_amount", "total_amount", "amount"],
    0
  );

  const netAmount = firstNumber(
    snapshots,
    [
      "net_amount",
      "seller_net_amount",
      "reference_amount",
      "base_amount",
      "original_amount",
      "amount_to_receive",
      "receivable_amount",
    ],
    null
  );

  const installments = Math.max(
    1,
    firstNumber([receipt, payment, pricing], ["installments"], 1) || 1
  );

  const installmentValue = firstNumber(
    [pricing, receipt, payment],
    ["installment_value", "installment_amount"],
    grossAmount / installments
  );

  const method = firstValue(
    [receipt, payment],
    ["payment_method_id", "payment_method"],
    ""
  );

  const paymentType = firstValue(
    [receipt, payment],
    ["payment_type_id", "payment_type"],
    ""
  );

  return {
    saleId: item.sale_id || payment.sale_id || null,
    customerName: firstValue(
      [customer, receipt, payment],
      ["name", "customer_name"],
      "-"
    ),
    grossAmount,
    netAmount,
    feePercent: firstNumber(
      snapshots,
      [
        "mp_total_fee_percent",
        "total_fee_percent",
        "mercado_pago_fee_percent",
        "mp_fee_percent",
        "fee_percent",
      ],
      null
    ),
    monthlyRate: firstNumber(
      snapshots,
      [
        "monthly_rate_percent",
        "monthly_rate",
        "monthly_fee_percent",
        "installment_monthly_rate",
      ],
      null
    ),
    installments,
    installmentValue,
    paymentMethod: normalizePaymentMethod(paymentType, method),
    brand: normalizeBrand(
      firstValue([receipt, payment], ["card_brand"], ""),
      method
    ),
    orderId: firstValue(
      [receipt, payment],
      ["order_id", "mercado_pago_payment_id", "payment_id"],
      "-"
    ),
    reference: firstValue(
      [receipt, payment],
      ["external_reference", "receipt_number"],
      item.sale_id ? `PP-${item.sale_id}` : "-"
    ),
    paidAt: firstValue(
      [receipt, payment],
      ["paid_at", "date_approved", "created_at"],
      null
    ),
    statementDescriptor: firstValue(
      [receipt, payment],
      ["statement_descriptor"],
      "PORTAPRO"
    ),
  };
};

const icon = (paths, className = "") => `
  <svg class="icon ${className}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${paths}
  </svg>
`;

const icons = {
  secure: icon('<path d="M12 3 5 6v5c0 4.7 2.9 8.5 7 10 4.1-1.5 7-5.3 7-10V6l-7-3Z"/><rect x="9" y="10" width="6" height="5" rx="1"/><path d="M10.5 10V8.8a1.5 1.5 0 0 1 3 0V10"/>'),
  user: icon('<circle cx="12" cy="7" r="3.5"/><path d="M5.5 21v-2.2A5.8 5.8 0 0 1 11.3 13h1.4a5.8 5.8 0 0 1 5.8 5.8V21"/>'),
  calendar: icon('<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>'),
  hash: icon('<path d="M10 3 7 21M17 3l-3 18M4 9h16M3 15h16"/>'),
  document: icon('<path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v5h5M9 12h6M9 16h6"/>'),
  card: icon('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 15h4"/>'),
  chart: icon('<path d="M12 3a9 9 0 1 0 9 9h-9V3Z"/><path d="M15 3.5A8.5 8.5 0 0 1 20.5 9H15V3.5Z"/>'),
  wallet: icon('<path d="M4 6h13a2 2 0 0 1 2 2v2H7a3 3 0 0 0 0 6h12v2a2 2 0 0 1-2 2H4V6Z"/><path d="M4 6a2 2 0 0 1 2-2h9v2M19 10h2v6h-2M8 13h.01"/>'),
  percent: icon('<circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/><path d="m19 5-14 14"/>'),
  trend: icon('<path d="m4 17 6-6 4 4 6-8M15 7h5v5"/>'),
  printer: icon('<path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7v-7Z"/>'),
  pdf: icon('<path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v5h5"/><text x="8" y="17" fill="currentColor" stroke="none" font-size="5" font-weight="900">PDF</text>'),
  lock: icon('<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>'),
};

const portabilidadeLogo = `
  <div class="brand portabilidade-brand">
    <img
      class="brand-image portabilidade-image"
      src="/receipt-assets/portabilidade-pro.png"
      alt="Portabilidade PRO"
    />
  </div>
`;

const mercadoPagoLogo = `
  <div class="brand mercado-brand">
    <img
      class="brand-image mercado-pago-image"
      src="/receipt-assets/mercado-pago.png"
      alt="Mercado Pago"
    />
  </div>
`;

const shieldApproved = `
  <svg class="approved-shield" viewBox="0 0 112 126" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><linearGradient id="shieldGradient" x1="18" y1="8" x2="92" y2="116" gradientUnits="userSpaceOnUse"><stop stop-color="#0BD358"/><stop offset="1" stop-color="#007B2A"/></linearGradient></defs>
    <path d="M56 5 101 24v34c0 31-18 52-45 64C29 110 11 89 11 58V24L56 5Z" fill="url(#shieldGradient)"/>
    <path d="m34 62 15 15 30-34" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

const detailRow = (iconSvg, label, value, className = "") => `
  <div class="detail-row ${className}">
    <span class="row-icon">${iconSvg}</span>
    <span class="row-label">${escapeHtml(label)}</span>
    <span class="leader"></span>
    <span class="row-value">${value}</span>
  </div>
`;

const buildReceiptHtml = (data) => {
  const brandBadge = data.brand.className === "mastercard"
    ? `<span class="mastercard-logo" aria-label="Mastercard"><svg viewBox="0 0 64 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="24" cy="20" r="17" fill="#EB001B"/><circle cx="40" cy="20" r="17" fill="#F79E1B"/><path d="M32 6.8a17 17 0 0 1 0 26.4 17 17 0 0 1 0-26.4Z" fill="#FF5F00"/></svg></span><span>Mastercard</span>`
    : `<span class="card-brand ${escapeHtml(data.brand.className)}">${escapeHtml(data.brand.code)}</span><span>${escapeHtml(data.brand.label)}</span>`;
  const netValue = data.netAmount === null ? "Não informado" : money(data.netAmount);

  return `
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Comprovante ${escapeHtml(data.reference)}</title>
<style>
  * { box-sizing: border-box; }
  :root { color-scheme: light; }
  html, body { margin:0; min-height:100%; font-family:Inter,Arial,Helvetica,sans-serif; color:#101a4d; }
  body { background:#092e8c; }
  .export-page {
    min-height:100vh; padding:42px 22px;
    background:
      radial-gradient(circle at 9% 12%,rgba(24,146,255,.92) 0,transparent 29%),
      radial-gradient(circle at 91% 88%,rgba(150,52,255,.92) 0,transparent 30%),
      linear-gradient(145deg,#064da9 0%,#082071 52%,#4820c8 100%);
    position:relative; overflow:hidden;
  }
  .export-page::before { content:""; position:absolute; inset:0; opacity:.14; pointer-events:none; background-image:radial-gradient(#fff 1.2px,transparent 1.2px); background-size:22px 22px; mask-image:linear-gradient(135deg,#000,transparent 36%); }
  .receipt { position:relative; width:min(860px,calc(100vw - 28px)); margin:0 auto; padding:34px 42px 32px; border:1px solid rgba(255,255,255,.8); border-radius:30px; background:#fff; box-shadow:0 30px 80px rgba(3,22,78,.38); }
  .top { display:flex; align-items:center; justify-content:space-between; gap:28px; }
  .brand { display:flex; align-items:center; }
  .brand-image { display:block; width:auto; object-fit:contain; }
  .portabilidade-image { height:82px; }
  .mercado-pago-image { height:68px; }
  .secure { margin:22px 0 20px; display:flex; align-items:center; gap:12px; color:#647595; font-size:14px; }
  .secure::before,.secure::after { content:""; flex:1; height:1px; background:#d9e0ea; }
  .secure .icon { width:25px; height:25px; }
  h1 { margin:0 0 22px; text-align:center; color:#10194f; font-size:30px; letter-spacing:-.7px; }
  .approved { position:relative; display:flex; align-items:center; justify-content:center; min-height:150px; margin-bottom:19px; padding:20px 150px; border:1.5px solid #a9e4bc; border-radius:18px; background:linear-gradient(90deg,#fbfffc,#f2fff7); }
  .approved > div:first-child { position:absolute; left:38px; top:50%; transform:translateY(-50%); }
  .approved-copy { min-width:420px; text-align:center; }
  .approved-shield { width:94px; height:108px; display:block; margin:auto; filter:drop-shadow(0 10px 8px rgba(2,136,51,.18)); }
  .approved-label { display:flex; align-items:center; justify-content:center; gap:10px; color:#078f39; font-size:22px; font-weight:900; }
  .approved-check { display:inline-grid; place-items:center; width:24px; height:24px; border-radius:50%; background:#07933b; color:#fff; font-size:16px; }
  .approved-value { margin-top:8px; color:#078b35; font-size:50px; line-height:1; font-weight:950; letter-spacing:-1.5px; }
  .detail-row { display:grid; grid-template-columns:31px auto minmax(32px,1fr) minmax(120px,auto); align-items:center; min-height:46px; color:#526582; font-size:16px; }
  .row-icon { display:flex; align-items:center; color:#50617f; }
  .icon { width:23px; height:23px; stroke:currentColor; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round; }
  .row-label { white-space:nowrap; }
  .leader { height:1px; margin:0 14px; border-top:1px dotted #cdd6e3; }
  .row-value { color:#111b4e; text-align:right; font-weight:750; overflow-wrap:anywhere; }
  .receive .row-icon,.receive .row-label,.receive .row-value { color:#078d35; font-weight:900; }
  .card-brand { display:inline-flex; min-width:57px; height:29px; align-items:center; justify-content:center; margin-right:9px; padding:0 9px; border:1px solid #d4dbe6; border-radius:6px; background:#fff; color:#153c9d; font-size:14px; font-style:italic; font-weight:950; }
  .mastercard-logo { display:inline-flex; width:55px; height:34px; align-items:center; justify-content:center; margin-right:9px; vertical-align:middle; }
  .mastercard-logo svg { display:block; width:55px; height:34px; }
  .card-brand.elo { background:#111827; color:#fff; }
  .security-note { display:grid; grid-template-columns:70px 1fr; gap:17px; align-items:center; margin-top:21px; padding:15px 20px; border:1.5px solid #edbd55; border-radius:15px; background:linear-gradient(90deg,#fffdf7,#fff9eb); }
  .lock-circle { display:grid; place-items:center; width:55px; height:55px; margin:auto; border-radius:50%; background:#ffefbf; color:#c98a00; }
  .lock-circle .icon { width:29px; height:29px; stroke-width:2.2; }
  .security-title { color:#29231f; font-size:15px; font-weight:900; }
  .security-text { margin-top:3px; color:#465a7b; font-size:13px; line-height:1.38; }
  .divider { height:1px; margin:21px 0 16px; background:#dfe4ed; }
  .actions { display:grid; grid-template-columns:1fr 1.08fr; gap:15px; }
  .action-button { min-height:56px; display:flex; align-items:center; justify-content:center; gap:11px; border-radius:13px; font-size:17px; font-weight:900; cursor:pointer; }
  .action-button .icon { width:28px; height:28px; }
  .print-button { border:2px solid #0d55d4; background:#fff; color:#0d55d4; }
  .pdf-button { border:2px solid #0d55d4; background:linear-gradient(135deg,#125bd8,#063bac); color:#fff; box-shadow:0 10px 24px rgba(18,91,216,.2); }
  .exporting .actions { display:none !important; }
  @media print {
    @page { size:A4 portrait; margin:0; }
    html,body { width:210mm; min-height:297mm; background:#092e8c !important; }
    .export-page { width:210mm; min-height:297mm; padding:8mm; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
    .receipt { width:100%; max-width:none; padding:8mm 10mm; border-radius:8mm; box-shadow:none; }
    .actions { display:none !important; }
    .detail-row { min-height:11mm; }
    * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
  }
  @media (max-width:700px) {
    .export-page { padding:12px; }
    .receipt { padding:24px 17px; border-radius:22px; }
    .portabilidade-image { height:52px; }
    .mercado-pago-image { height:45px; }
    h1 { font-size:24px; }
    .approved { min-height:120px; padding:16px 72px; }
    .approved > div:first-child { left:8px; }
    .approved-copy { min-width:0; width:100%; }
    .approved-shield { width:70px; height:82px; }
    .approved-label { font-size:17px; }
    .approved-value { font-size:34px; }
    .detail-row { grid-template-columns:25px auto minmax(8px,1fr) minmax(90px,auto); font-size:12px; }
    .row-icon .icon { width:19px; height:19px; }
    .leader { margin:0 7px; }
    .actions { grid-template-columns:1fr; }
  }
</style>
</head>
<body>
  <main class="export-page" id="receipt-export">
    <article class="receipt" id="receipt-document">
      <header class="top">${portabilidadeLogo}${mercadoPagoLogo}</header>
      <div class="secure">${icons.secure}<span>Ambiente seguro</span></div>
      <h1>Comprovante de Pagamento</h1>
      <section class="approved">
        <div>${shieldApproved}</div>
        <div class="approved-copy">
          <div class="approved-label">Pagamento aprovado <span class="approved-check">✓</span></div>
          <div class="approved-value">${escapeHtml(money(data.grossAmount))}</div>
        </div>
      </section>
      <section class="details">
        ${detailRow(icons.user, "Cliente", escapeHtml(data.customerName))}
        ${detailRow(icons.calendar, "Data", escapeHtml(dateTime(data.paidAt)))}
        ${detailRow(icons.hash, "Order ID", escapeHtml(data.orderId))}
        ${detailRow(icons.document, "Referência", escapeHtml(data.reference))}
        ${detailRow(icons.card, "Forma de pagamento", escapeHtml(data.paymentMethod))}
        ${detailRow(icons.card, "Bandeira", brandBadge)}
        ${detailRow(icons.chart, "Parcelamento", escapeHtml(`${data.installments}x de ${money(data.installmentValue)}`))}
        ${detailRow(icons.wallet, "Pra receber", escapeHtml(netValue), "receive")}
        ${detailRow(icons.percent, "Taxa Mercado Pago", escapeHtml(percentage(data.feePercent, 2)))}
        ${detailRow(icons.trend, "Taxa a.m.", escapeHtml(truncatedPercentage(data.monthlyRate, 2)))}
        ${detailRow(icons.document, "Nome na fatura", escapeHtml(data.statementDescriptor))}
      </section>
      <section class="security-note">
        <div class="lock-circle">${icons.lock}</div>
        <div>
          <div class="security-title">Estorno protegido por senha do administrador</div>
          <div class="security-text">Para solicitar estornos, é obrigatória a autenticação com a senha do administrador do sistema.</div>
        </div>
      </section>
      <div class="divider"></div>
      <div class="actions">
        <button type="button" class="action-button print-button" onclick="window.parent.postMessage({type:'premium-receipt-print'},'*')">${icons.printer}<span>Imprimir</span></button>
        <button type="button" class="action-button pdf-button" onclick="window.parent.postMessage({type:'premium-receipt-download'},'*')">${icons.pdf}<span>Baixar PDF</span></button>
      </div>
    </article>
  </main>
</body>
</html>`;
};

export const openPremiumPaymentReceipt = ({ sale = null, payment = null }) => {
  if (typeof window === "undefined") return;

  const data = normalizeReceipt({ sale, payment });
  document.getElementById("premium-payment-receipt-modal")?.remove();

  const previousBodyOverflow = document.body.style.overflow;
  const overlay = document.createElement("div");
  const modal = document.createElement("div");
  const header = document.createElement("div");
  const title = document.createElement("div");
  const closeButton = document.createElement("button");
  const frame = document.createElement("iframe");

  overlay.id = "premium-payment-receipt-modal";
  overlay.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:14px;background:rgba(2,6,23,.84);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);isolation:isolate";
  modal.style.cssText = "width:min(1120px,100%);height:min(96vh,1040px);display:flex;flex-direction:column;overflow:hidden;border-radius:28px;background:#fff;box-shadow:0 32px 100px rgba(0,0,0,.42)";
  header.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 18px;background:#020617;border-bottom:1px solid #1e293b;color:#fff;flex-shrink:0";
  title.innerHTML = '<div style="font:900 10px Arial,sans-serif;letter-spacing:2px;color:#93c5fd">PORTABILIDADE PRO</div><div style="margin-top:4px;font:800 18px Arial,sans-serif;color:#fff">Comprovante de Pagamento</div>';
  closeButton.type = "button";
  closeButton.innerHTML = "&times;";
  closeButton.setAttribute("aria-label", "Fechar comprovante");
  closeButton.style.cssText = "width:42px;height:42px;border:0;border-radius:12px;background:rgba(255,255,255,.1);color:#fff;font-size:28px;font-weight:700;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center";
  frame.title = "Comprovante de Pagamento";
  frame.style.cssText = "width:100%;height:100%;min-height:0;flex:1;border:0;background:#092e8c";
  frame.srcdoc = buildReceiptHtml(data);

  const closeModal = () => {
    document.body.style.overflow = previousBodyOverflow;
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("message", handleMessage);
    overlay.remove();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") closeModal();
  };

  const handleMessage = async (event) => {
    if (event.source !== frame.contentWindow) return;

    if (event.data?.type === "premium-receipt-close") {
      closeModal();
      return;
    }

    if (event.data?.type === "premium-receipt-print") {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      return;
    }

    if (event.data?.type === "premium-receipt-download") {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    }
  };

  closeButton.addEventListener("click", closeModal);
  overlay.addEventListener("mousedown", (event) => {
    if (event.target === overlay) closeModal();
  });
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("message", handleMessage);

  header.appendChild(title);
  header.appendChild(closeButton);
  modal.appendChild(header);
  modal.appendChild(frame);
  overlay.appendChild(modal);
  document.body.style.overflow = "hidden";
  document.body.appendChild(overlay);
};
