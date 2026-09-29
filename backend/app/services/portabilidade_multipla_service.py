from __future__ import annotations

import re as _re
import unicodedata
from typing import Any, Dict, List, Optional


class PortabilidadeMultiplaFactaService:
    """
    Regras EXCLUSIVAS da Portabilidade Multipla FACTA / INSS.

    IMPORTANTE:
    - Nao altera o motor atual.
    - Nao altera regras bancarias existentes.
    - Nao altera tabelas ou coeficientes.
    - Atua apenas como pre-validador/consolidador da
      Portabilidade Multipla.
    """

    MAX_CONTRATOS = 6
    # FACTA - regras financeiras extraidas do simulador oficial
    # eportfacta/config.py.
    # MIN_PARCELA_REFIN permanece apenas por compatibilidade com
    # integracoes antigas; a Multipla FACTA nao usa mais parcela
    # minima como criterio financeiro.
    MIN_PARCELA_REFIN = 50.00
    MIN_VALOR_OPERACAO = 3000.00
    TROCO_MINIMO = 50.00
    ADICIONAL_VIABILIDADE = 20.00

    FATORES = {
        "Refin Normal": 0.022594,
        "Refin FLEX 0": 0.022424,
        "Refin Flex 1": 0.022169,
        "Refin Flex 2": 0.021999,
        "Refin Flex 3": 0.021746,
        "Refin Flex 4": 0.021495,
        "Refin Flex 5": 0.021328,
        "Refin Flex 6": 0.021246,
    }

    FATORES_CARENCIA = {
        "Refin Normal": 0.023925,
        "Refin FLEX 0": 0.023730,
        "Refin Flex 1": 0.023439,
        "Refin Flex 2": 0.023246,
        "Refin Flex 3": 0.022958,
        "Refin Flex 4": 0.022672,
        "Refin Flex 5": 0.022482,
        "Refin Flex 6": 0.022293,
        "Refin Flex 7": 0.022093,
    }

    FAIXAS = [
        (
            4000.00,
            5499.99,
            [
                "Refin Normal",
                "Refin FLEX 0",
                "Refin Flex 1",
            ],
        ),
        (
            5500.00,
            8499.99,
            [
                "Refin Normal",
                "Refin FLEX 0",
                "Refin Flex 1",
                "Refin Flex 2",
            ],
        ),
        (
            8500.00,
            13999.99,
            [
                "Refin Normal",
                "Refin FLEX 0",
                "Refin Flex 1",
                "Refin Flex 2",
                "Refin Flex 3",
                "Refin Flex 4",
                "Refin Flex 5",
            ],
        ),
        (
            14000.00,
            100000.00,
            [
                "Refin Normal",
                "Refin FLEX 0",
                "Refin Flex 1",
                "Refin Flex 2",
                "Refin Flex 3",
                "Refin Flex 4",
                "Refin Flex 5",
                "Refin Flex 6",
            ],
        ),
    ]

    FAIXAS_CARENCIA = [
        (
            3000.00,
            3999.99,
            [
                "Refin Normal",
                "Refin FLEX 0",
                "Refin Flex 1",
            ],
        ),
        (
            4000.00,
            5499.99,
            [
                "Refin Normal",
                "Refin FLEX 0",
                "Refin Flex 1",
                "Refin Flex 2",
                "Refin Flex 3",
            ],
        ),
        (
            5500.00,
            8499.99,
            [
                "Refin Normal",
                "Refin FLEX 0",
                "Refin Flex 1",
                "Refin Flex 2",
                "Refin Flex 3",
            ],
        ),
        (
            8500.00,
            13999.99,
            [
                "Refin Normal",
                "Refin FLEX 0",
                "Refin Flex 1",
                "Refin Flex 2",
                "Refin Flex 3",
                "Refin Flex 4",
                "Refin Flex 5",
                "Refin Flex 6",
            ],
        ),
        (
            14000.00,
            100000.00,
            [
                "Refin Normal",
                "Refin FLEX 0",
                "Refin Flex 1",
                "Refin Flex 2",
                "Refin Flex 3",
                "Refin Flex 4",
                "Refin Flex 5",
                "Refin Flex 6",
                "Refin Flex 7",
            ],
        ),
    ]

    GRUPO_A = {
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
    }

    GRUPO_B = {
        "BANCO SEGURO",
        "MERCANTIL",
        "BANCO DO BRASIL",
        "PICPAY",
    }

    # Codigos COMPE exatamente como no config.py do eportfacta.
    GRUPO_A_CODIGOS = {
        "041",
        "318",
        "707",
        "341",
        "104",
        "237",
        "033",
        "121",
        "623",
        "336",
        "626",
        "422",
    }

    GRUPO_B_CODIGOS = {
        "461",
        "389",
        "001",
        "380",
    }

    # Compatibilidade de atributo para consumidores antigos.
    # Na regra oficial FACTA NAO existe Grupo C: todo banco fora
    # dos Grupos A/B somente unifica com a mesma instituicao.
    GRUPO_C = set()

    BANK_ALIASES = {
        "BANRISUL": "BANRISUL",
        "ESTADO DO RIO GRANDE DO SUL": "BANRISUL",
        "BMG": "BMG",
        "COMPE": "COMPE",
        "DAYCOVAL": "DAYCOVAL",
        "ITAU": "ITAU",
        "ITAÚ": "ITAU",
        "CAIXA ECONOMICA FEDERAL": "CAIXA",
        "CAIXA ECONOMICA": "CAIXA",
        "CAIXA": "CAIXA",
        "CEF": "CAIXA",
        "BRADESCO": "BRADESCO",
        "SANTANDER": "SANTANDER",
        "AGIBANK": "AGIBANK",
        "AGIBAN": "AGIBANK",
        "BANCO PAN": "PAN",
        "PANAMERICANO": "PAN",
        "PAN": "PAN",
        "BANCO C6": "C6",
        "C6 BANK": "C6",
        "C6": "C6",
        "SAFRA": "SAFRA",
        "BANCO SEGURO": "BANCO SEGURO",
        "MERCANTIL": "MERCANTIL",
        "BANCO MERCANTIL": "MERCANTIL",
        "BANCO DO BRASIL": "BANCO DO BRASIL",
        "PICPAY": "PICPAY",
        "QI SOCIEDADE": "QI SOCIEDADE",
        "QI SOCIDADE": "QI SOCIEDADE",
        "BANCO ORIGINAL": "BANCO ORIGINAL",
        "ORIGINAL": "BANCO ORIGINAL",
        "BANCO INTER": "BANCO INTER",
        "BANCO MULTIPLO": "BANCO MULTIPLO",
        "BANCO MÚLTIPLO": "BANCO MULTIPLO",
        "BRB": "BRB",
        "DIGIO": "DIGIO",
    }

    @staticmethod
    def _normalizar_texto(value: Any) -> str:
        text = str(value or "").strip().upper()

        text = unicodedata.normalize(
            "NFKD",
            text,
        ).encode(
            "ASCII",
            "ignore",
        ).decode(
            "ASCII"
        )

        return " ".join(text.split())

    @classmethod
    def normalizar_banco(
        cls,
        banco: Any,
    ) -> str:
        nome = cls._normalizar_texto(banco)

        if not nome:
            return ""

        # Prioriza aliases maiores para impedir que
        # "BANCO PAN" seja identificado apenas como "PAN".
        aliases = sorted(
            cls.BANK_ALIASES.items(),
            key=lambda item: len(
                cls._normalizar_texto(item[0])
            ),
            reverse=True,
        )

        for alias, canonical in aliases:
            alias_normalizado = cls._normalizar_texto(
                alias
            )

            if alias_normalizado in nome:
                return canonical

        return nome

    @classmethod
    def identificar_grupo(
        cls,
        banco: Any,
        codigo: Any = None,
    ) -> Optional[str]:
        codigo_compe = ""

        for fonte in (
            str(codigo or "").strip(),
            str(banco or "").strip(),
        ):
            match = _re.search(
                r"(?<!\d)(\d{3})(?!\d)",
                fonte,
            )
            if match:
                codigo_compe = match.group(1)
                break

        if codigo_compe in cls.GRUPO_A_CODIGOS:
            return "A"

        if codigo_compe in cls.GRUPO_B_CODIGOS:
            return "B"

        banco_normalizado = cls.normalizar_banco(
            banco
        )

        if banco_normalizado in cls.GRUPO_A:
            return "A"

        if banco_normalizado in cls.GRUPO_B:
            return "B"

        return None

    @classmethod
    def identidade_unificacao(
        cls,
        banco: Any,
        codigo: Any = None,
    ) -> str:
        """
        Identidade usada pelos bancos fora de A/B.

        O simulador FACTA usa primeiro o codigo COMPE quando
        disponivel; na ausencia dele, usa o nome normalizado.
        """
        fontes = [
            str(codigo or "").strip(),
            str(banco or "").strip(),
        ]

        for fonte in fontes:
            match = _re.search(
                r"(?<!\d)(\d{3})(?!\d)",
                fonte,
            )
            if match:
                return match.group(1)

        return cls.normalizar_banco(
            banco
        )

    @classmethod
    def normalizar_beneficio(
        cls,
        value: Any,
    ) -> str:
        raw = str(value or "").strip()

        digits = "".join(
            char
            for char in raw
            if char.isdigit()
        )

        if digits:
            return digits

        return cls._normalizar_texto(raw)

    @staticmethod
    def _money(value: Any) -> float:
        try:
            return round(float(value or 0), 2)
        except (TypeError, ValueError):
            return 0.0

    # MULTIPLA_PROMOTORA_ORIGIN_RULES

    @staticmethod
    def _promotora_clean_words(value):
        import re

        text = str(value or "").upper()

        for noise in [
            "BANCO",
            "S.A.",
            "SA",
            "CONSIGNADO",
            "CREDITO",
            "FINANCEIRA",
            "BANK",
            "PORTABILIDADE",
            "INSTITUICAO",
        ]:
            text = text.replace(noise, " ")

        return set(
            re.findall(
                r"[A-Z0-9]{2,}",
                text,
            )
        )

    @classmethod
    def _promotora_bank_matches(
        cls,
        input_bank,
        rule_bank,
    ):
        full_origin_name = str(
            input_bank or ""
        ).upper()

        rule_bank_name = str(
            rule_bank or ""
        ).upper()

        input_words = cls._promotora_clean_words(
            full_origin_name
        )

        rule_words = cls._promotora_clean_words(
            rule_bank_name
        )

        if (
            rule_words
            and input_words
            and rule_words.intersection(input_words)
        ):
            return True

        return bool(
            rule_bank_name
            and (
                rule_bank_name in full_origin_name
                or full_origin_name in rule_bank_name
            )
        )

    @staticmethod
    def _promotora_int(value):
        try:
            return max(
                0,
                int(float(value or 0)),
            )
        except (TypeError, ValueError):
            return 0

    @classmethod
    def parcelas_pagas(
        cls,
        contrato: Dict[str, Any],
    ) -> int:
        parcelas_raw = contrato.get(
            "parcelas_pagas"
        )

        if parcelas_raw not in (None, ""):
            return cls._promotora_int(
                parcelas_raw
            )

        prazo = cls._promotora_int(
            contrato.get("prazo")
        )

        prazo_restante = cls._promotora_int(
            contrato.get("prazo_restante")
        )

        return max(
            0,
            prazo - prazo_restante,
        )

    @classmethod
    def validar_regras_promotora_origem(
        cls,
        contratos,
        origin_config=None,
        origin_blocklist=None,
    ):
        """
        Pre-validacao das regras de origem da promotora
        aplicada somente a Portabilidade Multipla.
        """

        origin_config = origin_config or []
        origin_blocklist = origin_blocklist or []

        bloqueios = []

        for index, contrato in enumerate(
            contratos or [],
            start=1,
        ):
            banco = str(
                contrato.get("banco", "") or ""
            ).strip()

            parcelas_pagas = cls.parcelas_pagas(
                contrato
            )

            for rule in origin_config:
                if not isinstance(rule, dict):
                    continue

                rule_bank = str(
                    rule.get("origin_bank", "") or ""
                ).strip()

                if not cls._promotora_bank_matches(
                    banco,
                    rule_bank,
                ):
                    continue

                min_paid = cls._promotora_int(
                    rule.get("min_paid", 0)
                )

                if parcelas_pagas < min_paid:
                    bloqueios.append(
                        f"Contrato {index}: "
                        "Regra da promotora: "
                        f"{rule_bank} exige no minimo "
                        f"{min_paid} parcelas pagas. "
                        f"Contrato possui {parcelas_pagas}."
                    )

                    break

            for rule in origin_blocklist:
                if isinstance(rule, dict):
                    rule_bank = str(
                        rule.get("origin_bank", "") or ""
                    ).strip()
                else:
                    rule_bank = str(
                        rule or ""
                    ).strip()

                if not cls._promotora_bank_matches(
                    banco,
                    rule_bank,
                ):
                    continue

                bloqueios.append(
                    f"Contrato {index}: "
                    "Regra da promotora: "
                    "a promotora nao porta contratos "
                    f"originados no banco {rule_bank}."
                )

                break

        return bloqueios

    @classmethod
    def validar_regras_banco_origem(
        cls,
        contratos,
        origin_config=None,
        origin_blocklist=None,
        min_paid_installments=0,
        min_table_paid_any=0,
    ):
        """
        Valida SOMENTE as regras de origem cadastradas no
        Portabilidade PRO para o banco destino FACTA.

        Nao executa simulacao financeira individual e, portanto,
        nao exige tabela comum entre os contratos.
        """
        origin_config = origin_config or []
        origin_blocklist = origin_blocklist or []

        bloqueios = []
        minimum_global = max(
            cls._promotora_int(
                min_paid_installments
            ),
            cls._promotora_int(
                min_table_paid_any
            ),
        )

        for index, contrato in enumerate(
            contratos or [],
            start=1,
        ):
            banco = " ".join(
                str(
                    contrato.get(key)
                    or ""
                ).strip()
                for key in (
                    "codigo",
                    "banco",
                )
                if str(
                    contrato.get(key)
                    or ""
                ).strip()
            )

            blocked_by = ""

            for rule in origin_blocklist:
                if isinstance(rule, dict):
                    rule_bank = str(
                        rule.get(
                            "origin_bank",
                            "",
                        )
                        or ""
                    ).strip()
                else:
                    rule_bank = str(
                        rule
                        or ""
                    ).strip()

                if not rule_bank:
                    continue

                if cls._promotora_bank_matches(
                    banco,
                    rule_bank,
                ):
                    blocked_by = rule_bank
                    break

            if blocked_by:
                bloqueios.append(
                    f"Contrato {index}: FACTA nao porta "
                    "contratos originados no banco "
                    f"{blocked_by}."
                )
                continue

            parcelas_pagas = cls.parcelas_pagas(
                contrato
            )

            specific_minimum = 0
            specific_bank = ""

            for rule in origin_config:
                if not isinstance(
                    rule,
                    dict,
                ):
                    continue

                rule_bank = str(
                    rule.get(
                        "origin_bank",
                        "",
                    )
                    or ""
                ).strip()

                if not rule_bank:
                    continue

                if not cls._promotora_bank_matches(
                    banco,
                    rule_bank,
                ):
                    continue

                minimum = cls._promotora_int(
                    rule.get(
                        "min_paid",
                        0,
                    )
                )

                if minimum > specific_minimum:
                    specific_minimum = minimum
                    specific_bank = rule_bank

            required = max(
                minimum_global,
                specific_minimum,
            )

            if parcelas_pagas < required:
                banco_label = (
                    specific_bank
                    or str(
                        contrato.get(
                            "banco",
                            "",
                        )
                        or "Banco de origem"
                    ).strip()
                )

                bloqueios.append(
                    f"Contrato {index}: {banco_label} "
                    f"exige no minimo {required} parcelas "
                    "pagas para portabilidade FACTA. "
                    f"Contrato possui {parcelas_pagas}."
                )

        return bloqueios

    @classmethod
    def tabelas_disponiveis(
        cls,
        bruto,
        faixas,
    ):
        for valor_minimo, valor_maximo, tabelas in (
            faixas
            or []
        ):
            if (
                valor_minimo
                <= bruto
                <= valor_maximo
            ):
                return list(
                    tabelas
                )

        return []

    @classmethod
    def simular_financeiro(
        cls,
        *,
        parcela_refin,
        saldo_consolidado,
    ):
        """
        Replica o calculo financeiro do eportfacta:

            bruto = parcela consolidada / fator
            bruto >= R$ 3.000,00
            tabela precisa pertencer a faixa do bruto
            troco = bruto - saldo consolidado
            somente troco > R$ 50,00

        Executa a simulacao UMA vez sobre os totais consolidados.
        """
        parcela_refin = cls._money(
            parcela_refin
        )
        saldo_consolidado = cls._money(
            saldo_consolidado
        )

        ofertas = []
        ordem = 0

        configuracoes = [
            (
                "Sem Carencia",
                cls.FAIXAS,
                cls.FATORES,
            ),
            (
                "Com Carencia",
                cls.FAIXAS_CARENCIA,
                cls.FATORES_CARENCIA,
            ),
        ]

        for modalidade, faixas, fatores in configuracoes:
            for tabela, fator in fatores.items():
                if fator <= 0:
                    continue

                bruto = (
                    parcela_refin
                    / fator
                )

                if bruto < cls.MIN_VALOR_OPERACAO:
                    continue

                tabelas_liberadas = (
                    cls.tabelas_disponiveis(
                        bruto,
                        faixas,
                    )
                )

                if tabela not in tabelas_liberadas:
                    continue

                troco = (
                    bruto
                    - saldo_consolidado
                )

                # Regra oficial e estrita: somente troco > 50.
                if troco <= cls.TROCO_MINIMO:
                    continue

                ordem += 1

                ofertas.append({
                    "banco": "FACTA",
                    "tabela": tabela,
                    "modalidade": modalidade,
                    "com_carencia": (
                        modalidade
                        == "Com Carencia"
                    ),
                    "prazo": 0,
                    "taxa_juros": 0.0,
                    "taxa_refin": 0.0,
                    "fator": fator,
                    "coeficiente": fator,
                    "parcela_refin": round(
                        parcela_refin,
                        2,
                    ),
                    "novo_contrato": round(
                        bruto,
                        2,
                    ),
                    "valor_total_contrato": round(
                        bruto,
                        2,
                    ),
                    "saldo_total": round(
                        saldo_consolidado,
                        2,
                    ),
                    "saldo_devedor": round(
                        saldo_consolidado,
                        2,
                    ),
                    "troco": round(
                        troco,
                        2,
                    ),
                    "valor_liberado": round(
                        troco,
                        2,
                    ),
                    "ordem_facta": ordem,
                })

        return ofertas


    @classmethod
    def validar(
        cls,
        *,
        banco_destino: str,
        convenio: str,
        margem_disponivel: float,
        contratos: List[Dict[str, Any]],
        valor_operacao_refin: Optional[float] = None,
    ) -> Dict[str, Any]:
        bloqueios: List[str] = []
        avisos: List[str] = []

        banco_destino_norm = cls._normalizar_texto(
            banco_destino
        )

        convenio_norm = cls._normalizar_texto(
            convenio
        )

        if "FACTA" not in banco_destino_norm:
            bloqueios.append(
                "A Portabilidade Multipla desta "
                "modalidade esta disponivel apenas "
                "para o Banco FACTA."
            )

        if convenio_norm != "INSS":
            bloqueios.append(
                "A Portabilidade Multipla FACTA "
                "esta disponivel apenas para INSS."
            )

        total_contratos = len(contratos)

        if total_contratos < 1:
            bloqueios.append(
                "Selecione pelo menos um contrato."
            )

        if total_contratos > cls.MAX_CONTRATOS:
            bloqueios.append(
                "A Portabilidade Multipla FACTA "
                "permite no maximo 6 contratos."
            )

        contratos_normalizados = []
        grupos_ativos = set()
        chaves_unificacao = set()
        identidades_fora_grupo = set()
        beneficios_ativos = set()

        soma_parcelas = 0.0
        soma_saldos = 0.0
        maior_parcela = 0.0

        for index, contrato in enumerate(
            contratos,
            start=1,
        ):
            banco_original = contrato.get(
                "banco",
                "",
            )

            banco = cls.normalizar_banco(
                banco_original
            )

            grupo = cls.identificar_grupo(
                banco_original,
                contrato.get("codigo"),
            )

            identidade_banco = (
                cls.identidade_unificacao(
                    banco_original,
                    contrato.get("codigo"),
                )
            )

            if grupo in {
                "A",
                "B",
            }:
                chave_unificacao = (
                    f"GRUPO:{grupo}"
                )
                grupos_ativos.add(
                    grupo
                )
            else:
                chave_unificacao = (
                    f"BANCO:{identidade_banco}"
                    if identidade_banco
                    else ""
                )
                if identidade_banco:
                    identidades_fora_grupo.add(
                        identidade_banco
                    )

            if chave_unificacao:
                chaves_unificacao.add(
                    chave_unificacao
                )

            parcela = cls._money(
                contrato.get("parcela")
            )

            saldo = cls._money(
                contrato.get(
                    "saldo_devedor"
                )
            )

            beneficio_original = (
                contrato.get("beneficio")
            )

            beneficio = (
                cls.normalizar_beneficio(
                    beneficio_original
                )
            )

            if "beneficio" in contrato:
                if not beneficio:
                    bloqueios.append(
                        f"Contrato {index}: "
                        "beneficio nao informado."
                    )
                else:
                    beneficios_ativos.add(
                        beneficio
                    )

            if parcela <= 0:
                bloqueios.append(
                    f"Contrato {index}: "
                    "parcela deve ser maior que zero."
                )

            if not banco:
                bloqueios.append(
                    f"Contrato {index}: "
                    "banco nao informado."
                )

            soma_parcelas += parcela
            soma_saldos += saldo
            maior_parcela = max(
                maior_parcela,
                parcela,
            )

            contratos_normalizados.append(
                {
                    **contrato,
                    "banco_original": banco_original,
                    "banco_normalizado": banco,
                    "grupo_facta": grupo,
                    "identidade_unificacao": (
                        identidade_banco
                    ),
                    "chave_unificacao": (
                        chave_unificacao
                    ),
                    "beneficio": beneficio,
                    "parcela": parcela,
                    "saldo_devedor": saldo,
                    "selecionavel": bool(
                        banco
                    ),
                }
            )

        if len(chaves_unificacao) > 1:
            bloqueios.append(
                "Os contratos selecionados nao sao "
                "compativeis para unificacao FACTA: "
                "Grupo A unifica somente com A; Grupo B "
                "somente com B; bancos fora de A/B "
                "somente com contratos da mesma instituicao."
            )

        if len(beneficios_ativos) > 1:
            bloqueios.append(
                "Nao e permitido unificar contratos "
                "de beneficios diferentes na "
                "Portabilidade Multipla FACTA."
            )

        tem_ge_12 = any(
            cls.parcelas_pagas(c) >= 12
            for c in contratos
        )
        tem_lt_12 = any(
            cls.parcelas_pagas(c) < 12
            for c in contratos
        )

        if tem_ge_12 and tem_lt_12:
            bloqueios.append(
                "Nao e permitido unificar contratos com 12 ou mais "
                "parcelas pagas com contratos com menos de 12 "
                "parcelas pagas na Portabilidade Multipla FACTA."
            )

        beneficio_operacao = (
            next(iter(beneficios_ativos))
            if len(beneficios_ativos) == 1
            else None
        )

        grupo_operacao = (
            next(iter(grupos_ativos))
            if (
                len(grupos_ativos) == 1
                and len(chaves_unificacao) == 1
            )
            else (
                "MESMO_BANCO"
                if (
                    len(chaves_unificacao) == 1
                    and not grupos_ativos
                )
                else None
            )
        )

        identidade_operacao = (
            next(
                iter(
                    identidades_fora_grupo
                )
            )
            if (
                grupo_operacao
                == "MESMO_BANCO"
                and len(
                    identidades_fora_grupo
                )
                == 1
            )
            else None
        )

        margem_disponivel = cls._money(
            margem_disponivel
        )

        margem_negativa = round(
            max(
                0.0,
                -margem_disponivel,
            ),
            2,
        )

        parcela_viabilidade_minima = (
            round(
                margem_negativa
                + cls.ADICIONAL_VIABILIDADE,
                2,
            )
            if margem_negativa > 0
            else 0.0
        )

        regra_viabilidade_atendida = True

        if margem_negativa > 0:
            regra_viabilidade_atendida = (
                maior_parcela
                >= parcela_viabilidade_minima
            )

            if not regra_viabilidade_atendida:
                bloqueios.append(
                    "Margem negativa nao compensada: "
                    "pelo menos uma parcela portada "
                    "deve ser R$ 20,00 superior ao "
                    "valor da margem negativa."
                )

        # MULTIPLA_FACTA_REFIN_MARGIN_V4
        # O +R$20,00 existe SOMENTE como criterio de viabilidade:
        # pelo menos uma parcela >= negativo + 20.
        # Ele NAO e somado na parcela consolidada.
        parcela_refin = round(
            soma_parcelas
            - margem_negativa,
            2,
        )

        if parcela_refin <= 0:
            bloqueios.append(
                "A parcela do Refin ficou zerada "
                "ou negativa apos o abatimento "
                "da margem negativa."
            )

        valor_operacao = (
            cls._money(valor_operacao_refin)
            if valor_operacao_refin is not None
            else None
        )

        # A regra financeira e aplicada depois, por tabela:
        # bruto >= 3.000 e troco > 50.
        # Nao existe mais "parcela >= 50 OU bruto >= 3000".
        regra_minimo_refin = None

        return {
            "banco_destino": "FACTA",
            "convenio": "INSS",
            "elegivel_previo": (
                len(bloqueios) == 0
            ),
            "grupo_operacao": grupo_operacao,
            "identidade_operacao": (
                identidade_operacao
            ),
            "chaves_unificacao": sorted(
                chaves_unificacao
            ),
            "beneficio_operacao": beneficio_operacao,
            "quantidade_contratos": (
                total_contratos
            ),
            "limite_contratos": (
                cls.MAX_CONTRATOS
            ),
            "soma_parcelas": round(
                soma_parcelas,
                2,
            ),
            "soma_saldos": round(
                soma_saldos,
                2,
            ),
            "margem_disponivel": (
                margem_disponivel
            ),
            "margem_negativa": (
                margem_negativa
            ),
            "parcela_viabilidade_minima": (
                parcela_viabilidade_minima
            ),
            "maior_parcela": round(
                maior_parcela,
                2,
            ),
            "regra_viabilidade_atendida": (
                regra_viabilidade_atendida
            ),
            "parcela_refin": (
                parcela_refin
            ),
            "valor_operacao_refin": (
                valor_operacao
            ),
            "regra_minimo_refin_atendida": (
                regra_minimo_refin
            ),
            "bruto_minimo": (
                cls.MIN_VALOR_OPERACAO
            ),
            "troco_minimo_exclusivo": (
                cls.TROCO_MINIMO
            ),
            "contratos": (
                contratos_normalizados
            ),
            "bloqueios": bloqueios,
            "avisos": avisos,
        }



# MOTOR_HELPERS_PORTABILIDADE_MULTIPLA_FACTA

def _motor_normalizar_texto(value):
    import unicodedata

    text = str(value or "").strip().upper()

    text = "".join(
        char
        for char in unicodedata.normalize(
            "NFD",
            text,
        )
        if unicodedata.category(char)
        != "Mn"
    )

    return " ".join(text.split())


def oferta_e_facta(oferta):
    if not isinstance(oferta, dict):
        return False

    banco = (
        oferta.get("banco")
        or oferta.get("bank")
        or oferta.get("banco_nome")
        or oferta.get("nome_banco")
        or ""
    )

    return (
        "FACTA"
        in _motor_normalizar_texto(
            banco
        )
    )


def _tabela_sort_key(tabela_nome: str):
    tokens = _re.split(r"(\d+)", str(tabela_nome or ""))
    return [int(t) if t.isdigit() else t.upper() for t in tokens if t]


def chave_oferta_facta(oferta):
    tabela = (
        oferta.get("tabela")
        or oferta.get("table_name")
        or oferta.get("nome_tabela")
        or oferta.get("tabela_nome")
        or ""
    )

    prazo_raw = (
        oferta.get("prazo")
        or oferta.get("term")
        or 0
    )

    try:
        prazo = int(
            float(prazo_raw or 0)
        )
    except (TypeError, ValueError):
        prazo = 0

    return (
        _motor_normalizar_texto(
            tabela
        ),
        prazo,
    )


def interseccionar_ofertas_facta(
    resultados_motor,
):
    """
    Retorna apenas tabelas FACTA existentes
    em TODOS os contratos selecionados.

    Nao recalcula nenhuma regra do motor.
    Apenas cruza os resultados ja aprovados
    pelo SimuladorService.
    """

    mapas = []

    for resultado in resultados_motor:

        ofertas = (
            resultado.get("ofertas")
            if isinstance(
                resultado,
                dict,
            )
            else []
        ) or []

        mapa = {}

        for oferta in ofertas:

            if not oferta_e_facta(
                oferta
            ):
                continue

            chave = chave_oferta_facta(
                oferta
            )

            if (
                not chave[0]
                or chave[1] <= 0
            ):
                continue

            if chave not in mapa:
                mapa[chave] = oferta

        mapas.append(mapa)

    if not mapas:
        return []

    if any(
        not mapa
        for mapa in mapas
    ):
        return []

    comuns = set(
        mapas[0].keys()
    )

    for mapa in mapas[1:]:
        comuns &= set(
            mapa.keys()
        )

    resultado = []

    for chave in sorted(
        comuns,
        key=lambda item: (
            -item[1],
            _tabela_sort_key(item[0]),
        ),
    ):
        variantes = [
            mapa[chave]
            for mapa in mapas
        ]

        def valor_liberado(
            oferta,
        ):
            try:
                return float(
                    oferta.get(
                        "valor_liberado",
                        oferta.get(
                            "troco",
                            0,
                        ),
                    )
                    or 0
                )
            except (
                TypeError,
                ValueError,
            ):
                return 0.0

        # Se houver alguma pequena diferenca
        # entre contextos de origem,
        # usamos o resultado mais conservador.
        escolhida = min(
            variantes,
            key=valor_liberado,
        )

        resultado.append(
            dict(escolhida)
        )

    return resultado

# ============================================================
# MULTIPLA_DAYCOVAL_BACKEND_V1
# ============================================================

class PortabilidadeMultiplaDaycovalService:
    """
    Regras estruturais da Multipla Daycoval.

    O Motor continua sendo a autoridade
    para as demais regras bancarias.
    """

    MIN_CONTRATOS = 2
    MAX_CONTRATOS = 3

    MIN_PARCELA_ORIGEM = 20.00
    MIN_PARCELAS_PAGAS = 6

    # O DAYCOVAL nao porta contratos originados no C6.
    # Mantemos a protecao estrutural aqui para a regra
    # existir mesmo se a configuracao dinamica falhar.
    C6_ORIGIN_CODES = {
        "336",
        "626",
    }

    @classmethod
    def _origin_bank_text(
        cls,
        contrato,
    ):
        return " ".join(
            str(
                contrato.get(key)
                or ""
            ).strip()
            for key in (
                "codigo",
                "banco",
            )
            if str(
                contrato.get(key)
                or ""
            ).strip()
        )

    @classmethod
    def _is_c6_origin(
        cls,
        contrato,
    ):
        words = (
            PortabilidadeMultiplaFactaService
            ._promotora_clean_words(
                cls._origin_bank_text(
                    contrato
                )
            )
        )

        if "C6" in words:
            return True

        return bool(
            cls.C6_ORIGIN_CODES
            .intersection(words)
        )

    @classmethod
    def validar_regras_origem(
        cls,
        contratos,
        origin_config=None,
        origin_blocklist=None,
        min_paid_installments=0,
    ):
        """
        Regras dinamicas do banco destino DAYCOVAL:
        - bancos de origem bloqueados;
        - minimo geral de parcelas pagas;
        - minimo especifico por banco de origem.

        A regra estrutural do C6 e aplicada em validar().
        """

        origin_config = (
            origin_config
            or []
        )

        origin_blocklist = (
            origin_blocklist
            or []
        )

        bloqueios = []

        minimum_global = max(
            cls.MIN_PARCELAS_PAGAS,
            cls._int(
                min_paid_installments
            ),
        )

        for index, contrato in enumerate(
            contratos or [],
            start=1,
        ):
            if cls._is_c6_origin(
                contrato
            ):
                continue

            banco = cls._origin_bank_text(
                contrato
            )

            pagas = cls.parcelas_pagas(
                contrato
            )

            specific_minimum = 0
            specific_bank = ""

            for rule in origin_config:
                if not isinstance(
                    rule,
                    dict,
                ):
                    continue

                rule_bank = str(
                    rule.get(
                        "origin_bank",
                        "",
                    )
                    or ""
                ).strip()

                if not (
                    PortabilidadeMultiplaFactaService
                    ._promotora_bank_matches(
                        banco,
                        rule_bank,
                    )
                ):
                    continue

                rule_minimum = cls._int(
                    rule.get(
                        "min_paid",
                        0,
                    )
                )

                if (
                    rule_minimum
                    > specific_minimum
                ):
                    specific_minimum = (
                        rule_minimum
                    )
                    specific_bank = (
                        rule_bank
                    )

            required = max(
                minimum_global,
                specific_minimum,
            )

            if pagas < required:
                bank_label = (
                    specific_bank
                    or str(
                        contrato.get(
                            "banco",
                            "",
                        )
                        or "Banco de origem"
                    ).strip()
                )

                bloqueios.append(
                    f"Contrato {index}: "
                    f"{bank_label} exige no minimo "
                    f"{required} parcelas pagas "
                    "para portabilidade DAYCOVAL. "
                    f"Contrato possui {pagas}."
                )
                continue

            for rule in origin_blocklist:
                if isinstance(
                    rule,
                    dict,
                ):
                    rule_bank = str(
                        rule.get(
                            "origin_bank",
                            "",
                        )
                        or ""
                    ).strip()
                else:
                    rule_bank = str(
                        rule
                        or ""
                    ).strip()

                if not (
                    PortabilidadeMultiplaFactaService
                    ._promotora_bank_matches(
                        banco,
                        rule_bank,
                    )
                ):
                    continue

                bloqueios.append(
                    f"Contrato {index}: "
                    "DAYCOVAL nao porta contratos "
                    "originados no banco "
                    f"{rule_bank}."
                )
                break

        return bloqueios

    @staticmethod
    def _money(value):
        try:
            return round(
                float(value or 0),
                2,
            )
        except (
            TypeError,
            ValueError,
        ):
            return 0.0

    @staticmethod
    def _int(value):
        try:
            return max(
                0,
                int(float(value or 0)),
            )
        except (
            TypeError,
            ValueError,
        ):
            return 0

    @staticmethod
    def normalizar_beneficio(value):
        raw = str(
            value or ""
        ).strip()

        digits = "".join(
            char
            for char in raw
            if char.isdigit()
        )

        return (
            digits
            or raw.upper()
        )

    @classmethod
    def parcelas_pagas(
        cls,
        contrato,
    ):
        explicit = contrato.get(
            "parcelas_pagas"
        )

        if explicit not in (
            None,
            "",
        ):
            return cls._int(
                explicit
            )

        prazo = cls._int(
            contrato.get(
                "prazo"
            )
        )

        restante = cls._int(
            contrato.get(
                "prazo_restante"
            )
        )

        return max(
            0,
            prazo - restante,
        )

    @classmethod
    def validar(
        cls,
        banco_destino,
        convenio,
        margem_disponivel,
        contratos,
        valor_operacao_refin=None,
    ):
        bloqueios = []
        avisos = []

        contratos = (
            contratos
            or []
        )

        destino = str(
            banco_destino
            or ""
        ).strip().upper()

        convenio_norm = str(
            convenio
            or ""
        ).strip().upper()

        if (
            "DAYCOVAL"
            not in destino
            and destino != "707"
        ):
            bloqueios.append(
                "Banco destino invalido para "
                "Portabilidade Multipla Daycoval."
            )

        if convenio_norm != "INSS":
            bloqueios.append(
                "A Portabilidade Multipla "
                "Daycoval esta disponivel "
                "para INSS."
            )

        quantidade = len(
            contratos
        )

        if (
            quantidade
            < cls.MIN_CONTRATOS
        ):
            bloqueios.append(
                "A Portabilidade Multipla "
                "Daycoval exige no minimo "
                "2 contratos."
            )

        if (
            quantidade
            > cls.MAX_CONTRATOS
        ):
            bloqueios.append(
                "A Portabilidade Multipla "
                "Daycoval permite no maximo "
                "3 contratos."
            )

        beneficios = set()

        soma_parcelas = 0.0
        soma_saldos = 0.0

        contratos_normalizados = []

        for index, contrato in enumerate(
            contratos,
            start=1,
        ):
            banco = str(
                contrato.get(
                    "banco",
                    "",
                )
                or ""
            ).strip()

            parcela = cls._money(
                contrato.get(
                    "parcela"
                )
            )

            saldo = cls._money(
                contrato.get(
                    "saldo_devedor"
                )
            )

            beneficio = (
                cls.normalizar_beneficio(
                    contrato.get(
                        "beneficio"
                    )
                )
            )

            prazo = cls._int(
                contrato.get(
                    "prazo"
                )
            )

            restante = cls._int(
                contrato.get(
                    "prazo_restante"
                )
            )

            pagas = (
                cls.parcelas_pagas(
                    contrato
                )
            )

            if not banco:
                bloqueios.append(
                    f"Contrato {index}: "
                    "banco de origem "
                    "nao informado."
                )

            if cls._is_c6_origin(
                contrato
            ):
                bloqueios.append(
                    f"Contrato {index}: "
                    "DAYCOVAL nao porta contratos "
                    "originados no Banco C6."
                )

            if not beneficio:
                bloqueios.append(
                    f"Contrato {index}: "
                    "beneficio/NB "
                    "nao informado."
                )
            else:
                beneficios.add(
                    beneficio
                )

            if (
                parcela
                < cls.MIN_PARCELA_ORIGEM
            ):
                bloqueios.append(
                    f"Contrato {index}: "
                    "parcela minima para "
                    "portabilidade Daycoval "
                    "e R$ 20,00."
                )

            if (
                pagas
                < cls.MIN_PARCELAS_PAGAS
            ):
                bloqueios.append(
                    f"Contrato {index}: "
                    "o Daycoval exige "
                    "no minimo 6 parcelas "
                    "pagas. Contrato possui "
                    f"{pagas}."
                )

            if saldo <= 0:
                bloqueios.append(
                    f"Contrato {index}: "
                    "saldo devedor invalido."
                )

            if prazo <= 0:
                bloqueios.append(
                    f"Contrato {index}: "
                    "prazo total invalido."
                )

            if restante <= 0:
                bloqueios.append(
                    f"Contrato {index}: "
                    "prazo restante invalido."
                )

            soma_parcelas += parcela
            soma_saldos += saldo

            contratos_normalizados.append(
                {
                    **contrato,
                    "beneficio":
                        beneficio,
                    "parcela":
                        parcela,
                    "saldo_devedor":
                        saldo,
                    "parcelas_pagas":
                        pagas,
                    "grupo_daycoval":
                        None,
                }
            )

        if len(beneficios) > 1:
            bloqueios.append(
                "Nao e permitido unificar "
                "contratos de beneficios/NB "
                "diferentes na Portabilidade "
                "Multipla Daycoval."
            )

        beneficio_operacao = (
            next(
                iter(beneficios)
            )
            if len(beneficios) == 1
            else None
        )

        margem_disponivel = (
            cls._money(
                margem_disponivel
            )
        )

        margem_negativa = round(
            max(
                0.0,
                -margem_disponivel,
            ),
            2,
        )

        # Daycoval NAO usa o +20 da FACTA.
        #
        # O Motor recebe soma_parcelas
        # e valor_margem_negativa
        # separadamente.
        parcela_refin = round(
            soma_parcelas
            - margem_negativa,
            2,
        )

        if (
            quantidade
            >= cls.MIN_CONTRATOS
            and parcela_refin <= 0
        ):
            bloqueios.append(
                "A parcela consolidada "
                "do Refin ficou zerada "
                "ou negativa."
            )

        return {
            "banco_destino":
                "DAYCOVAL",
            "convenio":
                "INSS",
            "elegivel_previo":
                len(bloqueios) == 0,
            "usa_grupos":
                False,
            "grupo_operacao":
                None,
            "beneficio_operacao":
                beneficio_operacao,
            "quantidade_contratos":
                quantidade,
            "minimo_contratos":
                cls.MIN_CONTRATOS,
            "limite_contratos":
                cls.MAX_CONTRATOS,
            "parcela_minima_origem":
                cls.MIN_PARCELA_ORIGEM,
            "parcelas_pagas_minimas":
                cls.MIN_PARCELAS_PAGAS,
            "soma_parcelas":
                round(
                    soma_parcelas,
                    2,
                ),
            "soma_saldos":
                round(
                    soma_saldos,
                    2,
                ),
            "margem_disponivel":
                margem_disponivel,
            "margem_negativa":
                margem_negativa,
            "parcela_refin":
                parcela_refin,
            "contratos":
                contratos_normalizados,
            "bloqueios":
                bloqueios,
            "avisos":
                avisos,
        }


