from __future__ import annotations

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
    MIN_PARCELA_REFIN = 50.00
    MIN_VALOR_OPERACAO = 3000.00
    ADICIONAL_VIABILIDADE = 20.00

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

    GRUPO_C = {
        "QI SOCIEDADE",
        "BANCO ORIGINAL",
        "BANCO INTER",
        "BANCO MULTIPLO",
        "BRB",
        "DIGIO",
    }

    BANK_ALIASES = {
        "BANRISUL": "BANRISUL",
        "BMG": "BMG",
        "COMPE": "COMPE",
        "DAYCOVAL": "DAYCOVAL",
        "ITAU": "ITAU",
        "ITAÚ": "ITAU",
        "CAIXA ECONOMICA FEDERAL": "CAIXA",
        "CAIXA ECONOMICA": "CAIXA",
        "CAIXA": "CAIXA",
        "BRADESCO": "BRADESCO",
        "SANTANDER": "SANTANDER",
        "AGIBANK": "AGIBANK",
        "BANCO PAN": "PAN",
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
    ) -> Optional[str]:
        banco_normalizado = cls.normalizar_banco(
            banco
        )

        if banco_normalizado in cls.GRUPO_A:
            return "A"

        if banco_normalizado in cls.GRUPO_B:
            return "B"

        if banco_normalizado in cls.GRUPO_C:
            return "C"

        return None

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

            parcelas_raw = contrato.get(
                "parcelas_pagas"
            )

            if parcelas_raw in (None, ""):
                prazo = cls._promotora_int(
                    contrato.get("prazo")
                )

                prazo_restante = cls._promotora_int(
                    contrato.get("prazo_restante")
                )

                parcelas_pagas = max(
                    0,
                    prazo - prazo_restante,
                )
            else:
                parcelas_pagas = cls._promotora_int(
                    parcelas_raw
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
                banco_original
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

            if grupo is None:
                bloqueios.append(
                    f"Contrato {index}: banco "
                    f"'{banco_original}' nao pertence "
                    "aos grupos permitidos da "
                    "Portabilidade Multipla FACTA."
                )

            elif grupo == "C":
                bloqueios.append(
                    f"Contrato {index}: banco "
                    f"{banco} pertence ao Grupo C "
                    "e nao pode ser unificado."
                )

            else:
                grupos_ativos.add(grupo)

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
                    "beneficio": beneficio,
                    "parcela": parcela,
                    "saldo_devedor": saldo,
                    "selecionavel": grupo in {
                        "A",
                        "B",
                    },
                }
            )

        if len(grupos_ativos) > 1:
            bloqueios.append(
                "Contratos dos Grupos A e B nao "
                "podem ser unificados na mesma "
                "operacao."
            )

        if len(beneficios_ativos) > 1:
            bloqueios.append(
                "Nao e permitido unificar contratos "
                "de beneficios diferentes na "
                "Portabilidade Multipla FACTA."
            )

        beneficio_operacao = (
            next(iter(beneficios_ativos))
            if len(beneficios_ativos) == 1
            else None
        )

        grupo_operacao = (
            next(iter(grupos_ativos))
            if len(grupos_ativos) == 1
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

        # MULTIPLA_REFIN_FINAL_PLUS_20
        # Regra FACTA:
        # soma das parcelas
        # - margem negativa
        # + R$ 20,00.
        parcela_refin = round(
            soma_parcelas
            - margem_negativa
            + cls.ADICIONAL_VIABILIDADE,
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

        regra_minimo_refin = None

        if valor_operacao is not None:
            regra_minimo_refin = bool(
                parcela_refin
                >= cls.MIN_PARCELA_REFIN
                or valor_operacao
                >= cls.MIN_VALOR_OPERACAO
            )

            if not regra_minimo_refin:
                bloqueios.append(
                    "O Refin deve possuir parcela "
                    "minima de R$ 50,00 OU valor "
                    "da operacao igual ou superior "
                    "a R$ 3.000,00."
                )

        elif (
            parcela_refin
            < cls.MIN_PARCELA_REFIN
        ):
            avisos.append(
                "Parcela Refin abaixo de R$ 50,00. "
                "A operacao somente podera seguir "
                "se o valor calculado do Refin for "
                "igual ou superior a R$ 3.000,00."
            )

        return {
            "banco_destino": "FACTA",
            "convenio": "INSS",
            "elegivel_previo": (
                len(bloqueios) == 0
            ),
            "grupo_operacao": grupo_operacao,
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
            item[1],
            item[0],
        ),
        reverse=True,
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
