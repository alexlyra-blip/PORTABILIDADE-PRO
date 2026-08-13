from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class BankCredentialUpsertRequest(BaseModel):
    provider: str = Field(..., min_length=1, max_length=50)
    login: Optional[str] = Field(default=None, max_length=500)
    password: Optional[str] = Field(default=None, max_length=1000)
    extra_credentials: Optional[Dict[str, Any]] = None
    is_active: bool = True


class BankCredentialResponse(BaseModel):
    id: Optional[int] = None
    provider: str
    configured: bool
    has_login: bool
    has_password: bool
    has_extra_credentials: bool
    is_active: bool
    last_test_status: Optional[str] = None
    last_tested_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None