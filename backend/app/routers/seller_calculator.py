from decimal import Decimal

from typing import (
    Any,
    Dict,
    Literal,
)

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from pydantic import (
    BaseModel,
    Field,
)

from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.database import get_db

from app.services.payment_fee_config_service import (
    PaymentFeeConfigService,
)

from app.services.seller_fee_simulator_service import (
    SellerFeeSimulatorService,
)


router = APIRouter()


class SellerSimulationRequest(BaseModel):
    amount: Decimal = Field(
        gt=0,
        le=1000000,
        decimal_places=2,
    )

    commission_table: int = Field(
        ge=1,
        le=3,
    )

    installments: int = Field(
        ge=1,
        le=18,
    )

    channel: str = Field(
        default="checkout",
        min_length=2,
        max_length=30,
    )

    simulation_type: Literal[
        "receive",
        "charge",
    ] = "receive"


@router.post("/simulate")
async def simulate_seller_payment(
    data: SellerSimulationRequest,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    try:
        config_result = await (
            PaymentFeeConfigService
            .get_config(db)
        )

        return (
            SellerFeeSimulatorService
            .simulate(
                amount=data.amount,
                commission_table=(
                    data.commission_table
                ),
                installments=(
                    data.installments
                ),
                channel=data.channel,
                fee_config=(
                    config_result["fees"]
                ),
                simulation_type=(
                    data.simulation_type
                ),
            )
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc


class SellerSimulationGridRequest(BaseModel):
    amount: Decimal = Field(
        gt=0,
        le=1000000,
        decimal_places=2,
    )


@router.post("/simulate-grid")
async def simulate_seller_payment_grid(
    data: SellerSimulationGridRequest,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    try:
        config_result = await (
            PaymentFeeConfigService
            .get_config(db)
        )

        return (
            SellerFeeSimulatorService
            .simulate_grid(
                amount=data.amount,
                fee_config=(
                    config_result["fees"]
                ),
            )
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc
