import os
import sqlite3

import psycopg2


INDEX_NAME = "uq_daily_margin_bank_date_convenio"


def migrate_sqlite(db_path: str = "local_db.sqlite") -> None:
    if not os.path.exists(db_path):
        print(f"[SQLITE] {db_path} não encontrado. Migração ignorada.")
        return

    connection = sqlite3.connect(db_path)

    try:
        cursor = connection.cursor()

        columns = {
            row[1]
            for row in cursor.execute(
                "PRAGMA table_info(daily_margin_coefficients)"
            ).fetchall()
        }

        if not columns:
            print("[SQLITE] Tabela de coeficientes não encontrada.")
            return

        if "convenio" not in columns:
            cursor.execute(
                """
                ALTER TABLE daily_margin_coefficients
                ADD COLUMN convenio TEXT NOT NULL DEFAULT 'INSS'
                """
            )

        cursor.execute(
            """
            UPDATE daily_margin_coefficients
            SET convenio = UPPER(TRIM(COALESCE(convenio, 'INSS')))
            """
        )

        cursor.execute(
            """
            UPDATE daily_margin_coefficients
            SET convenio = 'INSS'
            WHERE convenio = ''
            """
        )

        cursor.execute(
            """
            DELETE FROM daily_margin_coefficients
            WHERE id NOT IN (
                SELECT MAX(id)
                FROM daily_margin_coefficients
                GROUP BY bank_id, date, convenio
            )
            """
        )

        cursor.execute(
            f"""
            CREATE UNIQUE INDEX IF NOT EXISTS {INDEX_NAME}
            ON daily_margin_coefficients (
                bank_id,
                date,
                convenio
            )
            """
        )

        connection.commit()
        print("[SQLITE] Migração concluída.")
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def normalize_postgres_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return url.replace(
            "postgresql+asyncpg://",
            "postgresql://",
            1,
        )

    return url


def migrate_postgres(database_url: str) -> None:
    connection = psycopg2.connect(
        normalize_postgres_url(database_url),
        connect_timeout=20,
    )

    try:
        connection.autocommit = False
        cursor = connection.cursor()

        cursor.execute(
            """
            ALTER TABLE public.daily_margin_coefficients
            ADD COLUMN IF NOT EXISTS convenio VARCHAR(20)
            """
        )

        cursor.execute(
            """
            UPDATE public.daily_margin_coefficients
            SET convenio = UPPER(
                BTRIM(COALESCE(convenio, 'INSS'))
            )
            """
        )

        cursor.execute(
            """
            UPDATE public.daily_margin_coefficients
            SET convenio = 'INSS'
            WHERE convenio = ''
            """
        )

        cursor.execute(
            """
            DELETE FROM public.daily_margin_coefficients AS older
            USING public.daily_margin_coefficients AS newer
            WHERE older.bank_id = newer.bank_id
              AND older.date = newer.date
              AND older.convenio = newer.convenio
              AND older.id < newer.id
            """
        )

        cursor.execute(
            """
            ALTER TABLE public.daily_margin_coefficients
            ALTER COLUMN convenio SET DEFAULT 'INSS'
            """
        )

        cursor.execute(
            """
            ALTER TABLE public.daily_margin_coefficients
            ALTER COLUMN convenio SET NOT NULL
            """
        )

        cursor.execute(
            f"""
            CREATE UNIQUE INDEX IF NOT EXISTS {INDEX_NAME}
            ON public.daily_margin_coefficients (
                bank_id,
                date,
                convenio
            )
            """
        )

        connection.commit()
        print("[POSTGRES] Migração concluída.")
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def main() -> None:
    migrate_sqlite()

    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        print(
            "[POSTGRES] DATABASE_URL não configurada. "
            "Migração PostgreSQL ignorada."
        )
        return

    migrate_postgres(database_url)


if __name__ == "__main__":
    main()
