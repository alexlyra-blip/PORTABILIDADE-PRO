from decimal import Decimal
from typing import Any, Dict

from fastapi import (
    APIRouter,
    HTTPException,
)
from pydantic import BaseModel, Field

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
        le=12,
    )


@router.post("/simulate")
async def simulate_seller_payment(
    data: SellerSimulationRequest,
) -> Dict[str, Any]:
    try:
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
            )
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc
