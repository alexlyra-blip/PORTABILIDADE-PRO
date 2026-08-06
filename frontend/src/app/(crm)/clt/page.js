"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "@/utils/api";
import { useToast } from "@/components/ToastProvider";

const Icon = {
  Sparkles: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.8 4.5L6 9.3l4.2 1.8L12 16l1.8-4.9L18 9.3l-4.2-1.8L12 3Z" />
      <path d="m5 16-.9 2.1L2 19l2.1.9L5 22l.9-2.1L8 19l-2.1-.9L5 16Z" />
      <path d="m19 13-.9 2.1L16 16l2.1.9L19 19l.9-2.1L22 16l-2.1-.9L19 13Z" />
    </svg>
  ),

  User: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  ),

  Phone: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9Z" />
    </svg>
  ),

  Mail: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  ),

  Document: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M7 8h10M7 12h10M7 16h6" />
    </svg>
  ),

  Link: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" />
    </svg>
  ),

  Copy: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),

  External: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M15 3h6v6" />
      <path d="m10 14 11-11" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  ),

  Refresh: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20 6v5h-5" />
      <path d="M4 18v-5h5" />
      <path d="M18.5 9A7 7 0 0 0 6.7 6.7L4 11" />
      <path d="M5.5 15A7 7 0 0 0 17.3 17.3L20 13" />
    </svg>
  ),

  Check: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  ),

  Shield: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),

  Building: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 21h18" />
      <path d="M6 21V5l6-3 6 3v16" />
      <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h.01M15 17h.01" />
    </svg>
  ),

  Wallet: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v12H5a3 3 0 0 1-3-3V6" />
      <path d="M16 13h4" />
    </svg>
  ),

  Chart: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 3v18h18" />
      <path d="m7 16 4-5 3 3 5-7" />
    </svg>
  ),

  Alert: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  ),

  Clock: ({ className = "w-5 h-5" }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
};

const formatBRL = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

const maskCPF = (value) => {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 11);

  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

const maskCNPJ = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) return maskCPF(digits);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

const maskPhone = (value) => {
  let digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 13);

  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }

  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
};

const getErrorMessage = (error) => {
  if (typeof error === "string") {
    return error;
  }

  return (
    error?.response?.data?.detail ||
    error?.data?.detail ||
    error?.detail ||
    error?.message ||
    "Não foi possível concluir a consulta."
  );
};

const normalizeErrorText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

