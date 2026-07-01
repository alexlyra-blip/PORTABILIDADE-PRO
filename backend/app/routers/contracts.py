from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.database import get_db
from app.models.sqlalchemy_models import Contract, User
from app.schemas.contract_schema import ContractCreate, ContractUpdate, ContractResponse
from .deps import get_current_user

router = APIRouter(prefix="/contracts", tags=["contracts"])

@router.post("", response_model=ContractResponse)
async def create_contract(
    contract_in: ContractCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_contract = Contract(**contract_in.dict())
    new_contract.user_id = current_user.id
    if not new_contract.broker_id:
        new_contract.broker_id = current_user.broker_id
    db.add(new_contract)
    await db.commit()
    await db.refresh(new_contract)
    return new_contract

@router.get("")
async def get_contracts(
    skip: int = 0,
    limit: int = 1000,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Contract).order_by(Contract.id.desc())
    if current_user.role == "admin":
        pass
    elif current_user.role == "promotora":
        query = query.where((Contract.user_id == current_user.id) | (Contract.broker_id == current_user.id))
    else:
        query = query.where(Contract.user_id == current_user.id)
    
    # Total count query
    from sqlalchemy import func
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    # Paginated results
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    contracts = result.scalars().all()
    
    return {"data": contracts, "total": total}

@router.get("/stats")
async def get_contracts_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Contract)
    if current_user.role == "admin":
        pass
    elif current_user.role == "promotora":
        query = query.where((Contract.user_id == current_user.id) | (Contract.broker_id == current_user.id))
    else:
        query = query.where(Contract.user_id == current_user.id)
        
    result = await db.execute(query)
    contracts = result.scalars().all()
    
    # Temporarily we will return the contracts and let the frontend do the dashboard processing.
    # To fully optimize, we can calculate stats right here using SQL.
    # But since the frontend expects the full list for now to calculate `processChartData`, 
    # we can just return all for stats. This separates the Dashboard from the Table.
    return contracts

@router.patch("/{contract_id}", response_model=ContractResponse)
async def update_contract(
    contract_id: str,
    contract_update: ContractUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    update_data = contract_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(contract, key, value)
        
    await db.commit()
    await db.refresh(contract)
    return contract

@router.delete("/{contract_id}")
async def delete_contract(
    contract_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    await db.delete(contract)
    await db.commit()
    return {"message": "Contract deleted successfully"}
