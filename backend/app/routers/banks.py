from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

@router.get("/")
def get_banks():
    return [
        {"id": 1, "name": "Banco Inbursa", "active": True},
        {"id": 2, "name": "Banco Pan", "active": True},
        {"id": 3, "name": "Banco Daycoval", "active": True},
        {"id": 4, "name": "Banco C6", "active": True},
        {"id": 5, "name": "Banco Itaú", "active": True},
        {"id": 6, "name": "Facta", "active": True},
        {"id": 7, "name": "Banco Master", "active": True}
    ]
