from unittest import IsolatedAsyncioTestCase

from app.utils.config_helper import (
    get_active_provider,
    normalize_provider,
    set_active_provider,
)


class FakeResult:
    def __init__(self, setting):
        self.setting = setting

    def scalar_one_or_none(self):
        return self.setting


class FakeSession:
    def __init__(self, setting=None):
        self.setting = setting
        self.committed = False
        self.refreshed = False

    async def execute(self, statement):
        return FakeResult(self.setting)

    def add(self, setting):
        self.setting = setting

    async def commit(self):
        self.committed = True

    async def refresh(self, setting):
        self.refreshed = True


class ProviderConfigTests(IsolatedAsyncioTestCase):
    async def test_sem_configuracao_retorna_none(self):
        session = FakeSession()

        provider = await get_active_provider(session)

        self.assertIsNone(provider)

    async def test_salva_multicorban(self):
        session = FakeSession()

        provider = await set_active_provider(
            session,
            "MultiCorban",
        )

        self.assertEqual(provider, "multicorban")
        self.assertEqual(
            session.setting.setting_value,
            "multicorban",
        )
        self.assertTrue(session.committed)
        self.assertTrue(session.refreshed)

    async def test_atualiza_configuracao_existente(self):
        class ExistingSetting:
            setting_value = "promosys"

        session = FakeSession(ExistingSetting())

        provider = await set_active_provider(
            session,
            "multicorban",
        )

        self.assertEqual(provider, "multicorban")
        self.assertEqual(
            session.setting.setting_value,
            "multicorban",
        )

    def test_rejeita_provider_invalido(self):
        with self.assertRaises(ValueError):
            normalize_provider("automatico")
