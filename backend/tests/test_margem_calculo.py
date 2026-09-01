import pytest

from unittest.mock import (
    AsyncMock,
    MagicMock,
    patch,
)

from app.services.margem_service import (
    calcular_valor_liberado_margem,
)

from app.services.consultas.promosys_provider import (
    PromosysProvider,
)


@pytest.mark.asyncio
async def test_margem_calculo():
    """
    Valida:

    1. Conversao da margem livre em valor liberado.
    2. Normalizacao Promosys com a regra INSS atual:

       35% emprestimos
        5% RMC
        5% RCC
       45% total
    """

    # ========================================================
    # 1 - HELPER DE VALOR LIBERADO
    # ========================================================

    margem_livre = 55.99
    esperado = 2466.52

    mock_session = AsyncMock()

    mock_session.__aenter__.return_value = (
        mock_session
    )

    mock_result = MagicMock()

    # Nenhum coeficiente especifico encontrado.
    # O helper utiliza o fallback atual.
    mock_result.scalars.return_value.first.return_value = (
        None
    )

    mock_session.execute.return_value = (
        mock_result
    )

    with patch(
        "app.services.margem_service."
        "AsyncSessionLocal",
        return_value=mock_session,
    ):

        calculado = (
            await calcular_valor_liberado_margem(
                margem_livre
            )
        )

    assert abs(
        calculado - esperado
    ) < 0.1

    # ========================================================
    # 2 - PROMOSYS / REGRA 35 + 5 + 5
    # ========================================================

    provider = PromosysProvider()

    raw_mock = {
        "MR": "1000.00",

        "BENEFICIO": {
            "TotalComprometido":
                "100.00",

            "ValorRMC":
                "0.00",

            "ValorRCC":
                "0.00",
        },

        # A regra central calcula a margem livre
        # a partir dos emprestimos ativos.
        #
        # Renda R$ 1.000:
        #
        # 35% emprestimo = R$ 350
        # parcela ativa  = R$ 100
        # margem livre   = R$ 250
        #
        # RMC = R$ 50
        # RCC = R$ 50
        # Total = R$ 450
        "CONTRATO": [
            {
                "Tipo_Emprestimo": 98,
                "Banco_Nome":
                    "BANCO TESTE",
                "Banco":
                    "999",
                "Contrato":
                    "TESTE-001",
                "Vl_Parcela":
                    "100.00",
                "Prazo":
                    "84",
                "ParcPagas":
                    "12",
                "Situacao":
                    "Ativo",
                "TaxaJuros":
                    "1.50",
            },
        ],
    }

    result = await provider._normalize_response(
        raw_mock,
        "12345678909",
    )

    margens = result["margens"]

    assert (
        margens[
            "margem_emprestimo"
        ]
        == 350.00
    )

    assert (
        margens[
            "margem_total_consignavel"
        ]
        == 450.00
    )

    assert (
        margens[
            "margem_livre"
        ]
        == 250.00
    )

    assert (
        margens[
            "margem_rmc"
        ]
        == 50.00
    )

    assert (
        margens[
            "margem_rcc"
        ]
        == 50.00
    )

    assert (
        margens[
            "rmc_utilizado"
        ]
        == 0.00
    )

    assert (
        margens[
            "rcc_utilizado"
        ]
        == 0.00
    )

    assert (
        margens[
            "rmc_disponivel"
        ]
        == 50.00
    )

    assert (
        margens[
            "rcc_disponivel"
        ]
        == 50.00
    )

    assert (
        margens[
            "total_comprometido"
        ]
        == 100.00
    )

    assert (
        len(
            result[
                "emprestimos"
            ]
        )
        == 1
    )

    print(
        "OK: Promosys = "
        "35% emprestimo + 5% RMC + 5% RCC"
    )
