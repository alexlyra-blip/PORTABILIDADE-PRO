"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { api, getStaticUrl } from "@/utils/api";

import { Icons } from "@/components/Icons";


const DEFAULT_CONFIG = {
  banco: "FACTA",
  convenio: "INSS",
  max_contratos: 6,
  parcela_minima_refin: 50,
  valor_minimo_operacao: 3000,
  adicional_viabilidade: 20,

  grupo_a: [
    "BANRISUL",
    "BMG",
    "COMPE",
    "DAYCOVAL",
    "ITAU",
    "CAIXA",
    "BRADESCO",
    "SANTANDER",
    "AGIBANK",
    "PAN",
    "C6",
    "SAFRA",
  ],

  grupo_b: [
    "BANCO SEGURO",
    "MERCANTIL",
    "BANCO DO BRASIL",
    "PICPAY",
  ],

  grupo_c: [
    "QI SOCIEDADE",
    "BANCO ORIGINAL",
    "BANCO INTER",
    "BANCO MULTIPLO",
    "BRB",
    "DIGIO",
  ],
};


const BANK_ALIASES = [
  ["CAIXA ECONOMICA FEDERAL", "CAIXA"],
  ["CAIXA ECONOMICA", "CAIXA"],
  ["BANCO DO BRASIL", "BANCO DO BRASIL"],
  ["BANCO MERCANTIL", "MERCANTIL"],
  ["BANCO PAN", "PAN"],
  ["BANCO C6", "C6"],
  ["C6 BANK", "C6"],
  ["BANCO ORIGINAL", "BANCO ORIGINAL"],
  ["BANCO INTER", "BANCO INTER"],
  ["BANCO MULTIPLO", "BANCO MULTIPLO"],
  ["QI SOCIEDADE", "QI SOCIEDADE"],
  ["QI SOCIDADE", "QI SOCIEDADE"],
  ["BANCO SEGURO", "BANCO SEGURO"],
  ["BANRISUL", "BANRISUL"],
  ["DAYCOVAL", "DAYCOVAL"],
  ["BRADESCO", "BRADESCO"],
  ["SANTANDER", "SANTANDER"],
  ["AGIBANK", "AGIBANK"],
  ["MERCANTIL", "MERCANTIL"],
  ["PICPAY", "PICPAY"],
  ["SAFRA", "SAFRA"],
  ["COMPE", "COMPE"],
  ["BMG", "BMG"],
  ["ITAU", "ITAU"],
  ["ITAÚ", "ITAU"],
  ["CAIXA", "CAIXA"],
  ["PAN", "PAN"],
  ["C6", "C6"],
  ["BRB", "BRB"],
  ["DIGIO", "DIGIO"],
];


function norm(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}


function normalizeBank(value) {
  const valueNorm = norm(value);

  if (!valueNorm) return "";

  const aliases = [...BANK_ALIASES].sort(
    (a, b) =>
      norm(b[0]).length -
      norm(a[0]).length
  );

  for (const [alias, canonical] of aliases) {

    if (
      valueNorm.includes(
        norm(alias)
      )
    ) {
      return canonical;
    }
  }

  return valueNorm;
}


function onlyDigits(value) {
  return String(value || "")
    .replace(/\D/g, "");
}


function normalizeBenefit(value) {

  if (
    value &&
    typeof value === "object"
  ) {
    return normalizeBenefit(
      value.numero ??
      value.numero_beneficio ??
      value.beneficio ??
      value.nb ??
      ""
    );
  }

  const digits = onlyDigits(value);

  if (digits) return digits;

  return norm(value);
}


function money(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.round(
    number * 100
  ) / 100;
}


function formatBRL(value) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(
    money(value)
  );
}


function maskCPF(value) {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(
      /(\d{3})(\d)/,
      "$1.$2"
    )
    .replace(
      /(\d{3})(\d)/,
      "$1.$2"
    )
    .replace(
      /(\d{3})(\d{1,2})$/,
      "$1-$2"
    );
}


function extractBenefitNumber(benefit) {
  if (!benefit) return "";

  const candidates = [
    benefit.numero,
    benefit.numero_beneficio,
    benefit.nb,
    benefit.beneficio,
    benefit.cliente?.beneficio,
  ];

  for (const item of candidates) {

    const normalized =
      normalizeBenefit(item);

    if (normalized) {
      return normalized;
    }
  }

  return "";
}


function extractLoans(benefit) {

  if (!benefit) return [];

  const candidates = [
    benefit.emprestimos,
    benefit.emprestimos_ativos,
    benefit.contratos,
  ];

  for (const candidate of candidates) {

    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}


function extractBenefits(response) {

  if (!response) return [];

  if (
    Array.isArray(
      response.beneficios
    ) &&
    response.beneficios.length
  ) {
    return response.beneficios;
  }

  if (
    response.beneficio_principal
  ) {
    return [
      response.beneficio_principal,
    ];
  }

  return [response];
}


function extractMargin(benefit) {

  const margens =
    benefit?.margens || {};

  const candidates = [
    margens.margem_livre,
    margens.margem_disponivel,
    benefit?.margem_livre,
    benefit?.margem_disponivel,
  ];

  for (const value of candidates) {

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return money(value);
    }
  }

  return 0;
}


function extractClientName(
  benefit,
  response
) {
  return (
    benefit?.cliente?.nome ||
    benefit?.cliente?.nome_completo ||
    response?.cliente?.nome ||
    response?.cliente?.nome_completo ||
    response?.nome ||
    "CLIENTE INSS"
  );
}


function extractCPF(
  benefit,
  response,
  fallback
) {
  return (
    benefit?.cliente?.cpf ||
    response?.cliente?.cpf ||
    response?.cpf ||
    fallback ||
    ""
  );
}


function loanValue(
  loan,
  fields
) {

  for (const field of fields) {

    const value =
      loan?.[field];

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return 0;
}


function normalizeLoan(
  loan,
  index,
  source,
  benefitNumber
) {
  const banco =
    loan?.banco ||
    loan?.bank ||
    loan?.instituicao ||
    loan?.nome_banco ||
    "";

  const contrato =
    loan?.contrato ||
    loan?.numero_contrato ||
    loan?.contract ||
    "";

  const prazoTotal = Number(
    loanValue(
      loan,
      [
        "prazo",
        "prazo_total",
        "Prazo",
      ]
    ) || 0
  );

  const prazoRestante = Number(
    loanValue(
      loan,
      [
        "prazo_restante",
        "parcelas_restantes",
        "ParcelasRestantes",
      ]
    ) || 0
  );

  const parcelasPagasInformadas = Number(
    loanValue(
      loan,
      [
        "parcelas_pagas",
        "pagas",
        "ParcelasPagas",
      ]
    ) || 0
  );

  const parcelasPagas =
    parcelasPagasInformadas > 0
      ? parcelasPagasInformadas
      : Math.max(
          0,
          prazoTotal -
            prazoRestante
        );

  return {
    ...loan,

    _id:
      loan?._id ||
      [
        source,
        benefitNumber,
        contrato || index,
        normalizeBank(banco),
      ].join("-"),

    _source: source,

    banco,

    banco_normalizado:
      normalizeBank(banco),

    contrato,

    beneficio:
      normalizeBenefit(
        benefitNumber
      ),

    parcela:
      money(
        loanValue(
          loan,
          [
            "parcela",
            "valor_parcela",
            "installment",
          ]
        )
      ),

    saldo_devedor:
      money(
        loanValue(
          loan,
          [
            "quitacao",
            "saldo_devedor",
            "saldo",
            "valor_quitacao",
          ]
        )
      ),

    codigo:
      loan?.codigo ||
      loan?.code ||
      loan?.bank_code ||
      "",

    taxa:
      money(
        loanValue(
          loan,
          [
            "taxa",
            "taxa_atual",
            "taxa_mensal",
            "Taxa",
          ]
        )
      ),

    prazo:
      prazoTotal,

    prazo_restante:
      prazoRestante,

    parcelas_pagas:
      parcelasPagas,

    valor_contrato:
      money(
        loanValue(
          loan,
          [
            "valor_contrato",
            "valor_emprestimo",
            "valor_liberado",
            "ValorEmprestimo",
          ]
        )
      ),

    data_averbacao:
      loan?.data_averbacao ||
      loan?.inicio_desconto ||
      loan?.data_inicio ||
      null,
  };
}



// MULTIPLA_MOTOR_FACTA_FRONTEND

function calculateAge(value) {
  if (!value) return 0;

  const raw = String(value).trim();

  let date = null;

  if (
    /^\d{4}-\d{2}-\d{2}/.test(raw)
  ) {
    date = new Date(
      raw.slice(0, 10) +
      "T12:00:00"
    );
  } else {
    const match = raw.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    );

    if (match) {
      date = new Date(
        Number(match[3]),
        Number(match[2]) - 1,
        Number(match[1])
      );
    }
  }

  if (
    !date ||
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 0;
  }

  const today = new Date();

  let age =
    today.getFullYear() -
    date.getFullYear();

  const month =
    today.getMonth() -
    date.getMonth();

  if (
    month < 0 ||
    (
      month === 0 &&
      today.getDate() <
        date.getDate()
    )
  ) {
    age -= 1;
  }

  return Math.max(0, age);
}


