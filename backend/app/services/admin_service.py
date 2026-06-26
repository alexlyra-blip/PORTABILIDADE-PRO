import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from app.models.sqlalchemy_models import Bank, BankRule, BankTable, Coefficient, User, Company, Simulation, SimulationResult, UserBankVisibility, PromotoraRule
from app.schemas.simulacao_schema import BankCreate, BankRuleCreate, BankTableCreate, CoefficientCreate, CompanyCreate
from app.services import auth_service
from datetime import datetime, timedelta

class AdminService:
    @staticmethod
    async def get_all_banks(db: AsyncSession):
        result = await db.execute(select(Bank).options(selectinload(Bank.rules)).order_by(Bank.priority.asc(), Bank.name.asc()))
        return result.scalars().all()

    @staticmethod
    async def create_bank(db: AsyncSession, bank: BankCreate):
        # Verifica se já existe um banco com este nome
        result = await db.execute(select(Bank).where(Bank.name == bank.name))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"O banco '{bank.name}' já está cadastrado no sistema.")
            
        db_bank = Bank(**bank.dict())
        db.add(db_bank)
        await db.commit()
        await db.refresh(db_bank)
        return db_bank

    @staticmethod
    async def update_bank(db: AsyncSession, bank_id: int, bank_data: dict):
        result = await db.execute(select(Bank).where(Bank.id == bank_id))
        db_bank = result.scalar_one_or_none()
        
        if db_bank:
            # Se estiver tentando mudar o nome, verifica se o novo nome já pertence a OUTRO banco
            if 'name' in bank_data and bank_data['name'] != db_bank.name:
                check_res = await db.execute(select(Bank).where(Bank.name == bank_data['name'], Bank.id != bank_id))
                if check_res.scalar_one_or_none():
                    raise HTTPException(status_code=400, detail=f"Não é possível renomear para '{bank_data['name']}' pois este banco já existe.")

            for key, value in bank_data.items():
                setattr(db_bank, key, value)
            await db.commit()
            await db.refresh(db_bank)
        return db_bank

    @staticmethod
    async def delete_bank(db: AsyncSession, bank_id: int):
        from sqlalchemy.orm import selectinload
        result = await db.execute(
            select(Bank)
            .options(selectinload(Bank.rules), selectinload(Bank.tables), selectinload(Bank.coefficients))
            .where(Bank.id == bank_id)
        )
        db_bank = result.scalar_one_or_none()
        if db_bank:
            await db.delete(db_bank)
            await db.commit()
            return True
        return False

    # Rules
    @staticmethod
    async def get_rules_by_bank(db: AsyncSession, bank_id: int):
        result = await db.execute(select(BankRule).where(BankRule.bank_id == bank_id))
        return result.scalars().all()

    @staticmethod
    async def create_rule(db: AsyncSession, rule: BankRuleCreate):
        db_rule = BankRule(**rule.dict())
        db.add(db_rule)
        await db.commit()
        await db.refresh(db_rule)
        return db_rule

    @staticmethod
    async def update_rule(db: AsyncSession, rule_id: int, rule_data: dict):
        print(f"RULE UPDATE DEBUG: ID={rule_id}, DATA={rule_data}")
        result = await db.execute(select(BankRule).where(BankRule.id == rule_id))
        db_rule = result.scalar_one_or_none()
        if not db_rule:
            print(f"RULE {rule_id} NOT FOUND")
            return None
            
        # Explicitly update these to ensure they work
        if 'excluded_origin_banks' in rule_data:
            db_rule.excluded_origin_banks = rule_data['excluded_origin_banks']
        if 'origin_banks_min_paid' in rule_data:
            db_rule.origin_banks_min_paid = rule_data['origin_banks_min_paid']
        if 'excluded_benefit_types' in rule_data:
            db_rule.excluded_benefit_types = rule_data['excluded_benefit_types']
            
        for key, value in rule_data.items():
            if hasattr(db_rule, key) and key not in ['id', 'bank_id', 'excluded_origin_banks', 'origin_banks_min_paid', 'excluded_benefit_types']:
                setattr(db_rule, key, value)
                
        await db.commit()
        await db.refresh(db_rule)
        print(f"RULE {rule_id} UPDATED SUCCESSFULLY")
        return db_rule

    @staticmethod
    async def delete_rule(db: AsyncSession, rule_id: int):
        result = await db.execute(select(BankRule).where(BankRule.id == rule_id))
        db_rule = result.scalar_one_or_none()
        if db_rule:
            await db.delete(db_rule)
            await db.commit()
            return True
        return False

    # Tables & Coefficients
    @staticmethod
    async def get_tables_by_bank(db: AsyncSession, bank_id: int):
        result = await db.execute(select(BankTable).where(BankTable.bank_id == bank_id))
        return result.scalars().all()

    @staticmethod
    async def create_table(db: AsyncSession, table: BankTableCreate):
        db_table = BankTable(**table.dict())
        db.add(db_table)
        await db.commit()
        await db.refresh(db_table)
        return db_table

    @staticmethod
    async def update_table(db: AsyncSession, table_id: int, table_data: dict):
        print(f"TABLE UPDATE DEBUG: ID={table_id}, DATA={table_data}")
        result = await db.execute(select(BankTable).where(BankTable.id == table_id))
        db_table = result.scalar_one_or_none()
        if db_table:
            for key, value in table_data.items():
                if hasattr(db_table, key) and key not in ['id', 'bank_id']:
                    setattr(db_table, key, value)
            await db.commit()
            await db.refresh(db_table)
            print(f"TABLE {table_id} UPDATED SUCCESSFULLY")
        else:
            print(f"TABLE {table_id} NOT FOUND")
        return db_table

    @staticmethod
    async def delete_table(db: AsyncSession, table_id: int):
        result = await db.execute(select(BankTable).where(BankTable.id == table_id))
        db_table = result.scalar_one_or_none()
        if db_table:
            await db.delete(db_table)
            await db.commit()
            return True
        return False

    @staticmethod
    async def get_coefficients_by_table(db: AsyncSession, table_id: int):
        result = await db.execute(select(Coefficient).where(Coefficient.table_id == table_id))
        return result.scalars().all()

    @staticmethod
    async def create_coefficient(db: AsyncSession, coeff: CoefficientCreate):
        db_coeff = Coefficient(**coeff.dict())
        db.add(db_coeff)
        await db.commit()
        await db.refresh(db_coeff)
        return db_coeff

    @staticmethod
    async def update_coefficient(db: AsyncSession, coeff_id: int, coeff_data: dict):
        result = await db.execute(select(Coefficient).where(Coefficient.id == coeff_id))
        db_coeff = result.scalar_one_or_none()
        if db_coeff:
            for key, value in coeff_data.items():
                setattr(db_coeff, key, value)
            await db.commit()
            await db.refresh(db_coeff)
        return db_coeff

    @staticmethod
    async def delete_coefficient(db: AsyncSession, coeff_id: int):
        result = await db.execute(select(Coefficient).where(Coefficient.id == coeff_id))
        db_coeff = result.scalar_one_or_none()
        if db_coeff:
            await db.delete(db_coeff)
            await db.commit()
            return True
        return False

    # SubAgreementLogos
    @staticmethod
    async def get_all_sub_logos(db: AsyncSession):
        from app.models.sqlalchemy_models import SubAgreementLogo
        result = await db.execute(select(SubAgreementLogo))
        return result.scalars().all()

    @staticmethod
    async def create_sub_logo(db: AsyncSession, logo_data):
        from app.models.sqlalchemy_models import SubAgreementLogo
        
        # Verifica se já existe um logo com esse nome
        result = await db.execute(select(SubAgreementLogo).where(SubAgreementLogo.name == logo_data.name))
        existing = result.scalar_one_or_none()
        
        if existing:
            # Se existe, apenas atualiza a URL
            existing.logo_url = logo_data.logo_url
            await db.commit()
            await db.refresh(existing)
            return existing
            
        # Se não existe, cria um novo
        db_logo = SubAgreementLogo(**logo_data.dict())
        db.add(db_logo)
        await db.commit()
        await db.refresh(db_logo)
        return db_logo

    @staticmethod
    async def update_sub_logo(db: AsyncSession, logo_id: int, logo_data: dict):
        from app.models.sqlalchemy_models import SubAgreementLogo
        result = await db.execute(select(SubAgreementLogo).where(SubAgreementLogo.id == logo_id))
        db_logo = result.scalar_one_or_none()
        
        if db_logo:
            # Se estiver tentando mudar o nome, verifica se o novo nome já existe em outro ID
            if 'name' in logo_data and logo_data['name'] != db_logo.name:
                check_res = await db.execute(select(SubAgreementLogo).where(SubAgreementLogo.name == logo_data['name']))
                if check_res.scalar_one_or_none():
                    raise HTTPException(status_code=400, detail=f"Já existe um logo com o nome '{logo_data['name']}'. Use o existente ou escolha outro nome.")

            for key, value in logo_data.items():
                setattr(db_logo, key, value)
            await db.commit()
            await db.refresh(db_logo)
        return db_logo

    @staticmethod
    async def delete_sub_logo(db: AsyncSession, logo_id: int):
        from app.models.sqlalchemy_models import SubAgreementLogo
        result = await db.execute(select(SubAgreementLogo).where(SubAgreementLogo.id == logo_id))
        db_logo = result.scalar_one_or_none()
        if db_logo:
            await db.delete(db_logo)
            await db.commit()
            return True
        return False

    # Users / Visibility
    @staticmethod
    async def get_visible_banks_for_user(db: AsyncSession, user_id: int):
        """
        ETAPA 6: Retorna bancos visíveis
        - Se existir user_bank_visibility, retorna só os permitidos (is_visible=True)
        - Se não existir, retorna todos
        """
        visibilities_query = await db.execute(select(UserBankVisibility).where(UserBankVisibility.user_id == user_id))
        visibilities = visibilities_query.scalars().all()
        
        all_banks_query = await db.execute(select(Bank))
        all_banks = all_banks_query.scalars().all()
        
        if not visibilities:
            return all_banks
            
        blocked_names = [v.bank_name for v in visibilities if not v.is_visible]
        visible_names = [v.bank_name for v in visibilities if v.is_visible]
        
        # Se houver bancos explicitamente visíveis, usamos whitelist
        if visible_names:
            return [b for b in all_banks if b.name in visible_names and b.name not in blocked_names]
        
        # Caso contrário, usamos blacklist
        return [b for b in all_banks if b.name not in blocked_names]

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int, current_user: User):
        result = await db.execute(select(User).where(User.id == user_id))
        db_user = result.scalar_one_or_none()
        if not db_user:
            return None
        if current_user.role == "promotora" and db_user.id != current_user.id:
            if db_user.broker_id != current_user.id:
                raise HTTPException(status_code=403, detail="Acesso negado")
        if current_user.role == "vendedor" and db_user.id != current_user.id:
            raise HTTPException(status_code=403, detail="Acesso negado")
        return db_user

    @staticmethod
    async def get_all_users(db: AsyncSession, current_user: User):
        if current_user.role == "admin":
            result = await db.execute(select(User))
        elif current_user.role == "promotora":
            # Promotora vê a si mesma e os usuários criados por ela
            result = await db.execute(
                select(User).where(
                    or_(User.broker_id == current_user.id, User.id == current_user.id)
                )
            )
        else: # vendedor
            result = await db.execute(select(User).where(User.id == current_user.id))
            
        users = result.scalars().all()
        if not users:
            return []

        user_ids = [u.id for u in users]
        
        # Otimização: Obter todas as simulações agrupadas em uma única query
        simulations_res = await db.execute(
            select(Simulation.user_id, func.count(Simulation.id))
            .where(Simulation.user_id.in_(user_ids))
            .group_by(Simulation.user_id)
        )
        sim_counts = {row[0]: row[1] for row in simulations_res.all()}

        # Otimização: Obter todos os brokers em uma única query
        broker_ids = list(set([u.broker_id for u in users if u.broker_id]))
        broker_names = {}
        if broker_ids:
            broker_res = await db.execute(
                select(User.id, User.name).where(User.id.in_(broker_ids))
            )
            broker_names = {row[0]: row[1] for row in broker_res.all()}

        # Compute simulations count for each user
        for u in users:
            u.simulations_count = sim_counts.get(u.id, 0)
            
            # Identify creator
            if u.broker_id:
                u.broker_name = broker_names.get(u.broker_id, "Sistema")
            else:
                u.broker_name = "Administrador"
            
        return users

    @staticmethod
    async def count_sellers_by_broker(db: AsyncSession, broker_id: int) -> int:
        result = await db.execute(
            select(func.count(User.id)).where(
                User.broker_id == broker_id
            )
        )
        return result.scalar() or 0

    @staticmethod
    async def create_user(db: AsyncSession, user_data: dict, current_user: User):
        if current_user.role == "vendedor":
            raise HTTPException(status_code=403, detail="Vendedores não podem criar usuários")
            
        if current_user.role == "promotora":
            # Forçar que pertençam a ela
            user_data["broker_id"] = current_user.id
            if user_data.get("role") not in ["vendedor", "corretor"]:
                user_data["role"] = "vendedor"
            
        if "password" in user_data:
            user_data["password_hash"] = auth_service.get_password_hash(user_data.pop("password"))
        
        if "is_temporary_password" not in user_data:
            user_data["is_temporary_password"] = True

        role = user_data.get("role")
        if role in ["vendedor", "corretor"] and user_data.get("broker_id"):
            broker_result = await db.execute(select(User).where(User.id == user_data["broker_id"]))
            broker = broker_result.scalar_one_or_none()
            if broker:
                limit = broker.seller_limit if broker.seller_limit is not None else 0
                if limit <= 0:
                    raise HTTPException(
                        status_code=400,
                        detail="Você não possui limite para criar usuários. Por favor, entre em contato com o administrador."
                    )
                current_count = await AdminService.count_sellers_by_broker(db, broker.id)
                if current_count >= limit:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Limite de usuários atingido ({limit}). Por favor, entre em contato com o administrador."
                    )
            
        db_user = User(**user_data)
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user

    @staticmethod
    async def update_user(db: AsyncSession, user_id: int, user_data: dict, current_user: User):
        result = await db.execute(select(User).where(User.id == user_id))
        db_user = result.scalar_one_or_none()
        
        if not db_user:
            return None
            
        if current_user.role == "promotora":
            # Promotora verify ownership
            if db_user.broker_id != current_user.id or db_user.role not in ["vendedor", "corretor"]:
                raise HTTPException(status_code=403, detail="Acesso negado: Este usuário não pertence a você.")
            
            # Restrict globais, but ALLOW role if it's within team roles
            if "role" in user_data and user_data["role"] not in ["vendedor", "corretor"]:
                user_data.pop("role")
                
            restricted_fields = ["brand_color", "sidebar_color", "sidebar_color_secondary", "logo_url", "broker_id", "seller_limit"]
            for field in restricted_fields:
                if field in user_data:
                    user_data.pop(field)
                    
        elif current_user.role == "vendedor":
            if db_user.id != current_user.id:
                raise HTTPException(status_code=403, detail="Acesso negado: Você só pode editar seu próprio perfil.")
            restricted_fields = ["brand_color", "sidebar_color", "sidebar_color_secondary", "logo_url", "role", "broker_id", "seller_limit"]
            for field in restricted_fields:
                if field in user_data:
                    user_data.pop(field)

        if "password" in user_data and user_data["password"]:
            db_user.password_hash = auth_service.get_password_hash(user_data.pop("password"))
        elif "password" in user_data:
            user_data.pop("password")
            
        for key, value in user_data.items():
            setattr(db_user, key, value)
            
        await db.commit()
        await db.refresh(db_user)
        return db_user

    # Settings: Promotora Rules
    @staticmethod
    async def set_promotora_rule(db: AsyncSession, promotora_id: int, rule_key: str, rule_value: str, current_user: User):
        if current_user.role == "vendedor":
            raise HTTPException(status_code=403, detail="Acesso negado")
        if current_user.role == "promotora" and current_user.id != promotora_id:
            raise HTTPException(status_code=403, detail="Não pode editar regra de outra promotora")
            
        result = await db.execute(
            select(PromotoraRule).where(PromotoraRule.promotora_id == promotora_id, PromotoraRule.rule_key == rule_key)
        )
        rule = result.scalar_one_or_none()
        if rule:
            rule.rule_value = rule_value
        else:
            rule = PromotoraRule(promotora_id=promotora_id, rule_key=rule_key, rule_value=rule_value)
            db.add(rule)
        await db.commit()
        await db.refresh(rule)
        return rule

    @staticmethod
    async def get_promotora_rules(db: AsyncSession, promotora_id: int):
        result = await db.execute(select(PromotoraRule).where(PromotoraRule.promotora_id == promotora_id))
        return result.scalars().all()

    # Settings: Bank Visibility
    @staticmethod
    async def set_bank_visibility(db: AsyncSession, target_user_id: int, bank_name: str, is_visible: bool, current_user: User):
        if current_user.role == "vendedor":
            raise HTTPException(status_code=403, detail="Vendedores não podem definir regras globais")
            
        target_user = await AdminService.get_user_by_id(db, target_user_id, current_user)
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")

        result = await db.execute(
            select(UserBankVisibility)
            .where(UserBankVisibility.user_id == target_user_id, UserBankVisibility.bank_name == bank_name)
        )
        vis = result.scalar_one_or_none()
        if vis:
            vis.is_visible = is_visible
        else:
            vis = UserBankVisibility(user_id=target_user_id, bank_name=bank_name, is_visible=is_visible)
            db.add(vis)
        await db.commit()
        await db.refresh(vis)
        return vis

    # Companies
    @staticmethod
    async def get_all_companies(db: AsyncSession):
        result = await db.execute(select(Company))
        return result.scalars().all()

    @staticmethod
    async def create_company(db: AsyncSession, company: CompanyCreate):
        db_company = Company(**company.dict())
        db.add(db_company)
        await db.commit()
        await db.refresh(db_company)
        return db_company

    @staticmethod
    async def update_company(db: AsyncSession, company_id: int, company_data: dict):
        result = await db.execute(select(Company).where(Company.id == company_id))
        db_company = result.scalar_one_or_none()
        if db_company:
            for key, value in company_data.items():
                setattr(db_company, key, value)
            await db.commit()
            await db.refresh(db_company)
        return db_company

    @staticmethod
    async def delete_company(db: AsyncSession, company_id: int):
        result = await db.execute(select(Company).where(Company.id == company_id))
        db_company = result.scalar_one_or_none()
        if db_company:
            await db.delete(db_company)
            await db.commit()
            return True
        return False

    # Simulations
    @staticmethod
    async def get_all_simulations(db: AsyncSession, current_user: User):
        query = select(Simulation).options(selectinload(Simulation.results), selectinload(Simulation.user))
        
        if current_user.role == "admin":
            result = await db.execute(query.order_by(Simulation.created_at.desc()))
        elif current_user.role == "promotora":
            result = await db.execute(
                query.join(User).where((User.id == current_user.id) | (User.broker_id == current_user.id))
                .order_by(Simulation.created_at.desc())
            )
        else:
            result = await db.execute(
                query.where(Simulation.user_id == current_user.id)
                .order_by(Simulation.created_at.desc())
            )
            
        return result.scalars().all()

    @staticmethod
    async def save_simulation(db: AsyncSession, simulation_data: dict, results_list: list):
        db_sim = Simulation(**simulation_data)
        db.add(db_sim)
        await db.flush() # Get ID before commit
        
        for res in results_list:
            db_res = SimulationResult(
                simulation_id=db_sim.id,
                bank_id=res.get("bank_id"),
                table_name=res.get("tabela"),
                offered_rate=res.get("taxa_juros"),
                release_amount=res.get("valor_liberado"),
                is_approved=res.get("elegivel", True),
                rejection_reason=res.get("motivo"),
                term=res.get("prazo"),
                installment=res.get("valor_parcela")
            )
            db.add(db_res)
            
        await db.commit()
        await db.refresh(db_sim)
        return db_sim

    @staticmethod
    async def delete_user(db: AsyncSession, user_id: int, current_user: User):
        result = await db.execute(select(User).where(User.id == user_id))
        db_user = result.scalar_one_or_none()
        if not db_user:
            return False
            
        if current_user.role == "promotora":
            if db_user.broker_id != current_user.id or db_user.role != "vendedor":
                raise HTTPException(status_code=403, detail="Acesso negado: Este usuário não pertence a você.")
                
        elif current_user.role == "vendedor":
            raise HTTPException(status_code=403, detail="Vendedores não têm permissão para excluir usuários.")
            
        await db.delete(db_user)
        await db.commit()
        return True

    _dashboard_cache = {}
    _dashboard_cache_ttl = 10 # Cache de 10 segundos para velocidade extrema e alta atualização

    @staticmethod
    async def get_dashboard_stats(db: AsyncSession, current_user: User, days: int = 30):
        import time
        cache_key = f"{current_user.id}_{days}"
        now = time.time()
        
        if cache_key in AdminService._dashboard_cache:
            cached_data, timestamp = AdminService._dashboard_cache[cache_key]
            if now - timestamp < AdminService._dashboard_cache_ttl:
                return cached_data

        # Base query for simulations
        if current_user.role == "admin":
            sim_query = select(Simulation)
        elif current_user.role == "promotora":
            sim_query = select(Simulation).join(User, Simulation.user_id == User.id).where(
                (User.id == current_user.id) | (User.broker_id == current_user.id)
            )
        else: # vendedor / corretor
            sim_query = select(Simulation).where(Simulation.user_id == current_user.id)

        period_ago = datetime.utcnow() - timedelta(days=days)
        sim_query = sim_query.where(Simulation.created_at >= period_ago).order_by(Simulation.created_at.desc())
        
        # Load relationships
        result = await db.execute(
            sim_query.options(
                selectinload(Simulation.user), 
                selectinload(Simulation.results)
            )
        )
        simulations = result.scalars().all()

        # Total System Counts
        total_banks_res = await db.execute(select(func.count(Bank.id)))
        total_banks = total_banks_res.scalar() or 0
        
        total_tables_res = await db.execute(select(func.count(BankTable.id)))
        total_tables = total_tables_res.scalar() or 0
        
        total_simulations_res = await db.execute(select(func.count(Simulation.id)))
        total_simulations = total_simulations_res.scalar() or 0

        # Get bank metadata mapping
        banks_result = await db.execute(select(Bank))
        all_banks = banks_result.scalars().all()
        banks_map = {b.id: b.name for b in all_banks}
        banks_logo_map = {b.id: b.logo_url for b in all_banks}

        # Aggregate stats
        bank_counts = {} # bank_id -> dict
        table_counts = {}
        user_counts = {} # user_id -> dict
        rates = []
        agreement_counts = {}
        
        # Historical data
        thirty_days_ago = period_ago
        historical = {} # date -> {agreement -> count, "total": count}
        historical_values = {} # date -> {agreement -> sum_amount}
        origin_counts = {} # current_bank_name -> count

        # Get sub-logos for origin bank matching
        sub_logos_map = {}
        try:
            from app.models.sqlalchemy_models import SubAgreementLogo
            sub_logos_res = await db.execute(select(SubAgreementLogo))
            sub_logos = sub_logos_res.scalars().all()
            sub_logos_map = {l.name.upper(): l.logo_url for l in sub_logos}
        except Exception as e:
            pass # Silently handle missing table

        for sim in simulations:
            sim_max_amount = 0.0

            # Origin Bank Stats (Mais Portado)
            orig = str(sim.current_bank or "").strip().upper()
            if orig and len(orig) > 2:
                origin_counts[orig] = origin_counts.get(orig, 0) + 1

            # Agreement Stats
            agreement = sim.agreement or "OUTROS"
            agreement_counts[agreement] = agreement_counts.get(agreement, 0) + 1
            
            # User Stats
            uid = sim.user_id if sim.user else "removido"
            if uid not in user_counts:
                user_counts[uid] = {
                    "name": sim.user.name if sim.user else "Usuário Removido",
                    "avatar": (sim.user.logo_url or sim.user.avatar_url) if sim.user else None,
                    "count": 0,
                    "role": sim.user.role if sim.user else "N/A"
                }
            user_counts[uid]["count"] += 1
            
            # Historical 
            if sim.created_at:
                try:
                    created_dt = sim.created_at
                    if isinstance(created_dt, str):
                        created_dt = datetime.fromisoformat(created_dt.split('.')[0] if '.' in created_dt else created_dt)
                        
                    if created_dt > thirty_days_ago:
                        date_str = created_dt.strftime("%d/%m")
                        if date_str not in historical: 
                            historical[date_str] = {"total": 0}
                        historical[date_str][agreement] = historical[date_str].get(agreement, 0) + 1
                        historical[date_str]["total"] += 1
                except Exception as e:
                    pass

            # Result Stats (Contamos até resultados não aprovados para volume total processado)
            for res in sim.results:
                bid = res.bank_id
                if bid not in bank_counts:
                    bank_counts[bid] = {
                        "name": banks_map.get(bid, f"Banco {bid}"),
                        "logo": banks_logo_map.get(bid),
                        "count": 0,
                        "total_volume": 0.0
                    }
                bank_counts[bid]["count"] += 1
                
                try:
                    contract_val = float(sim.debt_balance or 0) + float(res.release_amount or 0)
                    bank_counts[bid]["total_volume"] += contract_val
                except ValueError:
                    pass
                
                if res.table_name:
                    if res.table_name not in table_counts:
                        table_counts[res.table_name] = {"count": 0, "bank_id": bid}
                    table_counts[res.table_name]["count"] += 1
                
                if res.offered_rate is not None and res.offered_rate > 0:
                    try:
                        rates.append(float(res.offered_rate))
                    except ValueError:
                        pass
                        
                if res.release_amount is not None:
                    try:
                        sim_max_amount = max(sim_max_amount, float(res.release_amount))
                    except ValueError:
                        pass
                        
            if sim_max_amount > 0 and sim.created_at:
                try:
                    created_dt = sim.created_at
                    if isinstance(created_dt, str):
                        created_dt = datetime.fromisoformat(created_dt.split('.')[0] if '.' in created_dt else created_dt)
                    if created_dt > thirty_days_ago:
                        date_str = created_dt.strftime("%d/%m")
                        if date_str not in historical_values: historical_values[date_str] = {}
                        historical_values[date_str][agreement] = historical_values[date_str].get(agreement, 0.0) + sim_max_amount
                except Exception as e:
                    pass

        # Top Values
        top_10_banks = sorted(bank_counts.values(), key=lambda x: x.get("total_volume", 0.0), reverse=True)[:10]
        top_10_users = sorted(user_counts.values(), key=lambda x: x["count"], reverse=True)[:10]
        
        top_table_name = max(table_counts, key=lambda k: table_counts[k]["count"]) if table_counts else "N/A"
        top_table_bank_id = table_counts[top_table_name]["bank_id"] if top_table_name != "N/A" else None
        top_table_logo = banks_logo_map.get(top_table_bank_id) if top_table_bank_id else None

        if top_table_name != "N/A" and top_table_bank_id:
            bank_name = banks_map.get(top_table_bank_id, "")
            if "-" in bank_name:
                bank_name = bank_name.split("-")[-1].strip()
            if bank_name:
                top_table_name = f"{top_table_name} ({bank_name.upper()})"

        top_origin_bank = max(origin_counts, key=origin_counts.get) if origin_counts else "N/A"
        top_origin_logo = None
        top_origin_name = top_origin_bank
        
        if top_origin_bank != "N/A":
            import re
            match = re.match(r'^(\d{3})\s*-\s*(.*)', str(top_origin_bank))
            if match:
                search_code = match.group(1).strip()
                search_name = match.group(2).strip().upper()
            else:
                search_code = str(top_origin_bank)[:3].strip() if str(top_origin_bank)[:3].isdigit() else ""
                search_name = str(top_origin_bank).upper()
            
            code_to_name = {
                "001": "BANCO DO BRASIL", "033": "SANTANDER", "104": "CAIXA", "237": "BRADESCO",
                "341": "ITAU", "077": "INTER", "025": "ALFA", "626": "C6", "422": "SAFRA",
                "041": "BANRISUL", "707": "DAYCOVAL", "655": "VOTORANTIM", "623": "PAN",
                "069": "BPN", "212": "ORIGINAL", "047": "BANESE"
            }
            if not search_name and search_code in code_to_name:
                search_name = code_to_name[search_code]

            search_code_clean = search_code.lstrip('0') if search_code.isdigit() else ""
            
            for l_name, l_url in sub_logos_map.items():
                l_name_up = l_name.upper()
                if (search_code and search_code in l_name_up) or \
                   (search_code_clean and search_code_clean in l_name_up) or \
                   (search_name and search_name in l_name_up):
                    top_origin_logo = l_url
                    top_origin_name = l_name
                    break
            
            if not top_origin_logo:
                for b_id, b_name in banks_map.items():
                    b_name_up = b_name.upper()
                    if (search_code and search_code in b_name_up) or \
                       (search_name and search_name in b_name_up):
                        top_origin_logo = banks_logo_map.get(b_id)
                        top_origin_name = b_name
                        break

        avg_rate = sum(rates) / len(rates) if rates else 0

        agreements_list = list(agreement_counts.keys())
        historical_chart = []
        for d in sorted(historical.keys()):
            entry = {"date": d, "simulations": historical[d].get("total", 0)}
            for agr in agreements_list:
                entry[agr] = historical[d].get(agr, 0)
                entry[f"{agr}_valor"] = historical_values.get(d, {}).get(agr, 0.0)
            historical_chart.append(entry)

        response_data = {
            "totals": {
                "banks": total_banks,
                "tables": total_tables,
                "simulations": total_simulations,
                "simulations_period": len(simulations)
            },
            "stats": {
                "top_bank": top_10_banks[0]["name"] if top_10_banks else "N/A",
                "top_bank_logo": top_10_banks[0]["logo"] if top_10_banks else None,
                "top_table": top_table_name,
                "top_table_logo": top_table_logo,
                "top_origin_bank": top_origin_name,
                "top_origin_logo": top_origin_logo,
                "top_user": top_10_users[0]["name"] if top_10_users else "N/A",
                "top_user_avatar": top_10_users[0]["avatar"] if top_10_users else None,
                "top_user_count": top_10_users[0]["count"] if top_10_users else 0,
                "top_banks": top_10_banks,
                "top_users": top_10_users,
                "avg_rate": f"{avg_rate:.2f}%"
            },
            "agreements": [
                {"name": name, "value": count} for name, count in agreement_counts.items()
            ],
            "historical": historical_chart[-7:], 
            "recent_simulations": [
                {
                    "id": s.id,
                    "client_name": s.client_name,
                    "agreement": s.agreement,
                    "current_bank": s.current_bank,
                    "user_name": s.user.name if s.user else "Removido",
                    "user_avatar": (s.user.logo_url or s.user.avatar_url) if s.user else None,
                    "created_at": s.created_at.strftime("%d/%m/%Y %H:%M") if s.created_at else "N/A",
                    "results": [
                        {
                            "bank_id": r.bank_id,
                            "bank_name": banks_map.get(r.bank_id, f"Banco {r.bank_id}"),
                            "bank_logo": banks_logo_map.get(r.bank_id),
                            "table_name": r.table_name,
                            "offered_rate": r.offered_rate,
                            "release_amount": float(r.release_amount) if r.release_amount is not None else 0.0,
                            "term": int(r.term) if r.term is not None else (int(s.total_term) if s.total_term else 84),
                            "installment": float(r.installment) if r.installment is not None else (float(s.installment_value) if s.installment_value else 0.0),
                            "contract_value": float(s.debt_balance or 0) + float(r.release_amount or 0),
                            "is_approved": r.is_approved
                        } for r in s.results
                    ]
                } for s in simulations
            ]
        }
        AdminService._dashboard_cache[cache_key] = (response_data, now)
        return response_data
    @staticmethod
    async def get_active_announcement(db: AsyncSession):
        from app.models.sqlalchemy_models import Announcement
        result = await db.execute(select(Announcement).where(Announcement.active == True).order_by(Announcement.id.desc()).limit(1))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_all_announcements(db: AsyncSession):
        from app.models.sqlalchemy_models import Announcement
        result = await db.execute(select(Announcement).order_by(Announcement.id.desc()))
        return result.scalars().all()

    @staticmethod
    async def create_announcement(db: AsyncSession, announcement_data: dict):
        from app.models.sqlalchemy_models import Announcement
        from sqlalchemy import update
        # Desativa os antigos
        await db.execute(update(Announcement).values(active=False))
        db_ann = Announcement(**announcement_data)
        db.add(db_ann)
        await db.commit()
        await db.refresh(db_ann)
        return db_ann

    @staticmethod
    async def update_announcement(db: AsyncSession, announcement_id: int, data: dict):
        from app.models.sqlalchemy_models import Announcement
        from sqlalchemy import update, select
        result = await db.execute(select(Announcement).where(Announcement.id == announcement_id))
        ann = result.scalar_one_or_none()
        if not ann:
            return None
        if data.get("active") is True:
            await db.execute(update(Announcement).values(active=False))
        for k, v in data.items():
            setattr(ann, k, v)
        await db.commit()
        await db.refresh(ann)
        return ann

    @staticmethod
    async def delete_announcement(db: AsyncSession, announcement_id: int):
        from app.models.sqlalchemy_models import Announcement
        from sqlalchemy import select
        result = await db.execute(select(Announcement).where(Announcement.id == announcement_id))
        ann = result.scalar_one_or_none()
        if not ann:
            return False
        await db.delete(ann)
        await db.commit()
        return True

    @staticmethod
    async def get_active_theme(db: AsyncSession):
        from app.models.sqlalchemy_models import User, PromotoraRule
        from sqlalchemy.future import select
        admin_result = await db.execute(select(User.id).where(User.role == "admin").limit(1))
        admin_id = admin_result.scalar_one_or_none()
        if not admin_id:
            return "default"
        theme_result = await db.execute(
            select(PromotoraRule.rule_value)
            .where(PromotoraRule.promotora_id == admin_id, PromotoraRule.rule_key == "active_theme")
        )
        theme = theme_result.scalar_one_or_none()
        return theme or "default"

    @staticmethod
    async def set_active_theme(db: AsyncSession, admin_id: int, theme: str):
        from app.models.sqlalchemy_models import PromotoraRule
        from sqlalchemy.future import select
        rule_result = await db.execute(
            select(PromotoraRule)
            .where(PromotoraRule.promotora_id == admin_id, PromotoraRule.rule_key == "active_theme")
        )
        rule = rule_result.scalar_one_or_none()
        if rule:
            rule.rule_value = theme
        else:
            rule = PromotoraRule(promotora_id=admin_id, rule_key="active_theme", rule_value=theme)
            db.add(rule)
        await db.commit()
        return theme