def oferta_e_daycoval(
    oferta,
):
    if not isinstance(
        oferta,
        dict,
    ):
        return False

    valores = [
        oferta.get("banco"),
        oferta.get("bank"),
        oferta.get("bank_name"),
        oferta.get("nome_banco"),
        oferta.get("codigo_banco"),
        oferta.get("bank_code"),
    ]

    texto = " ".join(
        str(value or "")
        for value in valores
    ).upper()

    if "DAYCOVAL" in texto:
        return True

    return any(
        str(value or "").strip()
        == "707"
        for value in valores
    )


def chave_oferta_daycoval(
    oferta,
):
    tabela = (
        oferta.get("tabela")
        or oferta.get("table_name")
        or oferta.get("nome_tabela")
        or ""
    )

    prazo = (
        oferta.get("prazo")
        or oferta.get("term")
        or 0
    )

    try:
        prazo = int(
            float(
                prazo or 0
            )
        )
    except (
        TypeError,
        ValueError,
    ):
        prazo = 0

    return (
        str(tabela)
        .strip()
        .upper(),
        prazo,
    )


def interseccionar_ofertas_daycoval(
    resultados,
):
    mapas = []

    for resultado in (
        resultados
        or []
    ):
        mapa = {}

        for oferta in (
            resultado.get(
                "ofertas",
                [],
            )
            or []
        ):
            if not oferta_e_daycoval(
                oferta
            ):
                continue

            chave = (
                chave_oferta_daycoval(
                    oferta
                )
            )

            mapa[chave] = oferta

        if not mapa:
            return []

        mapas.append(
            mapa
        )

    if not mapas:
        return []

    comuns = set(
        mapas[0].keys()
    )

    for mapa in mapas[1:]:
        comuns &= set(
            mapa.keys()
        )

    resultado = []

    for chave in sorted(
        comuns,
        key=lambda item: (
            -item[1],
            _tabela_sort_key(item[0]),
        ),
    ):
        variantes = [
            mapa[chave]
            for mapa in mapas
        ]

        def valor_liberado(
            oferta,
        ):
            try:
                return float(
                    oferta.get(
                        "valor_liberado",
                        oferta.get(
                            "troco",
                            0,
                        ),
                    )
                    or 0
                )
            except (
                TypeError,
                ValueError,
            ):
                return 0.0

        # Mantem resultado conservador
        # entre os contextos de origem.
        escolhida = min(
            variantes,
            key=valor_liberado,
        )

        resultado.append(
            dict(escolhida)
        )

    return resultado

