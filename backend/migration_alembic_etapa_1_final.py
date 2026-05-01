"""Add promotora features and user visibility with SQLite compatibility

Revision ID: 1234567890cd
Revises: 
Create Date: 2026-03-23 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1234567890cd'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # 1. Adicionar na tabela users: avatar_url e dark_mode
    # Usando batch_alter_table para garantir compatibilidade estrutural no SQLite
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('avatar_url', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('dark_mode', sa.Boolean(), server_default='0', nullable=True))

    # 2. Criar tabela promotora_rules
    op.create_table('promotora_rules',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('promotora_id', sa.Integer(), nullable=False),
    sa.Column('rule_key', sa.String(length=50), nullable=False),
    sa.Column('rule_value', sa.String(length=255), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['promotora_id'], ['users.id'], ondelete="CASCADE"),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_promotora_rules_id'), 'promotora_rules', ['id'], unique=False)

    # 3. Criar tabela user_bank_visibility
    op.create_table('user_bank_visibility',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('bank_name', sa.String(length=100), nullable=False),
    sa.Column('is_visible', sa.Boolean(), server_default='1', nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete="CASCADE"),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_bank_visibility_id'), 'user_bank_visibility', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_user_bank_visibility_id'), table_name='user_bank_visibility')
    op.drop_table('user_bank_visibility')
    
    op.drop_index(op.f('ix_promotora_rules_id'), table_name='promotora_rules')
    op.drop_table('promotora_rules')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('dark_mode')
        batch_op.drop_column('avatar_url')
