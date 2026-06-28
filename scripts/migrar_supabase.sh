#!/bin/bash
echo "=== Script de Migração: Supabase para PostgreSQL Local ==="
echo "Este script fará o backup dos dados do Supabase e irá restaurar no seu banco local."

read -p "Digite a sua DATABASE_URL do Supabase (A url que começa com postgresql://...): " SUPABASE_URL

if [ -z "$SUPABASE_URL" ]; then
    echo "Erro: A URL do banco não pode ser vazia."
    exit 1
fi

# Converte postgresql+asyncpg para postgresql puro para o pg_dump funcionar
SUPABASE_URL="${SUPABASE_URL/postgresql+asyncpg/postgresql}"

echo "Iniciando o dump do banco de dados (isso pode levar alguns minutos)..."
pg_dump --clean --if-exists --no-owner --no-privileges -Fc "$SUPABASE_URL" -f supabase_backup.dump

if [ $? -ne 0 ]; then
    echo "Erro ao extrair os dados do Supabase. Verifique sua URL e senha."
    exit 1
fi

echo "Backup concluído! Iniciando a restauração no banco de dados local da VPS..."

DB_CONTAINER=$(docker compose ps -q db)

if [ -z "$DB_CONTAINER" ]; then
    echo "Aviso: Container 'db' não encontrado com 'docker compose'."
    DB_CONTAINER=$(docker-compose ps -q db)
fi

if [ -z "$DB_CONTAINER" ]; then
    echo "Erro: Container 'db' não encontrado. Certifique-se de que o sistema está rodando (docker compose up -d)."
    exit 1
fi

echo "Copiando arquivo para o container..."
docker cp supabase_backup.dump $DB_CONTAINER:/tmp/supabase_backup.dump

echo "Restaurando o banco de dados..."
docker exec -it $DB_CONTAINER pg_restore --clean --if-exists --no-owner --no-privileges -d postgres -U postgres /tmp/supabase_backup.dump

echo "Limpando arquivos temporários..."
rm supabase_backup.dump
docker exec $DB_CONTAINER rm /tmp/supabase_backup.dump

echo "==============================================================="
echo "🎉 Migração finalizada com sucesso!"
echo "Os dados do Supabase foram transferidos para o banco local."
echo ""
echo "PASSO FINAL: Abra o arquivo .env da sua VPS e certifique-se de que a DATABASE_URL está assim:"
echo "DATABASE_URL=postgresql+asyncpg://postgres:mudar_senha_em_producao@db:5432/postgres"
echo ""
echo "Depois disso, reinicie o sistema com: docker compose down && docker compose up -d"
echo "==============================================================="