function extractMotorClient(
  benefit,
  response,
  fallback
) {
  const client =
    benefit?.cliente ||
    response?.cliente ||
    {};

  const benefitInfo =
    (
      benefit?.beneficio &&
      typeof benefit.beneficio ===
        "object"
    )
      ? benefit.beneficio
      : (
          response?.beneficio &&
          typeof response.beneficio ===
            "object"
        )
        ? response.beneficio
        : {};

  const birthDate =
    client?.data_nascimento ||
    client?.nascimento ||
    client?.birth_date ||
    "";

  let idade = Number(
    client?.idade ||
    response?.idade ||
    0
  );

  if (!idade && birthDate) {
    idade = calculateAge(
      birthDate
    );
  }

  const especieRaw =
    benefitInfo?.especie ||
    benefit?.especie ||
    client?.especie ||
    response?.beneficio?.especie ||
    response?.especie ||
    "";

  const especieMatch =
    String(especieRaw)
      .match(/\d{1,3}/);

  const especie =
    especieMatch
      ? especieMatch[0]
          .padStart(2, "0")
      : String(
          especieRaw || ""
        );

  const analfabeto =
    client?.analfabeto === true ||
    client?.nao_assina === true ||
    client?.cliente_assina ===
      false;

  return {
    nome:
      extractClientName(
        benefit,
        response
      ),

    cpf:
      onlyDigits(
        extractCPF(
          benefit,
          response,
          fallback
        )
      ),

    idade:
      idade || 18,

    especie,

    data_concessao:
      benefitInfo?.data_concessao ||
      benefitInfo?.concessao ||
      benefit?.data_concessao ||
      benefit?.concessao ||
      null,

    analfabeto,

    is_60_plus:
      idade
        ? idade >= 60
        : false,

    is_invalidez_60_plus:
      idade >= 60 &&
      [
        "04",
        "05",
        "06",
        "32",
        "87",
        "92",
      ].includes(especie),

    possui_dois_cartoes:
      false,
  };
}


function bankRuleMatches(
  loanBank,
  ruleBank
) {
  const loanText = norm(
    loanBank
  );

  const ruleText = norm(
    ruleBank
  );

  if (
    !loanText ||
    !ruleText
  ) {
    return false;
  }

  const loanCanonical =
    normalizeBank(
      loanText
    );

  const ruleCanonical =
    normalizeBank(
      ruleText
    );

  if (
    loanCanonical ===
      ruleCanonical ||
    loanCanonical.includes(
      ruleCanonical
    ) ||
    ruleCanonical.includes(
      loanCanonical
    )
  ) {
    return true;
  }

  const noise = new Set([
    "BANCO",
    "SA",
    "S",
    "A",
    "CONSIGNADO",
    "FINANCEIRA",
    "CREDITO",
    "BANK",
  ]);

  const words = (value) =>
    new Set(
      norm(value)
        .split(/[^A-Z0-9]+/)
        .filter(
          (word) =>
            word.length >= 2 &&
            !noise.has(word)
        )
    );

  const loanWords =
    words(loanText);

  const ruleWords =
    words(ruleText);

  for (const word of ruleWords) {
    if (loanWords.has(word)) {
      return true;
    }
  }

  return false;
}


function Notice({
  type = "info",
  children,
}) {
  const styles = {
    info:
      "border-blue-100 bg-blue-50 text-blue-700",

    success:
      "border-emerald-100 bg-emerald-50 text-emerald-700",

    warning:
      "border-amber-100 bg-amber-50 text-amber-700",

    error:
      "border-red-100 bg-red-50 text-red-700",
  };

  return (
    <div
      className={`
        rounded-2xl
        border
        px-4
        py-3
        text-xs
        font-bold
        ${styles[type]}
      `}
    >
      {children}
    </div>
  );
}