const parseApiError = (error) => {
  const safeSerialize = (value) => {
    if (value === undefined || value === null) {
      return "";
    }

    if (typeof value === "string") {
      return value;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const rawParts = [
    typeof error === "string" ? error : "",
    error?.message,
    error?.detail,
    error?.data,
    error?.response?.data,
    error?.response?.data?.detail,
  ]
    .map(safeSerialize)
    .filter(Boolean);

  const originalMessage = rawParts.join(" ");

  let payload =
    error?.response?.data ||
    error?.data ||
    null;

  if (typeof payload === "string") {
    const jsonStart = payload.indexOf("{");

    if (jsonStart >= 0) {
      try {
        payload = JSON.parse(payload.slice(jsonStart));
      } catch {
        payload = null;
      }
    } else {
      payload = null;
    }
  }

  if (!payload) {
    const jsonStart = originalMessage.indexOf("{");

    if (jsonStart >= 0) {
      try {
        payload = JSON.parse(
          originalMessage.slice(jsonStart)
        );
      } catch {
        payload = null;
      }
    }
  }

  if (
    payload?.detail &&
    typeof payload.detail === "object"
  ) {
    payload = payload.detail;
  }

  const errors = Array.isArray(payload?.errors)
    ? payload.errors
    : payload?.errors
      ? [payload.errors]
      : [];

  const errorCodes = Array.isArray(
    payload?.errorCodes
  )
    ? payload.errorCodes
    : Array.isArray(payload?.error_codes)
      ? payload.error_codes
      : payload?.errorCode
        ? [payload.errorCode]
        : [];

  const detailMessage =
    typeof payload?.detail === "string"
      ? payload.detail
      : "";

  const apiMessage = String(
    errors.find(Boolean) ||
      payload?.message ||
      detailMessage ||
      getErrorMessage(error)
  ).trim();

  return {
    apiMessage,
    errorCodes: errorCodes.map(String),
    searchable: normalizeErrorText(
      [
        originalMessage,
        apiMessage,
        ...errorCodes,
        ...errors,
      ].join(" ")
    ),
  };
};

const getBusinessError = (error) => {
  const parsed = parseApiError(error);

  const includesAny = (...terms) =>
    terms.some((term) =>
      parsed.searchable.includes(
        normalizeErrorText(term)
      )
    );

  const makeResult = ({
    status,
    title,
    description,
    fallbackReason,
    fallbackCode,
  }) => ({
    status,
    title,
    description,
    reason:
      parsed.apiMessage || fallbackReason,
    code:
      parsed.errorCodes[0] || fallbackCode,
  });

  if (
    includesAny(
      "MARGEM_OU_VALOR_INSUFICIENTE",
      "VALOR MÁXIMO PERMITIDO",
      "VALOR MAXIMO PERMITIDO",
      "VALOR SOLICITADO",
      "MARGEM INSUFICIENTE"
    )
  ) {
    return makeResult({
      status: "ajuste_simulacao",
      title: "Simular com valores personalizados",
      description:
        "O cliente está apto para uma nova tentativa com uma parcela ou valor de contrato menor.",
      fallbackReason:
        "O valor solicitado ultrapassa o limite permitido para as tabelas disponíveis.",
      fallbackCode:
        "MARGEM_OU_VALOR_INSUFICIENTE",
    });
  }

  if (
    includesAny(
      "EMPRESA_NAO_ELEGIVEL",
      "EMPRESA NÃO ELEGÍVEL",
      "EMPRESA NAO ELEGIVEL"
    )
  ) {
    return makeResult({
      status: "empresa_nao_elegivel",
      title: "Cliente não elegível",
      description:
        "A empresa vinculada ao cliente não atende aos critérios para esta operação CLT.",
      fallbackReason: "Empresa não elegível.",
      fallbackCode: "EMPRESA_NAO_ELEGIVEL",
    });
  }

  if (
    includesAny(
      "CLIENTE_SEM_MARGEM",
      "SEM_MARGEM",
      "SEM MARGEM"
    )
  ) {
    return makeResult({
      status: "sem_margem",
      title: "Cliente sem margem",
      description:
        "O cliente não possui margem disponível para gerar uma oferta neste momento.",
      fallbackReason:
        "Cliente sem margem disponível.",
      fallbackCode: "SEM_MARGEM",
    });
  }

  if (
    includesAny(
      "SEM_VINCULO_ELEGIVEL",
      "VÍNCULO NÃO ELEGÍVEL",
      "VINCULO NAO ELEGIVEL",
      "SEM VÍNCULO ELEGÍVEL",
      "SEM VINCULO ELEGIVEL"
    )
  ) {
    return makeResult({
      status: "sem_vinculo_elegivel",
      title: "Cliente não elegível",
      description:
        "Nenhum vínculo empregatício elegível foi localizado para o cliente.",
      fallbackReason:
        "Nenhum vínculo elegível foi encontrado.",
      fallbackCode: "SEM_VINCULO_ELEGIVEL",
    });
  }

  if (
    includesAny(
      "CLIENTE_NAO_ELEGIVEL",
      "CLIENTE NÃO ELEGÍVEL",
      "CLIENTE NAO ELEGIVEL",
      "NAO_ELEGIVEL",
      "NÃO ELEGÍVEL"
    )
  ) {
    return makeResult({
      status: "cliente_nao_elegivel",
      title: "Cliente não elegível",
      description:
        "O cliente não atende aos critérios de elegibilidade informados pela instituição.",
      fallbackReason: "Cliente não elegível.",
      fallbackCode: "CLIENTE_NAO_ELEGIVEL",
    });
  }

  if (
    includesAny(
      "SEM_OFERTAS",
      "SEM OFERTAS",
      "NENHUMA OFERTA"
    )
  ) {
    return makeResult({
      status: "sem_ofertas",
      title: "Nenhuma oferta disponível",
      description:
        "A análise foi concluída, mas nenhuma condição comercial foi retornada.",
      fallbackReason:
        "Nenhuma oferta disponível para o cliente.",
      fallbackCode: "SEM_OFERTAS",
    });
  }

  return null;
};

const STATUS_LABELS = {
  completed: "Consulta concluída",
  awaiting_authorization: "Aguardando autorização",
  dados_incompletos: "Dados incompletos",
  requires_selection: "Selecione o vínculo",
  ajuste_simulacao: "Ajuste necessário",
  empresa_nao_elegivel: "Cliente não elegível",
  cliente_nao_elegivel: "Cliente não elegível",
  sem_vinculo_elegivel: "Cliente não elegível",
  sem_margem: "Cliente sem margem",
  sem_ofertas: "Sem ofertas disponíveis",
  banco_indisponivel: "Consulta pendente no banco",
  erro_presenca: "Aviso na consulta",
};

const NEGATIVE_STATUS_CONTENT = {
  empresa_nao_elegivel: {
    title: "Cliente não elegível",
    description:
      "A empresa vinculada ao cliente não atende aos critérios para esta operação CLT.",
    reason: "Empresa não elegível.",
    code: "EMPRESA_NAO_ELEGIVEL",
  },
  cliente_nao_elegivel: {
    title: "Cliente não elegível",
    description:
      "O cliente não atende aos critérios de elegibilidade informados pela instituição.",
    reason: "Cliente não elegível.",
    code: "CLIENTE_NAO_ELEGIVEL",
  },
  sem_vinculo_elegivel: {
    title: "Cliente não elegível",
    description:
      "Nenhum vínculo empregatício elegível foi localizado para o cliente.",
    reason: "Nenhum vínculo elegível foi encontrado.",
    code: "SEM_VINCULO_ELEGIVEL",
  },
  sem_margem: {
    title: "Cliente sem margem",
    description:
      "O cliente não possui margem disponível para gerar uma oferta neste momento.",
    reason: "Cliente sem margem disponível.",
    code: "SEM_MARGEM",
  },
  sem_ofertas: {
    title: "Nenhuma oferta disponível",
    description:
      "A análise foi concluída, mas nenhuma condição comercial foi retornada.",
    reason: "Nenhuma oferta disponível para o cliente.",
    code: "SEM_OFERTAS",
  },
  banco_indisponivel: {
    title: "Consulta pendente no banco",
    description:
      "A consulta está em fila de processamento no banco ou aguardando liberação da esteira.",
    reason: "Já existe uma consulta em andamento para este cliente ou o banco está temporariamente indisponível.",
    code: "BANCO_INDISPONIVEL",
  },
  erro_presenca: {
    title: "Aviso da instituição",
    description:
      "A instituição financeira retornou um comunicado sobre a consulta deste CPF.",
    reason: "Verifique a mensagem retornada pela esteira bancária.",
    code: "AVISO_BANCO",
  },
};

const getBankResult = (result) => {
  const banks = Array.isArray(result?.bancos)
    ? result.bancos
    : [];

  return (
    banks.find(
      (bank) => bank?.banco_id === "presenca_bank"
    ) ||
    banks[0] ||
    null
  );
};

const GlassCard = ({
  children,
  className = "",
}) => (
  <div
    className={[
      "relative overflow-hidden rounded-[28px]",
      "border border-white/70 dark:border-white/10",
      "bg-white/80 dark:bg-slate-900/75",
      "backdrop-blur-2xl",
      "shadow-[0_25px_80px_-35px_rgba(15,23,42,0.45)]",
      className,
    ].join(" ")}
  >
    {children}
  </div>
);

const MetricCard = ({
  title,
  value,
  description,
  icon,
  accent = "blue",
}) => {
  const styles = {
    blue: "from-blue-500/15 to-indigo-500/5 text-blue-600 dark:text-blue-400",
    green:
      "from-emerald-500/15 to-teal-500/5 text-emerald-600 dark:text-emerald-400",
    violet:
      "from-violet-500/15 to-purple-500/5 text-violet-600 dark:text-violet-400",
  };

  return (
    <div
      className={`rounded-3xl border border-slate-200/70 dark:border-white/10 bg-gradient-to-br ${styles[accent]} p-5`}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          {title}
        </p>

        <div className="rounded-2xl bg-white/80 p-2.5 shadow-sm dark:bg-white/10">
          {icon}
        </div>
      </div>

      <p className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
        {value}
      </p>

      <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
};

export default function CltMultibancosPage() {
  const toast = useToast();

  const [form, setForm] = useState({
    cpf: "",
    nome: "",
    telefone: "",
    email: "",
    vinculo_index: null,
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [authorized, setAuthorized] = useState(false);
  const [businessError, setBusinessError] = useState(null);
  const [adjustment, setAdjustment] = useState({
    mode: "parcela",
    valor_parcela: "",
    valor_solicitado: "",
    quantidade_parcelas: "",
  });

  useEffect(() => {
    const hostname = window.location.hostname;

    const isLocalPreview =
      hostname === "localhost" ||
      hostname === "127.0.0.1";

    // Permite somente a visualização local durante
    // o desenvolvimento. Em produção, a proteção
    // de autenticação permanece ativa.
    if (isLocalPreview) {
      return;
    }

    try {
      const userRaw = localStorage.getItem("user");

      if (!userRaw) {
        window.location.href = "/login";
        return;
      }

      const user = JSON.parse(userRaw);

      if (
        user.role !== "admin" &&
        !user.can_consult_cpf
      ) {
        window.location.href = "/simulador";
      }
    } catch {
      window.location.href = "/login";
    }
  }, []);

  const bankResult = useMemo(
    () => getBankResult(result),
    [result]
  );

  const authorization = useMemo(() => {
    if (result?.autorizacao) {
      return result.autorizacao;
    }

    if (
      bankResult?.authorization_url ||
      bankResult?.autorizacao_id
    ) {
      return {
        banco: bankResult?.banco || "Presença Bank",
        banco_id:
          bankResult?.banco_id || "presenca_bank",
        url: bankResult?.authorization_url,
        id: bankResult?.autorizacao_id,
      };
    }

    return null;
  }, [result, bankResult]);

  const offers = useMemo(() => {
    return Array.isArray(bankResult?.ofertas)
      ? bankResult.ofertas
      : [];
  }, [bankResult]);

  const bestOffer = useMemo(() => {
    if (bankResult?.melhor_oferta) {
      return bankResult.melhor_oferta;
    }

    if (!offers.length) {
      return null;
    }

    return offers.reduce((best, current) => {
      return Number(current?.valor_liberado || 0) >
        Number(best?.valor_liberado || 0)
        ? current
        : best;
    }, offers[0]);
  }, [bankResult, offers]);

  const margins = bankResult?.margens || {};

  const simulationContext =
    bankResult?.contexto_simulacao ||
    result?.contexto_simulacao ||
    null;

  const adjustmentLimits = Array.isArray(
    bankResult?.limites_permitidos
  )
    ? bankResult.limites_permitidos
    : Array.isArray(result?.limites_permitidos)
      ? result.limites_permitidos
      : [];

  const eligibleLinks = Array.isArray(
    bankResult?.vinculos
  )
    ? bankResult.vinculos
    : [];

  const status =
    result?.status ||
    bankResult?.status ||
    "idle";

  const isAdjustmentStatus =
    status === "ajuste_simulacao";

  const isNegativeStatus = Boolean(
    NEGATIVE_STATUS_CONTENT[status] ||
    (status !== "completed" &&
      status !== "idle" &&
      status !== "awaiting_authorization" &&
      status !== "requires_selection" &&
      status !== "dados_incompletos" &&
      status !== "ajuste_simulacao")
  );

  const negativeResult =
    businessError ||
    NEGATIVE_STATUS_CONTENT[status] ||
    (isNegativeStatus
      ? {
          title: STATUS_LABELS[status] || "Aviso na consulta",
          description: "A instituição financeira retornou um status para esta consulta.",
          reason: bankResult?.mensagem || result?.mensagem || "Aguardando retorno do banco.",
          code: status ? status.toUpperCase() : "AVISO_BANCO",
        }
      : null);

  const statusTitle =
    businessError?.title ||
    STATUS_LABELS[status] ||
    "Consulta processada";

  const negativeReason =
    businessError?.reason ||
    (Array.isArray(result?.errors)
      ? result.errors[0]
      : null) ||
    result?.mensagem ||
    bankResult?.mensagem ||
    negativeResult?.reason ||
    "A instituição não retornou detalhes adicionais.";

  const negativeCode =
    businessError?.code ||
    (Array.isArray(result?.errorCodes)
      ? result.errorCodes[0]
      : null) ||
    result?.errorCode ||
    negativeResult?.code ||
    null;

  const currentStep =
    status === "completed" ||
    status === "ajuste_simulacao"
      ? 3
      : status === "awaiting_authorization" ||
          status === "requires_selection"
        ? 2
        : 1;

  const updateFormFromResponse = (response) => {
    const responseBank = getBankResult(response);

    const customer =
      response?.cliente ||
      responseBank?.cliente ||
      {};

    setForm((previous) => ({
      ...previous,
      nome:
        customer?.nome ||
        previous.nome,
      telefone:
        customer?.telefone ||
        previous.telefone,
      email:
        customer?.email ||
        previous.email,
    }));
  };

  const executeQuery = async (
    overrides = {}
  ) => {
    const payload = {
      cpf: form.cpf.replace(/\D/g, ""),
      nome:
        String(
          overrides.nome ?? form.nome
        ).trim() || null,
      telefone:
        String(
          overrides.telefone ?? form.telefone
        ).replace(/\D/g, "") || null,
      email:
        String(
          overrides.email ?? form.email
        ).trim() || null,
      vinculo_index:
        overrides.vinculo_index ??
        form.vinculo_index ??
        null,
      valor_parcela:
        overrides.valor_parcela ?? null,
      valor_solicitado:
        overrides.valor_solicitado ?? null,
      quantidade_parcelas:
        overrides.quantidade_parcelas ?? null,
    };

    if (payload.cpf.length !== 11) {
      toast.warning(
        "Informe um CPF válido com 11 dígitos."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        "/clt/consulta",
        payload
      );

      setBusinessError(null);
      setResult(response);
      updateFormFromResponse(response);
      setLastUpdated(new Date());

      const responseStatus =
        response?.status ||
        getBankResult(response)?.status;

      if (
        responseStatus ===
        "dados_incompletos"
      ) {
        const pending =
          response?.campos_pendentes || [];

        toast.warning(
          pending.length
            ? `Complete os campos: ${pending.join(", ")}.`
            : "Complete os dados do cliente."
        );
      } else if (
        responseStatus ===
        "awaiting_authorization"
      ) {
        setAuthorized(false);

        toast.success(
          "Link de autorização gerado com sucesso."
        );
      } else if (
        responseStatus === "requires_selection"
      ) {
        toast.warning(
          "Selecione o vínculo empregatício que deseja consultar."
        );
      } else if (
        responseStatus === "completed"
      ) {
        setAuthorized(true);

        toast.success(
          "Consulta CLT e simulação concluídas."
        );
      } else if (
        responseStatus ===
        "sem_vinculo_elegivel"
      ) {
        toast.warning(
          "Nenhum vínculo elegível foi encontrado."
        );
      } else if (
        responseStatus === "sem_margem"
      ) {
        toast.warning(
          "O cliente não possui margem disponível."
        );
      } else if (
        responseStatus === "ajuste_simulacao"
      ) {
        setAuthorized(true);

        toast.warning(
          "A autorização foi concluída. Ajuste o valor para refazer a simulação."
        );
      } else if (
        responseStatus === "sem_ofertas"
      ) {
        toast.warning(
          "A consulta foi concluída, mas não retornou ofertas."
        );
      }
    } catch (error) {
      const ruleError = getBusinessError(error);

      if (ruleError) {
        const requiresAdjustment =
          ruleError.status === "ajuste_simulacao";

        setBusinessError(
          requiresAdjustment ? null : ruleError
        );
        setAuthorized(requiresAdjustment);
        setLastUpdated(new Date());
        setResult({
          success: false,
          status: ruleError.status,
          mensagem: ruleError.reason,
          errors: [ruleError.reason],
          errorCodes: [ruleError.code],
          bancos: [
            {
              banco_id: "presenca_bank",
              banco: "Presença Bank",
              status: ruleError.status,
              margens:
                bankResult?.margens || {},
              vinculos:
                bankResult?.vinculos || [],
              ofertas: [],
            },
          ],
        });

        return;
      }

      console.error(
        "Erro técnico na consulta CLT:",
        error
      );

      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await executeQuery();
  };

  const handleRefresh = async () => {
    await executeQuery();
  };

  const handleSelectLink = async (index) => {
    setForm((previous) => ({
      ...previous,
      vinculo_index: index,
    }));

    await executeQuery({
      vinculo_index: index,
    });
  };

  const handleAdjustmentSubmit = async (event) => {
    event.preventDefault();

    const parseNumber = (value) => {
      const raw = String(value || "").trim();
      const normalized = raw.includes(",")
        ? raw.replace(/\./g, "").replace(",", ".")
        : raw;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const quantidadeParcelas = Number(
      adjustment.quantidade_parcelas || 0
    );

    const payload = {
      ...(simulationContext || {}),
      cpf: form.cpf.replace(/\D/g, ""),
      nome: simulationContext?.nome || form.nome,
      telefone:
        simulationContext?.telefone ||
        form.telefone.replace(/\D/g, ""),
      email: simulationContext?.email || form.email,
      valor_parcela: null,
      valor_solicitado: null,
      quantidade_parcelas: quantidadeParcelas || null,
    };

    if (adjustment.mode === "parcela") {
      const valorParcela = parseNumber(adjustment.valor_parcela);
      if (valorParcela <= 0) {
        toast.warning("Informe o novo valor da parcela.");
        return;
      }

      const margemDisponivel = Number(margins?.disponivel || 0);
      if (margemDisponivel > 0 && valorParcela > margemDisponivel) {
        toast.warning(
          `Informe uma parcela de até ${formatBRL(margemDisponivel)}.`
        );
        return;
      }

      payload.valor_parcela = valorParcela;
    } else {
      const valorSolicitado = parseNumber(adjustment.valor_solicitado);
      if (valorSolicitado <= 0) {
        toast.warning("Informe o novo valor do contrato.");
        return;
      }
      payload.valor_solicitado = valorSolicitado;
    }

    setLoading(true);

    try {
      const response = await api.post("/clt/simular", payload);
      setBusinessError(null);
      setResult(response);
      updateFormFromResponse(response);
      setLastUpdated(new Date());

      const responseStatus =
        response?.status || getBankResult(response)?.status;

      if (responseStatus === "completed") {
        setAuthorized(true);
        toast.success(
          "Simulação gerada com os valores informados."
        );
      } else if (responseStatus === "ajuste_simulacao") {
        setAuthorized(true);
        toast.warning(
          "O valor ainda ultrapassa o limite de uma ou mais tabelas. Ajuste novamente."
        );
      } else if (responseStatus === "sem_ofertas") {
        toast.warning(
          "A simulação foi processada, mas não retornou ofertas."
        );
      }
    } catch (error) {
      console.error("Erro ao gerar simulação CLT:", error);

      const ruleError = getBusinessError(error);
      if (ruleError?.status === "ajuste_simulacao") {
        setResult((previous) => ({
          ...(previous || {}),
          status: "ajuste_simulacao",
          mensagem: ruleError.reason,
          errors: [ruleError.reason],
          errorCodes: [ruleError.code],
        }));
        toast.warning(
          "O valor ainda ultrapassa o limite permitido. Ajuste novamente."
        );
      } else {
        toast.error(getErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  const copyAuthorization = async () => {
    if (!authorization?.url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        authorization.url
      );

      toast.success(
        "Link de autorização copiado."
      );
    } catch {
      toast.error(
        "Não foi possível copiar o link."
      );
    }
  };

  const openAuthorization = () => {
    if (!authorization?.url) {
      return;
    }

    window.open(
      authorization.url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const resetQuery = () => {
    setForm({
      cpf: "",
      nome: "",
      telefone: "",
      email: "",
      vinculo_index: null,
    });

    setResult(null);
    setAuthorized(false);
    setBusinessError(null);
    setLastUpdated(null);
  };

  return (
    <div className="relative mx-auto max-w-[1500px] pb-14">
      <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-blue-500/15 blur-[100px]" />
      <div className="pointer-events-none absolute right-0 top-28 h-80 w-80 rounded-full bg-violet-500/10 blur-[120px]" />

      <motion.section
        initial={{
          opacity: 0,
          y: 18,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="relative mb-7 overflow-hidden rounded-[34px] border border-blue-400/20 bg-gradient-to-br from-[#061b49] via-[#0b3c91] to-[#161b54] p-6 text-white shadow-[0_35px_100px_-35px_rgba(30,64,175,0.8)] md:p-9"
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/30" />
          <div className="absolute -right-8 -top-10 h-56 w-56 rounded-full border border-white/20" />
          <div className="absolute bottom-0 left-1/3 h-px w-1/2 bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
        </div>

        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-xl">
              <Icon.Sparkles className="h-4 w-4 text-cyan-300" />

              <span className="text-[10px] font-black uppercase tracking-[0.24em]">
                Inteligência Multibancos
              </span>
            </div>

            <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight md:text-5xl">
              Consulta e Simulação
              <span className="block bg-gradient-to-r from-cyan-300 via-white to-blue-200 bg-clip-text text-transparent">
                CLT Multibancos
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-sm font-medium leading-7 text-blue-100/85 md:text-base">
              Consulte os dados do cliente,
              gere a autorização e compare as
              melhores ofertas em uma única
              experiência.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              {
                number: "01",
                label: "Dados",
              },
              {
                number: "02",
                label: "Autorização",
              },
              {
                number: "03",
                label: "Ofertas",
              },
            ].map((step, index) => {
              const stepNumber = index + 1;
              const active =
                stepNumber <= currentStep;

              return (
                <div
                  key={step.number}
                  className={[
                    "rounded-3xl border p-4 text-center transition-all",
                    active
                      ? "border-cyan-300/40 bg-white/15 shadow-lg"
                      : "border-white/10 bg-black/10 opacity-55",
                  ].join(" ")}
                >
                  <p className="text-lg font-black text-cyan-300">
                    {step.number}
                  </p>

                  <p className="mt-1 text-[9px] font-black uppercase tracking-[0.18em]">
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>

      <div className="grid gap-7 xl:grid-cols-[420px_minmax(0,1fr)]">
        <GlassCard className="h-fit">
          <div className="border-b border-slate-200/70 p-6 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-3 text-white shadow-lg shadow-blue-500/20">
                <Icon.User />
              </div>

              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-white">
                  Dados do cliente
                </h2>

                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Preencha os dados disponíveis
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 p-6"
          >
            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                CPF
              </span>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-white/10 dark:bg-slate-950/50">
                <Icon.Document className="h-4 w-4 text-blue-500" />

                <input
                  value={form.cpf}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      cpf: maskCPF(
                        event.target.value
                      ),
                    }))
                  }
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  className="h-14 w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Nome completo
              </span>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-white/10 dark:bg-slate-950/50">
                <Icon.User className="h-4 w-4 text-violet-500" />

                <input
                  value={form.nome}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      nome: event.target.value,
                    }))
                  }
                  placeholder="Pode ser preenchido automaticamente"
                  className="h-14 w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Telefone do cliente
              </span>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-white/10 dark:bg-slate-950/50">
                <Icon.Phone className="h-4 w-4 text-emerald-500" />

                <input
                  value={form.telefone}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      telefone: maskPhone(
                        event.target.value
                      ),
                    }))
                  }
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                  className="h-14 w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                />
              </div>

              <p className="mt-2 text-[10px] font-semibold text-slate-400">
                Nunca utilizamos o telefone do
                corretor como telefone do cliente.
              </p>
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                E-mail
              </span>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-white/10 dark:bg-slate-950/50">
                <Icon.Mail className="h-4 w-4 text-cyan-500" />

                <input
                  value={form.email}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      email: event.target.value,
                    }))
                  }
                  placeholder="cliente@email.com"
                  type="email"
                  className="h-14 w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="group relative flex h-15 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-white shadow-xl shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition duration-700 group-hover:translate-x-[100%]" />

              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Consultando...
                </>
              ) : (
                <>
                  <Icon.Sparkles className="h-5 w-5" />
                  Consultar CLT
                </>
              )}
            </button>

            {result && (
              <button
                type="button"
                onClick={resetQuery}
                className="w-full rounded-2xl border border-slate-200 px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
              >
                Fazer nova consulta
              </button>
            )}
          </form>
        </GlassCard>

        <div className="space-y-7">
          <AnimatePresence mode="wait">
            {!result && !loading && (
              <motion.div
                key="welcome"
                initial={{
                  opacity: 0,
                  y: 14,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                }}
              >
                <GlassCard className="p-8 md:p-10">
                  <div className="mx-auto max-w-xl text-center">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-2xl shadow-blue-500/30">
                      <Icon.Chart className="h-9 w-9" />
                    </div>

                    <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                      Motor CLT Multibancos
                    </h2>

                    <p className="mt-4 text-sm font-medium leading-7 text-slate-500 dark:text-slate-400">
                      O sistema consulta os dados,
                      gera a autorização e organiza
                      as ofertas de cada banco em um
                      painel único.
                    </p>
                  </div>

                  <div className="mt-9 grid gap-4 md:grid-cols-3">
                    {[
                      {
                        icon: (
                          <Icon.User className="h-5 w-5" />
                        ),
                        title: "Dados inteligentes",
                        text: "Integração com a consulta CLT.",
                      },
                      {
                        icon: (
                          <Icon.Shield className="h-5 w-5" />
                        ),
                        title: "Autorização segura",
                        text: "Link individual para o cliente.",
                      },
                      {
                        icon: (
                          <Icon.Building className="h-5 w-5" />
                        ),
                        title: "Multibancos",
                        text: "Estrutura preparada para expansão.",
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="rounded-3xl border border-slate-200/70 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="mb-4 inline-flex rounded-2xl bg-blue-600/10 p-3 text-blue-600 dark:text-blue-400">
                          {item.icon}
                        </div>

                        <h3 className="text-sm font-black text-slate-900 dark:text-white">
                          {item.title}
                        </h3>

                        <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                <GlassCard className="p-7">
                  <div className="animate-pulse space-y-5">
                    <div className="h-6 w-48 rounded-xl bg-slate-200 dark:bg-white/10" />
                    <div className="h-4 w-3/4 rounded-xl bg-slate-200 dark:bg-white/10" />

                    <div className="grid gap-4 md:grid-cols-3">
                      {[1, 2, 3].map((item) => (
                        <div
                          key={item}
                          className="h-32 rounded-3xl bg-slate-200 dark:bg-white/10"
                        />
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {result && !loading && (
              <motion.div
                key={status}
                initial={{
                  opacity: 0,
                  y: 16,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                }}
                className="space-y-7"
              >
                <GlassCard className="p-6">
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={[
                          "flex h-14 w-14 items-center justify-center rounded-2xl",
                          status === "completed"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : status === "awaiting_authorization"
                              ? "bg-amber-500/10 text-amber-600"
                              : isAdjustmentStatus
                                ? "bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/10"
                              : isNegativeStatus
                                ? "bg-red-500/10 text-red-600 ring-1 ring-red-500/10"
                                : "bg-blue-500/10 text-blue-600",
                        ].join(" ")}
                      >
                        {status === "completed" ? (
                          <Icon.Check className="h-7 w-7" />
                        ) : status ===
                          "awaiting_authorization" ? (
                          <Icon.Clock className="h-7 w-7" />
                        ) : isAdjustmentStatus ? (
                          <Icon.Refresh className="h-7 w-7" />
                        ) : isNegativeStatus ? (
                          <Icon.Alert className="h-7 w-7" />
                        ) : (
                          <Icon.Sparkles className="h-7 w-7" />
                        )}
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                          Status da consulta
                        </p>

                        <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                          {statusTitle}
                        </h2>
                      </div>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                        Última atualização
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                        {lastUpdated
                          ? lastUpdated.toLocaleTimeString(
                              "pt-BR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              }
                            )
                          : "—"}
                      </p>
                    </div>
                  </div>
                </GlassCard>

                {/* Dados do Empregador */}
                {(() => {
                  const emp = result?.empresa || bankResult?.empresa || dadosMulticorban?.empresa;
                  const razaoSocial = emp?.razao_social || result?.razao_social || "Não Informada";
                  const cnpjEmpresa = emp?.cnpj || bankResult?.cnpj_empregador || (eligibleLinks.length > 0 ? eligibleLinks[0]?.cnpj_empregador : "") || "Não Informado";
                  const totalRegs = emp?.quantidade_funcionarios || eligibleLinks.length || 0;

                  return (
                    <GlassCard className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/20">
                          <Icon.Building className="h-5 w-5 text-indigo-500" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                          Dados do Empregador
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-white/10">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Razão Social</p>
                          <p className="text-sm font-black text-slate-800 dark:text-white uppercase">{razaoSocial}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-white/10">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CNPJ do Empregador</p>
                          <p className="text-sm font-black text-slate-800 dark:text-white">{cnpjEmpresa ? maskCNPJ(cnpjEmpresa) : "Não Informado"}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-white/10">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Registros (Funcionários)</p>
                          <p className="text-sm font-black text-slate-800 dark:text-white">{totalRegs}</p>
                        </div>
                      </div>
                    </GlassCard>
                  );
                })()}

                {status === "dados_incompletos" && (
                  <GlassCard className="border-amber-300/40 p-6">
                    <div className="flex gap-4">
                      <div className="h-fit rounded-2xl bg-amber-500/10 p-3 text-amber-600">
                        <Icon.User />
                      </div>

                      <div>
                        <h3 className="font-black text-slate-950 dark:text-white">
                          Complete os dados do
                          cliente
                        </h3>

                        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                          {result?.mensagem ||
                            "Preencha os campos pendentes para continuar."}
                        </p>

                        {Array.isArray(
                          result?.campos_pendentes
                        ) && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {result.campos_pendentes.map(
                              (field) => (
                                <span
                                  key={field}
                                  className="rounded-full bg-amber-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400"
                                >
                                  {field}
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                )}

                {authorization?.url &&
                  !isNegativeStatus &&
                  !isAdjustmentStatus && (
                  <GlassCard className="border-blue-400/30">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
                      <div className="flex items-center gap-4">
                        <div className="rounded-2xl bg-white/15 p-3">
                          <Icon.Shield className="h-7 w-7" />
                        </div>

                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-100">
                            Autorização necessária
                          </p>

                          <h3 className="mt-1 text-xl font-black">
                            Envie o link ao cliente
                          </h3>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <p className="text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                        O cliente deve abrir o link
                        e concluir pessoalmente a
                        autorização da consulta.
                      </p>

                      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/60">
                        <div className="flex items-center gap-3">
                          <Icon.Link className="h-5 w-5 shrink-0 text-blue-500" />

                          <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                            {authorization.url}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={copyAuthorization}
                          className="flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-blue-700 transition hover:bg-blue-100 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300"
                        >
                          <Icon.Copy className="h-4 w-4" />
                          Copiar link
                        </button>

                        <button
                          type="button"
                          onClick={openAuthorization}
                          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5"
                        >
                          <Icon.External className="h-4 w-4" />
                          Abrir autorização
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={loading}
                        className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300"
                      >
                        <Icon.Refresh className="h-5 w-5" />
                        Atualizar consulta após
                        autorização
                      </button>
                    </div>
                  </GlassCard>
                )}

                {status === "requires_selection" &&
                  eligibleLinks.length > 0 && (
                    <GlassCard className="p-6">
                      <h3 className="text-lg font-black text-slate-950 dark:text-white">
                        Selecione o vínculo
                        empregatício
                      </h3>

                      <p className="mt-2 text-sm font-medium text-slate-500">
                        Encontramos mais de um
                        vínculo elegível para o
                        cliente.
                      </p>

                      <div className="mt-5 grid gap-3 md:grid-cols-2">
                        {eligibleLinks.map(
                          (link, index) => {
                            const linkIndex =
                              link?.index ||
                              index + 1;

                            return (
                              <button
                                key={`${linkIndex}-${link?.matricula}`}
                                type="button"
                                onClick={() =>
                                  handleSelectLink(
                                    linkIndex
                                  )
                                }
                                className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-blue-400 hover:bg-blue-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-blue-400/40"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="rounded-2xl bg-blue-600/10 p-3 text-blue-600">
                                    <Icon.Building />
                                  </div>

                                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-600">
                                    Elegível
                                  </span>
                                </div>

                                <p className="mt-4 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                  Vínculo {linkIndex}
                                </p>

                                <p className="mt-2 text-xs font-semibold text-slate-500">
                                  Matrícula:{" "}
                                  {link?.matricula ||
                                    "Não informada"}
                                </p>
                              </button>
                            );
                          }
                        )}
                      </div>
                    </GlassCard>
                  )}

                {status === "completed" && (
                  <>
                    <div className="grid gap-4 md:grid-cols-3">
                      <MetricCard
                        title="Margem disponível"
                        value={formatBRL(
                          margins?.disponivel
                        )}
                        description="Margem retornada para o cliente"
                        accent="green"
                        icon={
                          <Icon.Wallet className="h-5 w-5" />
                        }
                      />

                      <MetricCard
                        title="Margem utilizada"
                        value={formatBRL(
                          margins?.utilizada
                        )}
                        description="Parcela utilizada na oferta"
                        accent="blue"
                        icon={
                          <Icon.Chart className="h-5 w-5" />
                        }
                      />

                      <MetricCard
                        title="Bancos consultados"
                        value={String(
                          result?.bancos?.length || 1
                        ).padStart(2, "0")}
                        description="Motor preparado para novos bancos"
                        accent="violet"
                        icon={
                          <Icon.Building className="h-5 w-5" />
                        }
                      />
                    </div>

                    {bestOffer && (
                      <GlassCard className="border-blue-400/30">
                        <div className="relative overflow-hidden bg-gradient-to-br from-[#061b49] via-blue-800 to-indigo-900 p-7 text-white md:p-8">
                          <div className="absolute -right-16 -top-20 h-60 w-60 rounded-full bg-cyan-300/10 blur-3xl" />

                          <div className="relative">
                            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/15 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-amber-200">
                                  <Icon.Sparkles className="h-4 w-4" />
                                  Melhor oferta
                                </div>

                                <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-blue-200">
                                  {bestOffer?.banco ||
                                    bankResult?.banco ||
                                    "Presença Bank"}
                                </p>

                                <h2 className="mt-2 max-w-2xl text-2xl font-black leading-tight md:text-3xl">
                                  {bestOffer?.tabela ||
                                    "Oferta CLT"}
                                </h2>
                              </div>

                              <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl">
                                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-200">
                                  Valor liberado
                                </p>

                                <p className="mt-2 text-3xl font-black text-cyan-300">
                                  {formatBRL(
                                    bestOffer?.valor_liberado
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="mt-7 grid gap-3 sm:grid-cols-3">
                              {[
                                {
                                  label: "Prazo",
                                  value: `${bestOffer?.prazo || 0}x`,
                                },
                                {
                                  label: "Taxa",
                                  value: `${Number(
                                    bestOffer?.taxa || 0
                                  ).toFixed(2)}% a.m.`,
                                },
                                {
                                  label: "Parcela",
                                  value: formatBRL(
                                    bestOffer?.parcela
                                  ),
                                },
                              ].map((item) => (
                                <div
                                  key={item.label}
                                  className="rounded-2xl border border-white/10 bg-black/10 p-4"
                                >
                                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-200">
                                    {item.label}
                                  </p>

                                  <p className="mt-2 text-lg font-black">
                                    {item.value}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    )}

                    {offers.length > 0 && (
                      <GlassCard className="p-6 md:p-7">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600">
                              Ranking de ofertas
                            </p>

                            <h3 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                              Condições disponíveis
                            </h3>
                          </div>

                          <span className="rounded-full bg-blue-500/10 px-4 py-2 text-[10px] font-black text-blue-600">
                            {offers.length}{" "}
                            {offers.length === 1
                              ? "oferta"
                              : "ofertas"}
                          </span>
                        </div>

                        <div className="mt-6 space-y-4">
                          {offers.map(
                            (offer, index) => (
                              <motion.div
                                key={`${offer?.tabela_id}-${index}`}
                                initial={{
                                  opacity: 0,
                                  x: 12,
                                }}
                                animate={{
                                  opacity: 1,
                                  x: 0,
                                }}
                                transition={{
                                  delay:
                                    index * 0.06,
                                }}
                                className="grid gap-5 rounded-3xl border border-slate-200/80 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/5 md:grid-cols-[1fr_auto] md:items-center"
                              >
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-blue-600/10 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-blue-600">
                                      {offer?.banco ||
                                        bankResult?.banco ||
                                        "Banco CLT"}
                                    </span>

                                    {index ===
                                      0 && (
                                      <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-amber-600">
                                        Destaque
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="mt-3 font-black text-slate-950 dark:text-white">
                                    {offer?.tabela ||
                                      "Tabela CLT"}
                                  </h4>

                                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
                                    <span>
                                      Prazo:{" "}
                                      {offer?.prazo ||
                                        0}
                                      x
                                    </span>

                                    <span>
                                      Taxa:{" "}
                                      {Number(
                                        offer?.taxa ||
                                          0
                                      ).toFixed(
                                        2
                                      )}
                                      % a.m.
                                    </span>

                                    <span>
                                      Parcela:{" "}
                                      {formatBRL(
                                        offer?.parcela
                                      )}
                                    </span>
                                  </div>
                                </div>

                                <div className="rounded-2xl bg-white p-4 text-left shadow-sm dark:bg-slate-950/50 md:text-right">
                                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                    Liberado
                                  </p>

                                  <p className="mt-1 text-xl font-black text-emerald-600">
                                    {formatBRL(
                                      offer?.valor_liberado
                                    )}
                                  </p>
                                </div>
                              </motion.div>
                            )
                          )}
                        </div>
                      </GlassCard>
                    )}
                  </>
                )}

                {isAdjustmentStatus && (
                  <GlassCard className="border-violet-300/50 shadow-[0_30px_90px_-40px_rgba(109,40,217,0.45)]">
                    <div className="relative overflow-hidden bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 p-6 text-white md:p-7">
                      <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />

                      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-lg">
                            <Icon.Refresh className="h-7 w-7" />
                          </div>

                          <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-violet-100">
                              Nova simulação disponível
                            </p>

                            <h3 className="mt-1 text-2xl font-black tracking-tight">
                              Simular com valores personalizados
                            </h3>
                          </div>
                        </div>

                        <span className="w-fit rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-xl">
                          Cliente autorizado
                        </span>
                      </div>
                    </div>

                    <form
                      onSubmit={handleAdjustmentSubmit}
                      className="p-6 md:p-8"
                    >
                      <div className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 to-blue-50/50 p-5 dark:border-violet-400/15 dark:from-violet-500/10 dark:to-blue-500/5">
                        <p className="text-sm font-bold leading-7 text-slate-700 dark:text-slate-200">
                          A autorização foi concluída, mas os valores calculados ultrapassaram o limite de uma ou mais tabelas. Informe uma parcela ou um valor de contrato menor para gerar uma nova simulação.
                        </p>

                        {Number(margins?.disponivel || 0) > 0 && (
                          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-violet-700 shadow-sm dark:bg-white/10 dark:text-violet-300">
                            <Icon.Wallet className="h-4 w-4" />
                            Margem disponível: {formatBRL(margins.disponivel)}
                          </div>
                        )}
                      </div>

                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() =>
                            setAdjustment((previous) => ({
                              ...previous,
                              mode: "parcela",
                            }))
                          }
                          className={[
                            "rounded-2xl border px-5 py-4 text-left transition",
                            adjustment.mode === "parcela"
                              ? "border-violet-500 bg-violet-500/10 ring-4 ring-violet-500/10"
                              : "border-slate-200 bg-slate-50 hover:border-violet-300 dark:border-white/10 dark:bg-white/5",
                          ].join(" ")}
                        >
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-600">
                            Opção 1
                          </p>
                          <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">
                            Valor da parcela
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            Informe quanto o cliente deseja pagar por mês.
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setAdjustment((previous) => ({
                              ...previous,
                              mode: "contrato",
                            }))
                          }
                          className={[
                            "rounded-2xl border px-5 py-4 text-left transition",
                            adjustment.mode === "contrato"
                              ? "border-blue-500 bg-blue-500/10 ring-4 ring-blue-500/10"
                              : "border-slate-200 bg-slate-50 hover:border-blue-300 dark:border-white/10 dark:bg-white/5",
                          ].join(" ")}
                        >
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-600">
                            Opção 2
                          </p>
                          <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">
                            Valor do contrato
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            Informe o valor que o cliente deseja contratar.
                          </p>
                        </button>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                        <label className="block">
                          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                            {adjustment.mode === "parcela"
                              ? "Nova parcela desejada"
                              : "Novo valor do contrato"}
                          </span>

                          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10 dark:border-white/10 dark:bg-slate-950/50">
                            <span className="text-sm font-black text-slate-400">
                              R$
                            </span>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={
                                adjustment.mode === "parcela"
                                  ? adjustment.valor_parcela
                                  : adjustment.valor_solicitado
                              }
                              onChange={(event) =>
                                setAdjustment((previous) => ({
                                  ...previous,
                                  [adjustment.mode === "parcela"
                                    ? "valor_parcela"
                                    : "valor_solicitado"]:
                                    event.target.value,
                                }))
                              }
                              placeholder={
                                adjustment.mode === "parcela"
                                  ? "Ex.: 650,00"
                                  : "Ex.: 10.000,00"
                              }
                              className="h-14 w-full bg-transparent text-sm font-bold text-slate-900 outline-none dark:text-white"
                            />
                          </div>
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                            Prazo desejado
                          </span>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-white/10 dark:bg-slate-950/50">
                            <input
                              type="number"
                              min="1"
                              max="120"
                              value={adjustment.quantidade_parcelas}
                              onChange={(event) =>
                                setAdjustment((previous) => ({
                                  ...previous,
                                  quantidade_parcelas:
                                    event.target.value,
                                }))
                              }
                              placeholder="Automático"
                              className="h-14 w-full bg-transparent text-sm font-bold text-slate-900 outline-none dark:text-white"
                            />
                          </div>
                          <p className="mt-2 text-[10px] font-semibold text-slate-400">
                            Opcional. Em branco, o banco retorna os prazos disponíveis.
                          </p>
                        </label>
                      </div>

                      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                          Limites permitidos pelas tabelas
                        </p>

                        {adjustmentLimits.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {adjustmentLimits.map((limit) => (
                              <span
                                key={limit}
                                className="rounded-full border border-violet-200 bg-white px-4 py-2 text-xs font-black text-violet-700 shadow-sm dark:border-violet-400/20 dark:bg-white/10 dark:text-violet-300"
                              >
                                Até {formatBRL(limit)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs font-semibold leading-6 text-slate-600 dark:text-slate-300">
                            {negativeReason}
                          </p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="mt-5 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-5 py-4 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-xl shadow-violet-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? (
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                          <Icon.Refresh className="h-5 w-5" />
                        )}
                        Gerar nova simulação
                      </button>
                    </form>
                  </GlassCard>
                )}

                {isNegativeStatus && negativeResult && (
                  <GlassCard className="border-red-300/50 shadow-[0_30px_90px_-40px_rgba(220,38,38,0.55)]">
                    <div className="relative overflow-hidden bg-gradient-to-r from-red-700 via-rose-600 to-red-500 p-6 text-white md:p-7">
                      <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
                      <div className="absolute bottom-0 left-1/4 h-px w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent" />

                      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-lg">
                            <Icon.Alert className="h-7 w-7" />
                          </div>

                          <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-red-100">
                              Resultado da análise
                            </p>

                            <h3 className="mt-1 text-2xl font-black tracking-tight">
                              {negativeResult.title}
                            </h3>
                          </div>
                        </div>

                        <span className="w-fit rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-xl">
                          Presença Bank
                        </span>
                      </div>
                    </div>

                    <div className="p-6 md:p-8">
                      <div className="rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 to-rose-50/50 p-5 dark:border-red-400/15 dark:from-red-500/10 dark:to-rose-500/5">
                        <p className="text-sm font-bold leading-7 text-slate-700 dark:text-slate-200">
                          {negativeResult.description}
                        </p>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/50">
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-600">
                            Motivo retornado pela API
                          </p>

                          <p className="mt-3 text-sm font-bold leading-6 text-slate-800 dark:text-slate-100">
                            {negativeReason}
                          </p>
                        </div>

                        {negativeCode && (
                          <div className="rounded-3xl border border-red-100 bg-red-50 px-5 py-4 dark:border-red-400/15 dark:bg-red-500/10">
                            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-red-500">
                              Código do retorno
                            </p>

                            <p className="mt-2 max-w-[220px] break-words text-xs font-black text-red-700 dark:text-red-300">
                              {negativeCode}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-5 flex gap-4 rounded-3xl border border-slate-200/80 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/5">
                        <div className="h-fit rounded-2xl bg-slate-900 p-3 text-white dark:bg-white dark:text-slate-900">
                          <Icon.Refresh className="h-5 w-5" />
                        </div>

                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                            Próxima ação
                          </p>

                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                            Revise os dados informados ou clique em
                            “Fazer nova consulta” para analisar outro cliente.
                          </p>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <GlassCard className="p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-blue-600">
                  Ecossistema CLT
                </p>

                <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                  Plataforma pronta para escalar
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-500/10 px-4 py-2 text-[9px] font-black uppercase tracking-wider text-emerald-600">
                  Presença Bank ativo
                </span>

                <span className="rounded-full bg-slate-500/10 px-4 py-2 text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Novos bancos em breve
                </span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