# ============================================================
# MULTIPLA_QUERO_MAIS_BACKEND_V1
# ============================================================

class PortabilidadeMultiplaQueroMaisService(
    PortabilidadeMultiplaDaycovalService
):
    """
    Regras estruturais da Portabilidade Multipla QUERO+ CREDITO.

    Replica o desenho da Multipla Daycoval: 2 a 3 contratos do
    mesmo beneficio/NB, sem grupos A/B/C. Bancos de origem,
    quantidade minima de parcelas pagas, idade, especie, tabelas,
    coeficientes e demais regras continuam sob autoridade das
    regras cadastradas e do Motor existente.
    """

    MIN_CONTRATOS = 2
    MAX_CONTRATOS = 3
    MIN_PARCELA_ORIGEM = 20.00

    # QUERO+ nao possui minimo estrutural fixo de parcelas pagas.
    # O minimo vem das regras gerais/especificas e das tabelas
    # cadastradas para o banco destino.
    MIN_PARCELAS_PAGAS = 0

    @classmethod
    def _is_c6_origin(cls, contrato):
        # Nao hardcodar bancos de origem no QUERO+.
        # A lista de bancos nao portados vem da configuracao
        # excluded_origin_banks/origin_bank_blocklist.
        return False

    @staticmethod
    def _quero_text(value):
        return (
            str(value)
            .replace("DAYCOVAL", "QUERO+ CREDITO")
            .replace("Daycoval", "QUERO+ CREDITO")
            .replace("daycoval", "QUERO+ CREDITO")
        )

    @classmethod
    def validar_regras_origem(
        cls,
        contratos,
        origin_config=None,
        origin_blocklist=None,
        min_paid_installments=0,
    ):
        bloqueios = super().validar_regras_origem(
            contratos=contratos,
            origin_config=origin_config,
            origin_blocklist=origin_blocklist,
            min_paid_installments=min_paid_installments,
        )

        return [
            cls._quero_text(item)
            for item in bloqueios
        ]

    @classmethod
    def validar(
        cls,
        banco_destino,
        convenio,
        margem_disponivel,
        contratos,
        valor_operacao_refin=None,
    ):
        # Reutiliza o mesmo consolidado financeiro da Multipla
        # Daycoval, mas com constantes/validacoes da subclasse.
        result = super().validar(
            banco_destino="DAYCOVAL",
            convenio=convenio,
            margem_disponivel=margem_disponivel,
            contratos=contratos,
            valor_operacao_refin=valor_operacao_refin,
        )

        result["banco_destino"] = "QUERO+ CREDITO"
        result["bloqueios"] = [
            cls._quero_text(item)
            for item in result.get("bloqueios", [])
        ]
        result["avisos"] = [
            cls._quero_text(item)
            for item in result.get("avisos", [])
        ]

        return result


def _quero_mais_norm(value):
    import unicodedata

    text = str(value or "").strip().upper()
    text = "".join(
        char
        for char in unicodedata.normalize("NFD", text)
        if unicodedata.category(char) != "Mn"
    )
    text = text.replace("+", " MAIS ")
    return " ".join(text.split())


def oferta_e_quero_mais(oferta):
    if not isinstance(oferta, dict):
        return False

    valores = [
        oferta.get("banco"),
        oferta.get("bank"),
        oferta.get("bank_name"),
        oferta.get("nome_banco"),
    ]

    texto = " ".join(
        _quero_mais_norm(value)
        for value in valores
        if value is not None
    )

    compacto = texto.replace(" ", "")

    return (
        "QUERO MAIS CREDITO" in texto
        or compacto == "QUEROMAIS"
        or compacto.startswith("QUEROMAISCREDITO")
    )


def chave_oferta_quero_mais(oferta):
    tabela = (
        oferta.get("tabela")
        or oferta.get("table_name")
        or oferta.get("nome_tabela")
        or ""
    )

    prazo = (
        oferta.get("prazo")
        or oferta.get("term")
        or 0
    )

    try:
        prazo = int(float(prazo or 0))
    except (TypeError, ValueError):
        prazo = 0

    return (
        str(tabela).strip().upper(),
        prazo,
    )


def interseccionar_ofertas_quero_mais(resultados):
    """
    Intersecciona somente tabelas/prazos presentes em todos os
    contratos e PRESERVA a ordem comercial do primeiro retorno do
    Motor. Nao reordena por troco, taxa, prazo ou nome da tabela.
    """

    mapas = []
    primeira_ordem = []

    for indice_resultado, resultado in enumerate(resultados or []):
        mapa = {}

        for oferta in (resultado.get("ofertas", []) or []):
            if not oferta_e_quero_mais(oferta):
                continue

            chave = chave_oferta_quero_mais(oferta)

            if chave not in mapa:
                mapa[chave] = oferta

            if indice_resultado == 0 and chave not in primeira_ordem:
                primeira_ordem.append(chave)

        if not mapa:
            return []

        mapas.append(mapa)

    if not mapas:
        return []

    comuns = set(mapas[0].keys())
    for mapa in mapas[1:]:
        comuns &= set(mapa.keys())

    resultado = []

    for chave in primeira_ordem:
        if chave not in comuns:
            continue

        variantes = [
            mapa[chave]
            for mapa in mapas
        ]

        def valor_liberado(oferta):
            try:
                return float(
                    oferta.get(
                        "valor_liberado",
                        oferta.get("troco", 0),
                    )
                    or 0
                )
            except (TypeError, ValueError):
                return 0.0

        escolhida = min(
            variantes,
            key=valor_liberado,
        )

        resultado.append(dict(escolhida))

    return resultado