export default function PortabilidadeMultiplaPage() {

  const fileInputRef =
    useRef(null);

  const [user, setUser] =
    useState({});

  const [config, setConfig] =
    useState(DEFAULT_CONFIG);

  const [subLogos, setSubLogos] =
    useState([]);

  const [cpf, setCpf] =
    useState("");

  const [loadingCpf, setLoadingCpf] =
    useState(false);

  const [loadingFile, setLoadingFile] =
    useState(false);

  const [rawResponse, setRawResponse] =
    useState(null);

  const [source, setSource] =
    useState("");

  const [benefits, setBenefits] =
    useState([]);

  const [
    activeBenefitIndex,
    setActiveBenefitIndex,
  ] = useState(0);

  const [loans, setLoans] =
    useState([]);

  const [
    selectedIds,
    setSelectedIds,
  ] = useState([]);

  const [margin, setMargin] =
    useState(0);

  const [
    validation,
    setValidation,
  ] = useState(null);


  const [
    motorResult,
    setMotorResult,
  ] = useState(null);

  const [
    selectedFactaTerm,
    setSelectedFactaTerm,
  ] = useState(null);

  /* MULTIPLA_FACTA_TERM_FILTER */
  const factaOffers = Array.isArray(
    motorResult?.ofertas
  )
    ? motorResult.ofertas
    : [];

  const factaAvailableTerms = [
    ...new Set(
      factaOffers
        .map(
          (offer) =>
            Number(
              offer?.prazo || 0
            )
        )
        .filter(
          (term) =>
            Number.isFinite(term) &&
            term > 0
        )
    ),
  ].sort(
    (a, b) => b - a
  );

  const factaPreferredTerm =
    factaAvailableTerms.includes(108)
      ? 108
      : (
          factaAvailableTerms[0] ||
          null
        );

  const factaActiveTerm =
    factaAvailableTerms.includes(
      Number(selectedFactaTerm)
    )
      ? Number(selectedFactaTerm)
      : factaPreferredTerm;

  const factaVisibleOffers =
    factaActiveTerm
      ? factaOffers.filter(
          (offer) =>
            Number(
              offer?.prazo || 0
            ) === factaActiveTerm
        )
      : factaOffers;

  useEffect(() => {
    if (!factaOffers.length) {
      setSelectedFactaTerm(null);
      return;
    }

    setSelectedFactaTerm(
      factaPreferredTerm
    );
  }, [motorResult]);



  const [
    validating,
    setValidating,
  ] = useState(false);

  const [notice, setNotice] =
    useState(null);

  const [
    clientData,
    setClientData,
  ] = useState({
    nome: "",
    cpf: "",
    beneficio: "",
  });


  const brandColor =
    user?.brand_color ||
    "#2563eb";

  const secondaryColor =
    user?.sidebar_color_secondary ||
    user?.brand_color ||
    "#60a5fa";


  useEffect(() => {

    try {

      const raw =
        localStorage.getItem(
          "user"
        );

      if (raw) {
        setUser(
          JSON.parse(raw)
        );
      }

    } catch (error) {
      console.error(error);
    }


    api
      .get(
        "/portabilidade-multipla/config"
      )
      .then((response) => {

        if (response) {
          setConfig({
            ...DEFAULT_CONFIG,
            ...response,
          });
        }
      })
      .catch(() => {});


    api
      .get(
        "/portabilidade-multipla/motor-config"
      )
      .then((response) => {

        setConfig(
          (previous) => ({
            ...previous,
            motor_rules:
              response || {},
          })
        );
      })
      .catch((error) => {

        console.warn(
          "Nao foi possivel carregar "
          + "o pre-check FACTA:",
          error
        );
      });


    api
      .get(
        "/admin/sub-logos"
      )
      .then((response) => {

        setSubLogos(
          Array.isArray(response)
            ? response
            : []
        );
      })
      .catch(() => {
        setSubLogos([]);
      });

  }, []);


  const identifyGroup = (
    bankName
  ) => {

    const bank =
      normalizeBank(bankName);

    if (
      config.grupo_a
        .map(norm)
        .includes(
          norm(bank)
        )
    ) {
      return "A";
    }

    if (
      config.grupo_b
        .map(norm)
        .includes(
          norm(bank)
        )
    ) {
      return "B";
    }

    if (
      config.grupo_c
        .map(norm)
        .includes(
          norm(bank)
        )
    ) {
      return "C";
    }

    return null;
  };


  const loadActiveBenefit = (
    benefit,
    response,
    currentSource,
    fallbackCpf = ""
  ) => {

    const benefitNumber =
      extractBenefitNumber(
        benefit
      );

    const normalizedLoans =
      extractLoans(benefit)
        .map(
          (loan, index) =>
            normalizeLoan(
              loan,
              index,
              currentSource,
              benefitNumber
            )
        );

    setLoans(
      normalizedLoans
    );

    setMargin(
      extractMargin(
        benefit
      )
    );

    setClientData({
      nome:
        extractClientName(
          benefit,
          response
        ),

      cpf:
        extractCPF(
          benefit,
          response,
          fallbackCpf
        ),

      beneficio:
        benefitNumber,
    });

    /*
     * REGRA CRITICA:
     * mudou o beneficio/NB,
     * zera toda a operacao.
     */
    setSelectedIds([]);
    setValidation(null);
    setMotorResult(null);
  };


  useEffect(() => {

    if (!benefits.length) {
      return;
    }

    const benefit =
      benefits[
        activeBenefitIndex
      ] ||
      benefits[0];

    loadActiveBenefit(
      benefit,
      rawResponse,
      source || "cpf",
      cpf
    );

  }, [
    activeBenefitIndex,
    benefits,
  ]);


  const enrichedLoans =
    useMemo(
      () =>
        loans.map(
          (loan) => ({
            ...loan,

            grupo_facta:
              identifyGroup(
                loan.banco
              ),
          })
        ),
      [
        loans,
        config,
      ]
    );


  const selectedLoans =
    useMemo(
      () =>
        enrichedLoans.filter(
          (loan) =>
            selectedIds.includes(
              loan._id
            )
        ),
      [
        enrichedLoans,
        selectedIds,
      ]
    );


  const selectedGroups =
    useMemo(
      () =>
        [
          ...new Set(
            selectedLoans
              .map(
                (loan) =>
                  loan.grupo_facta
              )
              .filter(
                Boolean
              )
          ),
        ],
      [selectedLoans]
    );


  const selectedGroup =
    selectedGroups.length === 1
      ? selectedGroups[0]
      : null;


  const selectedBenefits =
    useMemo(
      () =>
        [
          ...new Set(
            selectedLoans
              .map(
                (loan) =>
                  normalizeBenefit(
                    loan.beneficio
                  )
              )
              .filter(
                Boolean
              )
          ),
        ],
      [selectedLoans]
    );


  const selectedBenefit =
    selectedBenefits.length === 1
      ? selectedBenefits[0]
      : null;


  const summary =
    useMemo(
      () => {

        const somaParcelas =
          selectedLoans.reduce(
            (total, loan) =>
              total +
              money(
                loan.parcela
              ),
            0
          );

        const somaSaldos =
          selectedLoans.reduce(
            (total, loan) =>
              total +
              money(
                loan.saldo_devedor
              ),
            0
          );

        const margemNegativa =
          Math.max(
            0,
            -money(margin)
          );

        const maiorParcela =
          selectedLoans.reduce(
            (current, loan) =>
              Math.max(
                current,
                money(
                  loan.parcela
                )
              ),
            0
          );

        const minimoViabilidade =
          margemNegativa > 0
            ? margemNegativa +
              money(
                config.adicional_viabilidade
              )
            : 0;

        const parcelaRefin =
          Math.max(
            0,
            somaParcelas -
              margemNegativa
          );

        return {
          somaParcelas,
          somaSaldos,
          margemNegativa,
          maiorParcela,
          minimoViabilidade,
          parcelaRefin,

          viabilidade:
            margemNegativa === 0 ||
            maiorParcela >=
              minimoViabilidade,
        };
      },
      [
        selectedLoans,
        margin,
        config,
      ]
    );


  const groups =
    useMemo(
      () => ({
        A:
          enrichedLoans.filter(
            (loan) =>
              loan.grupo_facta ===
              "A"
          ),

        B:
          enrichedLoans.filter(
            (loan) =>
              loan.grupo_facta ===
              "B"
          ),

        C:
          enrichedLoans.filter(
            (loan) =>
              loan.grupo_facta ===
              "C"
          ),

        OTHER:
          enrichedLoans.filter(
            (loan) =>
              !loan.grupo_facta
          ),
      }),
      [enrichedLoans]
    );


  const getBankLogo = (
    loan
  ) => {

    const bank =
      normalizeBank(
        loan.banco
      );

    const found =
      subLogos.find(
        (item) => {

          const itemName =
            normalizeBank(
              item?.name ||
              item?.bank_name ||
              ""
            );

          return (
            itemName &&
            bank &&
            (
              itemName === bank ||
              itemName.includes(
                bank
              ) ||
              bank.includes(
                itemName
              )
            )
          );
        }
      );

    return found?.logo_url
      ? getStaticUrl(
          found.logo_url
        )
      : null;
  };


  const loadResponse = (
    response,
    currentSource,
    fallbackCpf = ""
  ) => {

    const foundBenefits =
      extractBenefits(
        response
      );

    if (
      !foundBenefits.length
    ) {
      setNotice({
        type: "warning",
        text:
          "Nenhum beneficio INSS foi localizado.",
      });

      return;
    }

    setRawResponse(
      response
    );

    setSource(
      currentSource
    );

    setBenefits(
      foundBenefits
    );

    setActiveBenefitIndex(
      0
    );

    loadActiveBenefit(
      foundBenefits[0],
      response,
      currentSource,
      fallbackCpf
    );

    setNotice({
      type: "success",
      text:
        foundBenefits.length > 1
          ? "Consulta concluida. Escolha um beneficio antes de montar a operacao."
          : "Consulta concluida. Selecione os contratos elegiveis.",
    });
  };


  const handleCpfSearch =
    async () => {

      const cleanCpf =
        onlyDigits(cpf);

      if (
        cleanCpf.length !== 11
      ) {
        setNotice({
          type: "warning",
          text:
            "Informe um CPF valido com 11 digitos.",
        });

        return;
      }

      setLoadingCpf(true);
      setNotice(null);

      try {

        const response =
          await api.post(
            "/consultas/cpf",
            {
              cpf: cleanCpf,
              convenio: "INSS",
            }
          );

        loadResponse(
          response,
          "CPF",
          cleanCpf
        );

      } catch (error) {

        console.error(error);

        setNotice({
          type: "error",
          text:
            error?.message ||
            "Nao foi possivel realizar a consulta.",
        });

      } finally {
        setLoadingCpf(false);
      }
    };


  const handleFile =
    async (file) => {

      if (!file) return;

      if (
        file.type !==
        "application/pdf"
      ) {
        setNotice({
          type: "warning",
          text:
            "Selecione um arquivo PDF.",
        });

        return;
      }

      setLoadingFile(true);
      setNotice(null);

      try {

        const formData =
          new FormData();

        formData.append(
          "file",
          file
        );

        const response =
          await api.postFormData(
            "/pdf-extractor/extrato",
            formData
          );

        if (
          !response?.success ||
          !response?.data
        ) {
          throw new Error(
            "O extrato nao retornou dados validos."
          );
        }

        const data =
          response.data;

        const convenio =
          norm(
            data?.convenio ||
            "INSS"
          );

        if (
          convenio !== "INSS"
        ) {
          throw new Error(
            "A Portabilidade Multipla FACTA aceita apenas INSS."
          );
        }

        const benefitNumber =
          normalizeBenefit(
            data.numero_beneficio ??
            data.beneficio ??
            data.numero ??
            ""
          );

        const benefit = {
          ...data,

          numero_beneficio:
            benefitNumber,

          emprestimos:
            data.emprestimos_ativos ||
            data.emprestimos ||
            [],

          margens: {
            ...(data.margens || {}),

            margem_livre:
              data.margem_disponivel ??
              data.margem_livre ??
              data.margens
                ?.margem_livre ??
              0,
          },
        };

        const adaptedResponse = {
          ...data,
          beneficios: [
            benefit,
          ],
        };

        if (data.cpf) {
          setCpf(
            maskCPF(
              data.cpf
            )
          );
        }

        loadResponse(
          adaptedResponse,
          "EXTRATO",
          data.cpf || ""
        );

      } catch (error) {

        console.error(error);

        setNotice({
          type: "error",
          text:
            error?.message ||
            "Nao foi possivel processar o extrato.",
        });

      } finally {

        setLoadingFile(false);

        if (
          fileInputRef.current
        ) {
          fileInputRef.current.value =
            "";
        }
      }
    };


  const switchBenefit = (
    index
  ) => {

    if (
      index ===
      activeBenefitIndex
    ) {
      return;
    }

    /*
     * NUNCA carregar selecao
     * de um NB para outro.
     */
    setSelectedIds([]);
    setValidation(null);
    setMotorResult(null);

    setActiveBenefitIndex(
      index
    );

    setNotice({
      type: "info",
      text:
        "Beneficio alterado. A selecao anterior foi limpa para impedir a unificacao de contratos de NBs diferentes.",
    });
  };


  const getFactaPrecheck = (
    loan
  ) => {

    const motorRules =
      config?.motor_rules ||
      {};

    const excluded =
      motorRules
        ?.excluded_origin_banks ||
      [];

    const loanBankText = [
      loan?.codigo,
      loan?.banco,
    ]
      .filter(Boolean)
      .join(" ");

    const excludedMatch =
      excluded.find(
        (bank) =>
          bankRuleMatches(
            loanBankText,
            bank
          )
      );

    if (excludedMatch) {
      return {
        blocked: true,
        reason:
          "FACTA nao porta este banco "
          + "originador.",
      };
    }

    const paid = Number(
      loan?.parcelas_pagas ||
      Math.max(
        0,
        Number(
          loan?.prazo || 0
        ) -
        Number(
          loan?.prazo_restante ||
          0
        )
      )
    );

    let specificMinimum = 0;

    for (
      const rule
      of (
        motorRules
          ?.origin_min_paid ||
        []
      )
    ) {

      if (
        bankRuleMatches(
          loanBankText,
          rule?.origin_bank
        )
      ) {
        specificMinimum =
          Math.max(
            specificMinimum,
            Number(
              rule?.min_paid ||
              0
            )
          );
      }
    }

    const required = Math.max(
      Number(
        motorRules
          ?.min_paid_installments ||
        0
      ),

      Number(
        motorRules
          ?.min_table_paid_any ||
        0
      ),

      specificMinimum
    );

    if (
      required > 0 &&
      paid < required
    ) {
      return {
        blocked: true,
        reason:
          `FACTA exige no minimo `
          + `${required} parcelas `
          + `pagas. Contrato possui `
          + `${paid}.`,
        required,
        paid,
      };
    }

    return {
      blocked: false,
      reason: "",
      required,
      paid,
    };
  };


  const toggleLoan = (
    loan
  ) => {

    const group =
      loan.grupo_facta;

    if (group === "C") {

      setNotice({
        type: "error",
        text:
          `${loan.banco} pertence ao Grupo C e nao pode participar da Portabilidade Multipla.`,
      });

      return;
    }

    if (!group) {

      setNotice({
        type: "warning",
        text:
          `${loan.banco || "Banco"} nao esta classificado como elegivel.`,
      });

      return;
    }

    const factaCheck =
      getFactaPrecheck(
        loan
      );

    if (factaCheck.blocked) {

      setNotice({
        type: "error",
        text:
          factaCheck.reason,
      });

      return;
    }

    const alreadySelected =
      selectedIds.includes(
        loan._id
      );

    if (alreadySelected) {

      setSelectedIds(
        selectedIds.filter(
          (id) =>
            id !== loan._id
        )
      );

      setValidation(null);
    setMotorResult(null);

      return;
    }


    if (
      selectedIds.length >=
      config.max_contratos
    ) {

      setNotice({
        type: "warning",
        text:
          `O limite e de ${config.max_contratos} contratos.`,
      });

      return;
    }


    if (
      selectedGroup &&
      selectedGroup !== group
    ) {

      setNotice({
        type: "warning",
        text:
          `A operacao atual pertence ao Grupo ${selectedGroup}. Nao e permitido misturar os Grupos A e B.`,
      });

      return;
    }


    const loanBenefit =
      normalizeBenefit(
        loan.beneficio
      );


    /*
     * SEGUNDA PROTECAO NO FRONTEND:
     * contratos precisam ter o mesmo NB.
     */
    if (
      selectedBenefit &&
      loanBenefit !==
        selectedBenefit
    ) {

      setNotice({
        type: "error",
        text:
          "Nao e permitido juntar contratos de beneficios diferentes.",
      });

      return;
    }


    setSelectedIds([
      ...selectedIds,
      loan._id,
    ]);

    setValidation(null);
    setMotorResult(null);
    setNotice(null);
  };


  const handleValidate =
    async () => {

      if (
        !selectedLoans.length
      ) {
        setNotice({
          type: "warning",
          text:
            "Selecione pelo menos um contrato.",
        });

        return;
      }


      if (
        selectedBenefits.length !==
        1
      ) {

        setNotice({
          type: "error",
          text:
            "Todos os contratos precisam pertencer ao mesmo beneficio.",
        });

        return;
      }


      const blockedSelected =
        selectedLoans
          .map(
            (loan) => ({
              loan,
              check:
                getFactaPrecheck(
                  loan
                ),
            })
          )
          .filter(
            (item) =>
              item.check.blocked
          );

      if (
        blockedSelected.length
      ) {
        setNotice({
          type: "error",
          text:
            blockedSelected
              .map(
                (item) =>
                  `${item.loan.banco}: `
                  + item.check.reason
              )
              .join(" | "),
        });

        return;
      }


      setValidating(true);
      setMotorResult(null);
      setNotice(null);

      try {

        const response =
          await api.post(
            "/portabilidade-multipla/validar",
            {
              banco_destino:
                "FACTA",

              convenio:
                "INSS",

              margem_disponivel:
                money(
                  margin
                ),

              contratos:
                selectedLoans.map(
                  (loan) => ({
                    banco:
                      loan.banco,

                    parcela:
                      money(
                        loan.parcela
                      ),

                    saldo_devedor:
                      money(
                        loan.saldo_devedor
                      ),

                    contrato:
                      loan.contrato ||
                      null,

                    beneficio:
                      normalizeBenefit(
                        loan.beneficio
                      ),
                  })
                ),
            }
          );

        setValidation(
          response
        );

        if (
          !response
            ?.elegivel_previo
        ) {

          setNotice({
            type: "error",
            text:
              "A operacao possui bloqueios nas regras da Portabilidade Multipla.",
          });

          return;
        }


        const activeBenefit =
          benefits[
            activeBenefitIndex
          ] ||
          benefits[0] ||
          {};

        const motorClient =
          extractMotorClient(
            activeBenefit,
            rawResponse,
            cpf
          );


        const motorResponse =
          await api.post(
            "/portabilidade-multipla/simular",
            {
              banco_destino:
                "FACTA",

              convenio:
                "INSS",

              margem_disponivel:
                money(
                  margin
                ),

              cliente:
                motorClient,

              contratos:
                selectedLoans.map(
                  (loan) => ({
                    banco:
                      loan.banco,

                    codigo:
                      loan.codigo ||
                      "",

                    contrato:
                      loan.contrato ||
                      null,

                    beneficio:
                      normalizeBenefit(
                        loan.beneficio
                      ),

                    parcela:
                      money(
                        loan.parcela
                      ),

                    saldo_devedor:
                      money(
                        loan.saldo_devedor
                      ),

                    taxa:
                      money(
                        loan.taxa
                      ),

                    prazo:
                      Number(
                        loan.prazo ||
                        0
                      ),

                    prazo_restante:
                      Number(
                        loan
                          .prazo_restante ||
                        0
                      ),

                    parcelas_pagas:
                      Number(
                        loan
                          .parcelas_pagas ||
                        0
                      ),

                    valor_contrato:
                      money(
                        loan
                          .valor_contrato
                      ),

                    data_averbacao:
                      loan
                        .data_averbacao ||
                      null,
                  })
                ),
            },
            {
              timeout: 90000,
            }
          );

        /* MULTIPLA_NEGATIVE_BLOCK_SUMMARY */

        const negativeMarginMessage =
          "Sem margem para libera\u00e7\u00e3o de troco ou saldo negativo.";

        const negativeMarginBlock =
          Array.isArray(
            motorResponse
              ?.bloqueios_contratos
          )
            ? motorResponse
                .bloqueios_contratos
                .some((block) => {
                  const reasons = [
                    ...(
                      Array.isArray(
                        block?.motivos
                      )
                        ? block.motivos
                        : []
                    ),
                    ...(
                      Array.isArray(
                        block?.razoes
                      )
                        ? block.razoes
                        : []
                    ),
                    ...(
                      Array.isArray(
                        block?.reasons
                      )
                        ? block.reasons
                        : []
                    ),
                    block?.motivo,
                    block?.mensagem,
                  ]
                    .filter(Boolean)
                    .map(
                      (reason) =>
                        String(reason)
                    );

                  return reasons.some(
                    (reason) =>
                      reason.includes(
                        negativeMarginMessage
                      )
                  );
                })
            : false;

        /* MULTIPLA_LAST_MOTOR_FAILURE */

        const motorBlocks =
          Array.isArray(
            motorResponse
              ?.bloqueios_contratos
          )
            ? motorResponse
                .bloqueios_contratos
            : [];

        const lastMotorBlock =
          [...motorBlocks]
            .reverse()
            .find(
              (block) =>
                Array.isArray(
                  block?.motivos
                ) &&
                block.motivos.length > 0
            ) ||
          null;

        const lastMotorReason =
          lastMotorBlock
            ? lastMotorBlock
                .motivos[
                  lastMotorBlock
                    .motivos
                    .length - 1
                ]
            : null;

        const lastMotorBank =
          lastMotorBlock
            ? (
                lastMotorBlock.banco ||
                lastMotorBlock
                  .banco_origem ||
                lastMotorBlock
                  .nome_banco ||
                "FACTA"
              )
            : null;

        const lastMotorFailure =
          lastMotorReason
            ? `${lastMotorBank}: ${lastMotorReason}`
            : null;

        const motorResultForDisplay =
          negativeMarginBlock
            ? {
                ...motorResponse,
                bloqueios_contratos: [],
              }
            : (
                lastMotorBlock &&
                lastMotorReason
              )
              ? {
                  ...motorResponse,

                  bloqueios_contratos: [
                    {
                      ...lastMotorBlock,

                      banco:
                        lastMotorBank,

                      motivos: [
                        lastMotorReason,
                      ],
                    },
                  ],
                }
              : motorResponse;

        setMotorResult(
          motorResultForDisplay
        );

        if (
          motorResponse?.success &&
          motorResponse?.ofertas
            ?.length
        ) {

          setNotice({
            type: "success",
            text:
              `${motorResponse.ofertas.length} `
              + `tabela(s) FACTA elegivel(is) `
              + `para todos os contratos selecionados.`,
          });

        } else {

          const globalBlocks =
            Array.isArray(
              motorResponse?.bloqueios
            )
              ? motorResponse.bloqueios
              : [];

          const lastGlobalBlock =
            globalBlocks.length
              ? String(
                  globalBlocks[
                    globalBlocks.length - 1
                  ]
                )
              : null;

          const visibleFailure =
            lastMotorFailure ||
            lastGlobalBlock;

          setNotice({
            type: "error",
            text:
              negativeMarginBlock
                ? negativeMarginMessage
                : visibleFailure
                  ? `Simula\u00e7\u00e3o n\u00e3o aprovada: ${visibleFailure}`
                  : "Nenhuma tabela FACTA elegivel foi encontrada pelo Motor.",
          });
        }

      } catch (error) {

        console.error(error);

        setNotice({
          type: "error",
          text:
            error?.message ||
            "Erro ao simular a Portabilidade Multipla FACTA.",
        });

      } finally {
        setValidating(false);
      }
    };


  const renderLoan = (
    loan,
    group
  ) => {

    const selected =
      selectedIds.includes(
        loan._id
      );


    const factaPrecheck =
      getFactaPrecheck(
        loan
      );

    const blockedGroup =
      selectedGroup &&
      selectedGroup !== group &&
      !selected;

    const blocked =
      group === "C" ||
      !group ||
      blockedGroup ||
      factaPrecheck.blocked;

    const logo =
      getBankLogo(
        loan
      );

    return (
      <button
        key={loan._id}
        type="button"
        disabled={blocked}
        onClick={() =>
          toggleLoan(
            loan
          )
        }
        className={`
          w-full
          rounded-[1.5rem]
          border
          p-4
          text-left
          transition-all
          duration-300
          ${
            selected
              ? "border-blue-400 bg-blue-50 shadow-xl shadow-blue-100/70"
              : blocked
              ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-55"
              : "border-slate-100 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
          }
        `}
      >
        <div className="flex gap-3">

          <div
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              overflow-hidden
              rounded-xl
              border
              border-slate-100
              bg-white
            "
          >
            {logo ? (
              <img
                src={logo}
                alt=""
                className="
                  h-full
                  w-full
                  object-cover
                "
              />
            ) : (
              <Icons.Landmark
                size={19}
                className="text-slate-400"
              />
            )}
          </div>


          <div className="min-w-0 flex-1">

            <div
              className="
                flex
                flex-wrap
                items-center
                gap-2
              "
            >
              <p
                className="
                  truncate
                  text-xs
                  font-black
                  uppercase
                  text-slate-900
                "
              >
                {loan.banco ||
                  "Banco"}
              </p>

              <span
                className={`
                  rounded-full
                  px-2
                  py-1
                  text-[8px]
                  font-black
                  uppercase
                  ${
                    group === "A"
                      ? "bg-blue-100 text-blue-700"
                      : group === "B"
                      ? "bg-violet-100 text-violet-700"
                      : "bg-red-100 text-red-600"
                  }
                `}
              >
                Grupo {group || "?"}
              </span>
            </div>


            <p
              className="
                mt-1
                text-[9px]
                font-bold
                text-slate-400
              "
            >
              NB {loan.beneficio || "—"}

              {loan.contrato
                ? ` • Contrato ${loan.contrato}`
                : ""}
            </p>


            {factaPrecheck.blocked ? (
              <div
                className="
                  mt-3
                  rounded-xl
                  border
                  border-red-100
                  bg-red-50
                  px-3
                  py-2
                  text-[9px]
                  font-black
                  text-red-600
                "
              >
                FACTA: {factaPrecheck.reason}
              </div>
            ) : null}


            <div
              className="
                mt-3
                grid
                grid-cols-2
                gap-3
                md:grid-cols-3
              "
            >
              <div>
                <p className="text-[8px] font-black uppercase text-slate-400">
                  Parcela
                </p>

                <p className="text-sm font-black text-slate-800">
                  {formatBRL(
                    loan.parcela
                  )}
                </p>
              </div>


              <div>
                <p className="text-[8px] font-black uppercase text-slate-400">
                  Saldo
                </p>

                <p className="text-sm font-black text-blue-700">
                  {formatBRL(
                    loan.saldo_devedor
                  )}
                </p>
              </div>


              <div>
                <p className="text-[8px] font-black uppercase text-slate-400">
                  Taxa atual
                </p>

                <p className="text-sm font-black text-emerald-700">
                  {Number(
                    loan.taxa || 0
                  )
                    .toFixed(2)
                    .replace(".", ",")}
                  % a.m.
                </p>
              </div>


              <div>
                <p className="text-[8px] font-black uppercase text-slate-400">
                  Prazo restante
                </p>

                <p className="text-sm font-black text-slate-800">
                  {Number(
                    loan.prazo_restante ||
                    0
                  )}
                  /
                  {Number(
                    loan.prazo ||
                    0
                  )}
                </p>
              </div>


              <div>
                <p className="text-[8px] font-black uppercase text-slate-400">
                  Valor contrato
                </p>

                <p className="text-sm font-black text-slate-800">
                  {formatBRL(
                    loan.valor_contrato
                  )}
                </p>
              </div>


              <div>
                <p className="text-[8px] font-black uppercase text-slate-400">
                  Parcelas pagas
                </p>

                <p className="text-sm font-black text-slate-800">
                  {Number(
                    loan.parcelas_pagas ||
                    0
                  )}
                </p>
              </div>
            </div>

          </div>


          <div
            className={`
              flex
              h-7
              w-7
              shrink-0
              items-center
              justify-center
              rounded-full
              border
              ${
                selected
                  ? "border-blue-600 bg-blue-600 text-white"
                  : group === "C"
                  ? "border-red-200 bg-red-50 text-red-500"
                  : "border-slate-200 bg-white"
              }
            `}
          >
            {selected ? (
              <Icons.Check
                size={14}
              />
            ) : group === "C" ? (
              <span
                className="
                  text-xs
                  font-black
                "
              >
                ×
              </span>
            ) : null}
          </div>

        </div>
      </button>
    );
  };


  const renderGroup = (
    group,
    title,
    description
  ) => {

    const list =
      groups[group] || [];

    const palette =
      group === "A"
        ? {
            header:
              "bg-blue-50 border-blue-100",
            text:
              "text-blue-600",
          }
        : group === "B"
        ? {
            header:
              "bg-violet-50 border-violet-100",
            text:
              "text-violet-600",
          }
        : {
            header:
              "bg-red-50 border-red-100",
            text:
              "text-red-600",
          };

    return (
      <section
        className="
          overflow-hidden
          rounded-[2rem]
          border
          border-slate-100
          bg-white
          shadow-xl
          shadow-slate-200/40
        "
      >
        <div
          className={`
            border-b
            px-5
            py-4
            ${palette.header}
          `}
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-3
            "
          >
            <div>
              <p
                className={`
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.2em]
                  ${palette.text}
                `}
              >
                {title}
              </p>

              <p
                className="
                  mt-1
                  text-[10px]
                  font-bold
                  text-slate-500
                "
              >
                {description}
              </p>
            </div>

            <span
              className="
                rounded-full
                bg-white
                px-3
                py-1.5
                text-[9px]
                font-black
                text-slate-500
                shadow-sm
              "
            >
              {list.length}
            </span>
          </div>
        </div>


        <div className="space-y-3 p-4">

          {list.length ? (

            list.map(
              (loan) =>
                renderLoan(
                  loan,
                  group
                )
            )

          ) : (

            <div
              className="
                rounded-2xl
                border
                border-dashed
                border-slate-200
                p-6
                text-center
                text-[10px]
                font-bold
                uppercase
                text-slate-400
              "
            >
              Nenhum contrato
            </div>

          )}

        </div>
      </section>
    );
  };


  return (
    <main
      className="
        min-h-screen
        bg-[#f5f7fb]
      "
    >
      <div
        className="
          mx-auto
          max-w-[1700px]
          px-4
          py-6
          md:px-8
        "
      >

        <section
          className="
            relative
            overflow-hidden
            rounded-[2.5rem]
            bg-slate-950
            p-7
            text-white
            shadow-2xl
            md:p-9
          "
        >
          <div
            className="
              absolute
              -right-20
              -top-20
              h-72
              w-72
              rounded-full
              opacity-20
              blur-3xl
            "
            style={{
              background:
                brandColor,
            }}
          />

          <div
            className="
              absolute
              -bottom-24
              left-1/3
              h-64
              w-64
              rounded-full
              opacity-20
              blur-3xl
            "
            style={{
              background:
                secondaryColor,
            }}
          />


          <div
            className="
              relative
              z-10
              flex
              flex-col
              gap-6
              xl:flex-row
              xl:items-center
              xl:justify-between
            "
          >

            <div>
              <div
                className="
                  mb-4
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-white/10
                  bg-white/10
                  px-3
                  py-2
                "
              >
                <Icons.Sparkles
                  size={14}
                />

                <span
                  className="
                    text-[9px]
                    font-black
                    uppercase
                    tracking-[0.2em]
                  "
                >
                  FACTA • INSS
                </span>
              </div>

              <h1
                className="
                  text-3xl
                  font-black
                  tracking-tight
                  md:text-4xl
                "
              >
                Portabilidade{" "}

                <span
                  style={{
                    color:
                      secondaryColor,
                  }}
                >
                  Múltipla
                </span>
              </h1>

              <p
                className="
                  mt-2
                  max-w-3xl
                  text-sm
                  font-semibold
                  text-white/50
                "
              >
                Unifique até 6 contratos do mesmo benefício em uma única operação de Refin da Portabilidade.
              </p>
            </div>


            <div
              className="
                grid
                grid-cols-2
                gap-2
                md:grid-cols-4
              "
            >
              {[
                ["Banco", "FACTA"],
                ["Convênio", "INSS"],
                ["Limite", "6 contratos"],
                ["Benefício", "1 NB"],
              ].map(
                ([label, value]) => (
                  <div
                    key={label}
                    className="
                      rounded-2xl
                      border
                      border-white/10
                      bg-white/5
                      px-4
                      py-3
                    "
                  >
                    <p
                      className="
                        text-[8px]
                        font-black
                        uppercase
                        tracking-wider
                        text-white/30
                      "
                    >
                      {label}
                    </p>

                    <p
                      className="
                        mt-1
                        text-sm
                        font-black
                      "
                    >
                      {value}
                    </p>
                  </div>
                )
              )}
            </div>

          </div>
        </section>


        <div
          className="
            mt-6
            grid
            gap-4
            xl:grid-cols-2
          "
        >

          <section
            className="
              rounded-[2rem]
              border
              border-slate-100
              bg-white
              p-6
              shadow-xl
              shadow-slate-200/40
            "
          >

            <div
              className="
                flex
                items-center
                gap-3
              "
            >
              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  text-white
                "
                style={{
                  background:
                    brandColor,
                }}
              >
                <Icons.Search
                  size={19}
                />
              </div>

              <div>
                <p
                  className="
                    text-sm
                    font-black
                    uppercase
                    text-slate-900
                  "
                >
                  Consulta por CPF
                </p>

                <p
                  className="
                    text-[10px]
                    font-bold
                    text-slate-400
                  "
                >
                  Benefícios e contratos INSS
                </p>
              </div>
            </div>


            <div
              className="
                mt-5
                flex
                flex-col
                gap-3
                sm:flex-row
              "
            >
              <input
                value={cpf}
                onChange={(event) =>
                  setCpf(
                    maskCPF(
                      event.target.value
                    )
                  )
                }
                onKeyDown={(event) => {

                  if (
                    event.key ===
                    "Enter"
                  ) {
                    handleCpfSearch();
                  }
                }}
                placeholder="000.000.000-00"
                className="
                  h-14
                  flex-1
                  rounded-2xl
                  border
                  border-slate-200
                  bg-slate-50
                  px-5
                  text-sm
                  font-black
                  outline-none
                  transition
                  focus:border-blue-400
                  focus:bg-white
                  focus:ring-4
                  focus:ring-blue-100
                "
              />

              <button
                type="button"
                onClick={
                  handleCpfSearch
                }
                disabled={
                  loadingCpf
                }
                className="
                  flex
                  h-14
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  px-6
                  text-xs
                  font-black
                  uppercase
                  text-white
                  shadow-xl
                  transition
                  hover:-translate-y-0.5
                  disabled:opacity-50
                "
                style={{
                  background:
                    brandColor,
                }}
              >
                {loadingCpf ? (
                  <Icons.Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Icons.Search
                    size={16}
                  />
                )}

                Consultar
              </button>
            </div>

          </section>


          <section
            className="
              rounded-[2rem]
              border
              border-slate-100
              bg-white
              p-6
              shadow-xl
              shadow-slate-200/40
            "
          >

            <div
              className="
                flex
                items-center
                gap-3
              "
            >
              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-slate-900
                  text-white
                "
              >
                <Icons.FileText
                  size={19}
                />
              </div>

              <div>
                <p
                  className="
                    text-sm
                    font-black
                    uppercase
                    text-slate-900
                  "
                >
                  Extrato INSS
                </p>

                <p
                  className="
                    text-[10px]
                    font-bold
                    text-slate-400
                  "
                >
                  Utilize o PDF do benefício
                </p>
              </div>
            </div>


            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) =>
                handleFile(
                  event.target
                    .files?.[0]
                )
              }
            />

            <button
              type="button"
              onClick={() =>
                fileInputRef
                  .current
                  ?.click()
              }
              disabled={
                loadingFile
              }
              className="
                mt-5
                flex
                h-14
                w-full
                items-center
                justify-center
                gap-2
                rounded-2xl
                border-2
                border-dashed
                border-slate-200
                bg-slate-50
                text-xs
                font-black
                uppercase
                text-slate-600
                transition
                hover:border-blue-300
                hover:bg-blue-50
                hover:text-blue-700
              "
            >
              {loadingFile ? (
                <Icons.Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Icons.FileText
                  size={16}
                />
              )}

              {loadingFile
                ? "Lendo extrato..."
                : "Selecionar PDF"}
            </button>

          </section>
        </div>


        {notice ? (
          <div className="mt-4">
            <Notice
              type={
                notice.type
              }
            >
              {notice.text}
            </Notice>
          </div>
        ) : null}


        {benefits.length > 1 ? (

          <section
            className="
              mt-5
              rounded-[2rem]
              border
              border-slate-100
              bg-white
              p-5
              shadow-lg
            "
          >
            <div
              className="
                flex
                flex-col
                gap-3
                md:flex-row
                md:items-center
                md:justify-between
              "
            >
              <div>
                <p
                  className="
                    text-xs
                    font-black
                    uppercase
                    text-slate-800
                  "
                >
                  Selecione o benefício
                </p>

                <p
                  className="
                    mt-1
                    text-[10px]
                    font-bold
                    text-slate-400
                  "
                >
                  Contratos de benefícios diferentes não podem ser unificados.
                </p>
              </div>

              <div
                className="
                  flex
                  flex-wrap
                  gap-2
                "
              >
                {benefits.map(
                  (
                    benefit,
                    index
                  ) => {

                    const nb =
                      extractBenefitNumber(
                        benefit
                      );

                    const active =
                      index ===
                      activeBenefitIndex;

                    return (
                      <button
                        key={
                          nb ||
                          index
                        }
                        type="button"
                        onClick={() =>
                          switchBenefit(
                            index
                          )
                        }
                        className={`
                          rounded-xl
                          px-4
                          py-3
                          text-[10px]
                          font-black
                          uppercase
                          transition
                          ${
                            active
                              ? "text-white shadow-lg"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }
                        `}
                        style={
                          active
                            ? {
                                background:
                                  brandColor,
                              }
                            : {}
                        }
                      >
                        NB{" "}
                        {nb ||
                          index + 1}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </section>

        ) : null}


        {loans.length > 0 ? (
          <>

            <section
              className="
                mt-6
                rounded-[2rem]
                border
                border-slate-100
                bg-white
                p-6
                shadow-xl
                shadow-slate-200/40
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-4
                  md:flex-row
                  md:items-center
                  md:justify-between
                "
              >

                <div>
                  <p
                    className="
                      text-[9px]
                      font-black
                      uppercase
                      tracking-[0.2em]
                      text-slate-400
                    "
                  >
                    Cliente
                  </p>

                  <h2
                    className="
                      mt-1
                      text-xl
                      font-black
                      uppercase
                      text-slate-900
                    "
                  >
                    {clientData.nome}
                  </h2>

                  <div
                    className="
                      mt-2
                      flex
                      flex-wrap
                      gap-2
                      text-[10px]
                      font-bold
                      text-slate-500
                    "
                  >
                    <span>
                      CPF{" "}
                      {maskCPF(
                        clientData.cpf
                      )}
                    </span>

                    <span>•</span>

                    <span
                      className="
                        rounded-full
                        bg-blue-50
                        px-2
                        py-1
                        font-black
                        text-blue-700
                      "
                    >
                      NB{" "}
                      {
                        clientData.beneficio
                      }
                    </span>

                    <span>•</span>

                    <span>
                      Origem{" "}
                      {source}
                    </span>
                  </div>
                </div>


                <div
                  className={`
                    rounded-2xl
                    border
                    px-5
                    py-3
                    ${
                      margin < 0
                        ? "border-red-100 bg-red-50"
                        : "border-emerald-100 bg-emerald-50"
                    }
                  `}
                >
                  <p
                    className="
                      text-[8px]
                      font-black
                      uppercase
                      text-slate-400
                    "
                  >
                    Margem disponível
                  </p>

                  <p
                    className={`
                      text-lg
                      font-black
                      ${
                        margin < 0
                          ? "text-red-600"
                          : "text-emerald-600"
                      }
                    `}
                  >
                    {formatBRL(
                      margin
                    )}
                  </p>
                </div>

              </div>
            </section>


            <div
              className="
                mt-6
                grid
                gap-6
                2xl:grid-cols-[minmax(0,1fr)_400px]
              "
            >

              <div className="space-y-5">

                {renderGroup(
                  "A",
                  "Grupo A",
                  "Contratos unificáveis entre si"
                )}

                {renderGroup(
                  "B",
                  "Grupo B",
                  "Contratos unificáveis entre si"
                )}

                {renderGroup(
                  "C",
                  "Grupo C",
                  "Não são unificáveis"
                )}


                {groups.OTHER.length >
                0 ? (

                  <section
                    className="
                      rounded-[2rem]
                      border
                      border-amber-100
                      bg-amber-50
                      p-5
                    "
                  >
                    <p
                      className="
                        text-[10px]
                        font-black
                        uppercase
                        tracking-[0.2em]
                        text-amber-700
                      "
                    >
                      Bancos não classificados
                    </p>

                    <p
                      className="
                        mt-1
                        text-[10px]
                        font-bold
                        text-amber-600
                      "
                    >
                      Estes contratos permanecem bloqueados.
                    </p>

                    <div
                      className="
                        mt-4
                        space-y-3
                      "
                    >
                      {groups.OTHER.map(
                        (loan) =>
                          renderLoan(
                            loan,
                            null
                          )
                      )}
                    </div>
                  </section>

                ) : null}

              </div>


              <aside
                className="
                  2xl:sticky
                  2xl:top-6
                  2xl:self-start
                "
              >
                <section
                  className="
                    overflow-hidden
                    rounded-[2.3rem]
                    bg-slate-950
                    text-white
                    shadow-2xl
                  "
                >

                  <div
                    className="h-1.5"
                    style={{
                      background:
                        brandColor,
                    }}
                  />


                  <div className="p-6">

                    <div
                      className="
                        flex
                        items-start
                        justify-between
                        gap-4
                      "
                    >

                      <div>
                        <p
                          className="
                            text-[9px]
                            font-black
                            uppercase
                            tracking-[0.22em]
                            text-white/30
                          "
                        >
                          Resumo da operação
                        </p>

                        <h3
                          className="
                            mt-1
                            text-xl
                            font-black
                          "
                        >
                          FACTA
                        </h3>

                        <p
                          className="
                            mt-1
                            text-[10px]
                            font-bold
                            uppercase
                            text-white/40
                          "
                        >
                          Refin da Portabilidade
                        </p>
                      </div>


                      <div
                        className="
                          rounded-xl
                          border
                          border-white/10
                          bg-white/5
                          px-3
                          py-2
                          text-center
                        "
                      >
                        <p
                          className="
                            text-xl
                            font-black
                          "
                        >
                          {
                            selectedLoans.length
                          }
                          /
                          {
                            config.max_contratos
                          }
                        </p>

                        <p
                          className="
                            text-[7px]
                            font-black
                            uppercase
                            text-white/30
                          "
                        >
                          contratos
                        </p>
                      </div>

                    </div>


                    <div
                      className="
                        mt-6
                        grid
                        grid-cols-2
                        gap-3
                      "
                    >

                      <div
                        className="
                          rounded-2xl
                          border
                          border-white/10
                          bg-white/5
                          p-4
                        "
                      >
                        <p
                          className="
                            text-[8px]
                            font-black
                            uppercase
                            text-white/30
                          "
                        >
                          Grupo
                        </p>

                        <p
                          className="
                            mt-1
                            text-lg
                            font-black
                          "
                        >
                          {selectedGroup ||
                            "—"}
                        </p>
                      </div>


                      <div
                        className="
                          rounded-2xl
                          border
                          border-white/10
                          bg-white/5
                          p-4
                        "
                      >
                        <p
                          className="
                            text-[8px]
                            font-black
                            uppercase
                            text-white/30
                          "
                        >
                          Benefício
                        </p>

                        <p
                          className="
                            mt-1
                            truncate
                            text-sm
                            font-black
                          "
                        >
                          {selectedBenefit
                            ? `NB ${selectedBenefit}`
                            : `NB ${clientData.beneficio || "—"}`}
                        </p>
                      </div>

                    </div>


                    <div
                      className="
                        mt-5
                        space-y-3
                      "
                    >

                      <div
                        className="
                          flex
                          items-center
                          justify-between
                          border-b
                          border-white/10
                          pb-3
                        "
                      >
                        <span
                          className="
                            text-xs
                            font-bold
                            text-white/45
                          "
                        >
                          Soma das parcelas
                        </span>

                        <span
                          className="
                            text-xs
                            font-black
                          "
                        >
                          {formatBRL(
                            summary.somaParcelas
                          )}
                        </span>
                      </div>


                      <div
                        className="
                          flex
                          items-center
                          justify-between
                          border-b
                          border-white/10
                          pb-3
                        "
                      >
                        <span
                          className="
                            text-xs
                            font-bold
                            text-white/45
                          "
                        >
                          Margem negativa
                        </span>

                        <span
                          className="
                            text-xs
                            font-black
                            text-red-300
                          "
                        >
                          {formatBRL(
                            summary.margemNegativa
                          )}
                        </span>
                      </div>


                      <div
                        className="
                          flex
                          items-center
                          justify-between
                          border-b
                          border-white/10
                          pb-3
                        "
                      >
                        <span
                          className="
                            text-xs
                            font-bold
                            text-white/45
                          "
                        >
                          Saldo total
                        </span>

                        <span
                          className="
                            text-xs
                            font-black
                          "
                        >
                          {formatBRL(
                            summary.somaSaldos
                          )}
                        </span>
                      </div>

                    </div>


                    <div
                      className="
                        mt-5
                        rounded-[1.6rem]
                        border
                        border-blue-400/20
                        bg-blue-500/10
                        p-5
                      "
                    >
                      <p
                        className="
                          text-[8px]
                          font-black
                          uppercase
                          tracking-[0.2em]
                          text-blue-300
                        "
                      >
                        Nova parcela do Refin
                      </p>

                      <p
                        className="
                          mt-1
                          text-3xl
                          font-black
                        "
                      >
                        {formatBRL(
                          summary.parcelaRefin
                        )}
                      </p>

                      <p
                        className="
                          mt-2
                          text-[9px]
                          font-semibold
                          leading-relaxed
                          text-white/40
                        "
                      >
                        Soma das parcelas portadas menos a margem negativa.
                      </p>
                    </div>


                    <div
                      className="
                        mt-5
                        rounded-[1.5rem]
                        border
                        border-white/10
                        bg-white/5
                        p-4
                      "
                    >
                      <div
                        className="
                          flex
                          items-center
                          justify-between
                          gap-4
                        "
                      >

                        <div>
                          <p
                            className="
                              text-[8px]
                              font-black
                              uppercase
                              text-white/30
                            "
                          >
                            Parcela de viabilidade
                          </p>

                          <p
                            className="
                              mt-1
                              text-xs
                              font-black
                            "
                          >
                            Necessário{" "}
                            {formatBRL(
                              summary.minimoViabilidade
                            )}
                          </p>

                          <p
                            className="
                              mt-1
                              text-[9px]
                              font-bold
                              text-white/40
                            "
                          >
                            Maior parcela{" "}
                            {formatBRL(
                              summary.maiorParcela
                            )}
                          </p>
                        </div>


                        <div
                          className={`
                            flex
                            h-10
                            w-10
                            items-center
                            justify-center
                            rounded-full
                            ${
                              summary.viabilidade
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-red-500/20 text-red-300"
                            }
                          `}
                        >
                          {summary.viabilidade ? (
                            <Icons.Check
                              size={18}
                            />
                          ) : (
                            <span
                              className="
                                text-lg
                                font-black
                              "
                            >
                              !
                            </span>
                          )}
                        </div>

                      </div>
                    </div>


                    {validation ? (
                      <div
                        className="
                          mt-5
                          space-y-2
                        "
                      >
                        {validation.bloqueios
                          ?.map(
                            (
                              message,
                              index
                            ) => (
                              <Notice
                                key={index}
                                type="error"
                              >
                                {message}
                              </Notice>
                            )
                          )}

                        {validation.avisos
                          ?.map(
                            (
                              message,
                              index
                            ) => (
                              <Notice
                                key={index}
                                type="warning"
                              >
                                {message}
                              </Notice>
                            )
                          )}
                      </div>
                    ) : null}


                    {motorResult
                      ?.bloqueios_contratos
                      ?.length > 0 ? (
                      <div
                        className="
                          mt-5
                          space-y-2
                        "
                      >
                        <p
                          className="
                            text-[8px]
                            font-black
                            uppercase
                            tracking-[0.18em]
                            text-red-300
                          "
                        >
                          Bloqueios do Motor
                        </p>

                        {motorResult
                          .bloqueios_contratos
                          .map(
                            (
                              item,
                              index
                            ) => (
                              <div
                                key={index}
                                className="
                                  rounded-xl
                                  border
                                  border-red-400/20
                                  bg-red-500/10
                                  p-3
                                "
                              >
                                <p
                                  className="
                                    text-[10px]
                                    font-black
                                    text-red-200
                                  "
                                >
                                  {item.banco}
                                </p>

                                {(item.motivos || [])
                                  .map(
                                    (
                                      reason,
                                      reasonIndex
                                    ) => (
                                      <p
                                        key={
                                          reasonIndex
                                        }
                                        className="
                                          mt-1
                                          text-[9px]
                                          font-semibold
                                          leading-relaxed
                                          text-red-100/60
                                        "
                                      >
                                        {reason}
                                      </p>
                                    )
                                  )}
                              </div>
                            )
                          )}
                      </div>
                    ) : null}


                    {motorResult
                      ?.ofertas
                      ?.length > 0 ? (
                      <div
                        className="
                          mt-6
                          space-y-3
                        "
                      >
                        <div
                          className="
                            flex
                            items-center
                            justify-between
                            gap-2
                          "
                        >
                          <div>
                            <p
                              className="
                                text-[8px]
                                font-black
                                uppercase
                                tracking-[0.2em]
                                text-blue-300
                              "
                            >
                              Tabelas FACTA
                            </p>

                            <p
                              className="
                                mt-1
                                text-[9px]
                                font-semibold
                                text-white/35
                              "
                            >
                              Aprovadas em todos os contratos
                            </p>
                          </div>

                          <span
                            className="
                              rounded-full
                              bg-blue-500/15
                              px-2.5
                              py-1
                              text-[9px]
                              font-black
                              text-blue-300
                            "
                          >
                            {
                              motorResult
                                .ofertas
                                .length
                            }
                          </span>
                        </div>


                        {/* MULTIPLA_FACTA_TERM_BUTTONS */}
                        {factaAvailableTerms.length > 0 ? (
                          <div
                            className="
                              rounded-2xl
                              border
                              border-white/10
                              bg-black/10
                              p-3
                            "
                          >
                            <div
                              className="
                                mb-2
                                flex
                                items-center
                                justify-between
                                gap-3
                              "
                            >
                              <p
                                className="
                                  text-[8px]
                                  font-black
                                  uppercase
                                  tracking-[0.18em]
                                  text-white/40
                                "
                              >
                                Prazos disponíveis
                              </p>

                              {factaActiveTerm ? (
                                <p
                                  className="
                                    text-[8px]
                                    font-black
                                    uppercase
                                    text-white/40
                                  "
                                >
                                  {factaActiveTerm}X
                                  {" • "}
                                  {
                                    factaVisibleOffers
                                      .length
                                  }
                                  {" "}
                                  {
                                    factaVisibleOffers
                                      .length === 1
                                      ? "tabela"
                                      : "tabelas"
                                  }
                                </p>
                              ) : null}
                            </div>

                            <div
                              className="
                                flex
                                flex-wrap
                                gap-2
                              "
                            >
                              {
                                factaAvailableTerms
                                  .map(
                                    (term) => {
                                      const termCount =
                                        factaOffers
                                          .filter(
                                            (offer) =>
                                              Number(
                                                offer
                                                  ?.prazo ||
                                                0
                                              ) ===
                                              term
                                          )
                                          .length;

                                      const active =
                                        factaActiveTerm
                                        === term;

                                      return (
                                        <button
                                          key={term}
                                          type="button"
                                          onClick={() =>
                                            setSelectedFactaTerm(
                                              term
                                            )
                                          }
                                          className={`
                                            rounded-xl
                                            px-3
                                            py-2
                                            text-[9px]
                                            font-black
                                            uppercase
                                            tracking-wider
                                            transition-all
                                            ${
                                              active
                                                ? "text-white shadow-lg"
                                                : "bg-white/5 text-white/45 hover:bg-white/10 hover:text-white"
                                            }
                                          `}
                                          style={
                                            active
                                              ? {
                                                  background:
                                                    brandColor,
                                                }
                                              : undefined
                                          }
                                        >
                                          {term}X
                                          {" "}
                                          ({termCount})
                                        </button>
                                      );
                                    }
                                  )
                              }
                            </div>
                          </div>
                        ) : null}

                        {factaVisibleOffers.map(
                            (
                              offer,
                              index
                            ) => (
                              <div
                                key={
                                  `${offer.tabela}-${offer.prazo}-${index}`
                                }
                                className={`
                                  rounded-[1.4rem]
                                  border
                                  p-4
                                  ${
                                    index === 0
                                      ? "border-emerald-400/30 bg-emerald-500/10"
                                      : "border-white/10 bg-white/5"
                                  }
                                `}
                              >
                                <div
                                  className="
                                    flex
                                    items-start
                                    justify-between
                                    gap-3
                                  "
                                >
                                  <div
                                    className="
                                      min-w-0
                                      flex-1
                                    "
                                  >
                                    <div
                                      className="
                                        flex
                                        flex-wrap
                                        items-center
                                        gap-2
                                      "
                                    >
                                      <p
                                        className="
                                          truncate
                                          text-[11px]
                                          font-black
                                          text-white
                                        "
                                      >
                                        {offer.tabela}
                                      </p>

                                      {index === 0 ? (
                                        <span
                                          className="
                                            rounded-full
                                            bg-emerald-400/15
                                            px-2
                                            py-1
                                            text-[7px]
                                            font-black
                                            uppercase
                                            tracking-wider
                                            text-emerald-300
                                          "
                                        >
                                          Melhor troco
                                        </span>
                                      ) : null}
                                    </div>

                                    <p
                                      className="
                                        mt-1
                                        text-[9px]
                                        font-bold
                                        text-white/35
                                      "
                                    >
                                      {Number(
                                        offer.prazo ||
                                        0
                                      )}
                                      x
                                      {" \u2022 "}
                                      Taxa{" "}
                                      {Number(
                                        offer.taxa_refin ||
                                        offer.taxa_juros ||
                                        0
                                      )
                                        .toFixed(2)
                                        .replace(
                                          ".",
                                          ","
                                        )}
                                      % a.m.
                                    </p>
                                  </div>

                                  <p
                                    className="
                                      whitespace-nowrap
                                      text-sm
                                      font-black
                                      text-emerald-300
                                    "
                                  >
                                    {formatBRL(
                                      offer.troco
                                    )}
                                  </p>
                                </div>


                                <div
                                  className="
                                    mt-4
                                    grid
                                    grid-cols-2
                                    gap-2
                                  "
                                >
                                  <div
                                    className="
                                      rounded-xl
                                      bg-black/15
                                      p-3
                                    "
                                  >
                                    <p className="text-[7px] font-black uppercase text-white/30">
                                      Parcela Refin
                                    </p>

                                    <p className="mt-1 text-xs font-black">
                                      {formatBRL(
                                        offer.parcela_refin
                                      )}
                                    </p>
                                  </div>


                                  <div
                                    className="
                                      rounded-xl
                                      bg-black/15
                                      p-3
                                    "
                                  >
                                    <p className="text-[7px] font-black uppercase text-white/30">
                                      Novo contrato
                                    </p>

                                    <p className="mt-1 text-xs font-black">
                                      {formatBRL(
                                        offer.novo_contrato
                                      )}
                                    </p>
                                  </div>






                                </div>
                              </div>
                            )
                          )}
                      </div>
                    ) : null}


                    <button
                      type="button"
                      onClick={
                        handleValidate
                      }
                      disabled={
                        validating ||
                        !selectedLoans.length
                      }
                      className="
                        mt-6
                        flex
                        h-14
                        w-full
                        items-center
                        justify-center
                        gap-2
                        rounded-2xl
                        text-xs
                        font-black
                        uppercase
                        tracking-wider
                        text-white
                        shadow-xl
                        transition
                        hover:-translate-y-0.5
                        disabled:cursor-not-allowed
                        disabled:opacity-40
                      "
                      style={{
                        background:
                          brandColor,
                      }}
                    >
                      {validating ? (
                        <Icons.Loader2
                          size={16}
                          className="animate-spin"
                        />
                      ) : validation
                          ?.elegivel_previo ? (
                        <Icons.Check
                          size={16}
                        />
                      ) : (
                        <Icons.Sparkles
                          size={16}
                        />
                      )}

                      {validating
                        ? "Simulando..."
                        : validation
                            ?.elegivel_previo
                        ? "Simulação concluída"
                        : "Simular FACTA"}
                    </button>


                    <p
                      className="
                        mt-3
                        text-center
                        text-[8px]
                        font-bold
                        uppercase
                        tracking-wider
                        text-white/25
                      "
                    >
                      Um único benefício por operação
                    </p>

                  </div>
                </section>
              </aside>

            </div>

          </>
        ) : (

          <section
            className="
              mt-6
              rounded-[2.2rem]
              border
              border-dashed
              border-slate-200
              bg-white
              px-6
              py-16
              text-center
            "
          >
            <div
              className="
                mx-auto
                flex
                h-16
                w-16
                items-center
                justify-center
                rounded-2xl
                bg-slate-100
                text-slate-400
              "
            >
              <Icons.Landmark
                size={26}
              />
            </div>

            <h3
              className="
                mt-5
                text-base
                font-black
                uppercase
                text-slate-800
              "
            >
              Aguardando contratos INSS
            </h3>

            <p
              className="
                mx-auto
                mt-2
                max-w-xl
                text-xs
                font-semibold
                leading-relaxed
                text-slate-400
              "
            >
              Consulte o CPF ou importe um extrato para iniciar a Portabilidade Múltipla FACTA.
            </p>
          </section>

        )}

      </div>
    </main>
  );
}