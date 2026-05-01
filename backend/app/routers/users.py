from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

@router.get("/")
def get_users():
    return [
        {"id": 1, "name": "Admin Geral", "role": "admin"},
        {"id": 2, "name": "João Corretor", "role": "corretor"}
    ]
