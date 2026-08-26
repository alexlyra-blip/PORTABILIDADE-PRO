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

        parcela_refin = round(
            soma_parcelas - margem_negativa,
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
