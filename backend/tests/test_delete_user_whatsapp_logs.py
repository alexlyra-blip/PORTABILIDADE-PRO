"""Regressao: exclusao de usuario com historico da Clara."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from app.services import admin_service


@pytest.mark.asyncio
async def test_delete_user_detaches_chat_logs_before_deletion(monkeypatch):
    user = SimpleNamespace(id=80, role="corretor")
    manager = SimpleNamespace(id=1, role="admin")
    db = SimpleNamespace(
        execute=AsyncMock(),
        delete=AsyncMock(),
        commit=AsyncMock(),
        rollback=AsyncMock(),
    )
    result = MagicMock()
    result.scalar_one_or_none.return_value = user
    db.execute.side_effect = [result, MagicMock()]
    monkeypatch.setattr(admin_service, "can_delete_managed_user", lambda *_: True)

    deleted = await admin_service.AdminService.delete_user(db, 80, manager)

    assert deleted is True
    assert db.execute.await_count == 2
    statement = db.execute.await_args_list[1].args[0]
    assert "whatsapp_chat_logs" in str(statement)
    assert "user_id" in str(statement)
    db.delete.assert_awaited_once_with(user)
    db.commit.assert_awaited_once()
    db.rollback.assert_not_awaited()


@pytest.mark.asyncio
async def test_delete_user_rolls_back_on_remaining_foreign_key(monkeypatch):
    user = SimpleNamespace(id=80, role="corretor")
    manager = SimpleNamespace(id=1, role="admin")
    db = SimpleNamespace(
        execute=AsyncMock(),
        delete=AsyncMock(),
        commit=AsyncMock(),
        rollback=AsyncMock(),
    )
    result = MagicMock()
    result.scalar_one_or_none.return_value = user
    db.execute.side_effect = [result, MagicMock()]
    db.commit.side_effect = IntegrityError("DELETE users", {}, Exception("foreign key"))
    monkeypatch.setattr(admin_service, "can_delete_managed_user", lambda *_: True)

    with pytest.raises(HTTPException) as exc:
        await admin_service.AdminService.delete_user(db, 80, manager)

    assert exc.value.status_code == 409
    assert "registros vinculados" in exc.value.detail
    db.rollback.assert_awaited_once()
