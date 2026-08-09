"""
Utilitários para scripts administrativos do Portabilidade PRO.

Nunca mantenha credenciais de banco hardcoded neste arquivo.
As credenciais devem vir exclusivamente de DATABASE_URL
ou DATABASE_URI.
"""

import os
from urllib.parse import (
    parse_qsl,
    urlencode,
    urlsplit,
    urlunsplit,
)


def get_database_url(
    *,
    async_driver: bool,
) -> str:
    url = (
        os.getenv("DATABASE_URL")
        or os.getenv("DATABASE_URI")
        or ""
    ).strip()

    if not url:
        raise RuntimeError(
            "DATABASE_URL ou DATABASE_URI "
            "não configurada no ambiente."
        )

    if async_driver:
        if url.startswith("postgres://"):
            url = url.replace(
                "postgres://",
                "postgresql+asyncpg://",
                1,
            )
        elif url.startswith("postgresql://"):
            url = url.replace(
                "postgresql://",
                "postgresql+asyncpg://",
                1,
            )

        return url

    # psycopg2 não utiliza o prefixo +asyncpg.
    if url.startswith("postgresql+asyncpg://"):
        url = url.replace(
            "postgresql+asyncpg://",
            "postgresql://",
            1,
        )
    elif url.startswith("postgres://"):
        url = url.replace(
            "postgres://",
            "postgresql://",
            1,
        )

    # Remove parâmetros específicos de asyncpg que
    # poderiam causar erro quando utilizados pelo psycopg2.
    parsed = urlsplit(url)

    query = [
        (key, value)
        for key, value in parse_qsl(
            parsed.query,
            keep_blank_values=True,
        )
        if key not in {
            "prepared_statement_cache_size",
            "statement_cache_size",
        }
    ]

    return urlunsplit(
        (
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            urlencode(query),
            parsed.fragment,
        )
    )
