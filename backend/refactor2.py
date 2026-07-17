import re

with open(r'c:\Users\alexa\OneDrive\Ambiente de Trabalho\Projeto Simulador de Porabilidade\backend\app\services\admin_service.py', 'r', encoding='utf-8') as f:
    content = f.read()

new_method = """    @staticmethod
    async def get_dashboard_stats(db: AsyncSession, current_user: User, days: int = 30):
        import time
        from sqlalchemy import text, cast, Date
        from app.models.sqlalchemy_models import SubAgreementLogo
        
        cache_key = f"{current_user.id}_{days}"
        now = time.time()
        
        if cache_key in AdminService._dashboard_cache:
            cached_data, timestamp = AdminService._dashboard_cache[cache_key]
            if now - timestamp < AdminService._dashboard_cache_ttl:
                return cached_data

        period_ago = datetime.utcnow() - timedelta(days=days)

        # Base conditions
        sim_conds = [Simulation.created_at >= period_ago]
        if current_user.role == "promotora":
            sim_conds.append(Simulation.user_id.in_(
                select(User.id).where((User.id == current_user.id) | (User.broker_id == current_user.id))
            ))
        elif current_user.role != "admin":
            sim_conds.append(Simulation.user_id == current_user.id)

        # 1. Total System Counts
        total_banks_q = select(func.count(Bank.id))
        total_tables_q = select(func.count(BankTable.id))
        total_simulations_q = select(func.count(Simulation.id))
        simulations_period_q = select(func.count(Simulation.id)).where(*sim_conds)

        # 3. Origin Banks Count
        origin_counts_q = select(
            func.upper(func.trim(Simulation.current_bank)), 
            func.count(Simulation.id)
        ).where(*sim_conds, Simulation.current_bank != None, func.length(Simulation.current_bank) > 2).group_by(
            func.upper(func.trim(Simulation.current_bank))
        ).order_by(func.count(Simulation.id).desc()).limit(10)

        # 4. Agreements Count
        agreement_counts_q = select(
            func.coalesce(Simulation.agreement, 'OUTROS'),
            func.count(Simulation.id)
        ).where(*sim_conds).group_by(func.coalesce(Simulation.agreement, 'OUTROS'))

        # 5. Top Users Count
        user_counts_q = select(
            Simulation.user_id,
            User.name,
            func.coalesce(User.logo_url, User.avatar_url),
            User.role,
            func.count(Simulation.id).label("cnt")
        ).outerjoin(User, Simulation.user_id == User.id).where(*sim_conds).group_by(
            Simulation.user_id, User.name, User.logo_url, User.avatar_url, User.role
        ).order_by(func.count(Simulation.id).desc()).limit(10)

        # 6. Historical Count
        historical_q = select(
            cast(Simulation.created_at, Date).label("dt"),
            func.coalesce(Simulation.agreement, 'OUTROS').label("ag"),
            func.count(Simulation.id).label("cnt")
        ).where(*sim_conds).group_by(cast(Simulation.created_at, Date), func.coalesce(Simulation.agreement, 'OUTROS'))
        
        # 7. Subqueries for Results
        res_query = select(SimulationResult).join(Simulation)
        if current_user.role == "promotora":
            res_query = res_query.join(User, Simulation.user_id == User.id).where(
                (User.id == current_user.id) | (User.broker_id == current_user.id)
            )
        elif current_user.role != "admin":
            res_query = res_query.where(Simulation.user_id == current_user.id)
            
        res_query = res_query.where(Simulation.created_at >= period_ago)
        subq = res_query.subquery()

        bank_stats_q = select(
            subq.c.bank_id,
            func.count(subq.c.id),
            func.sum(subq.c.release_amount)
        ).select_from(subq).group_by(subq.c.bank_id).order_by(func.sum(subq.c.release_amount).desc()).limit(10)

        table_stats_q = select(
            subq.c.table_name,
            func.count(subq.c.id),
            func.max(subq.c.bank_id)
        ).select_from(subq).where(subq.c.table_name != None).group_by(subq.c.table_name).order_by(func.count(subq.c.id).desc()).limit(1)

        rate_stats_q = select(func.avg(subq.c.offered_rate)).select_from(subq).where(subq.c.offered_rate > 0)
        
        hist_val_q = select(
            cast(Simulation.created_at, Date).label('dt'),
            func.coalesce(Simulation.agreement, 'OUTROS'),
            func.sum(SimulationResult.release_amount)
        ).join(SimulationResult, Simulation.id == SimulationResult.simulation_id).where(*sim_conds).group_by(
            cast(Simulation.created_at, Date), func.coalesce(Simulation.agreement, 'OUTROS')
        )

        recent_query = select(Simulation).where(*sim_conds).options(
            selectinload(Simulation.user), 
            selectinload(Simulation.results)
        ).order_by(Simulation.created_at.desc()).limit(50)

        banks_q = select(Bank)
        sub_logos_q = select(SubAgreementLogo)

        async def safe_execute(query, is_scalar=False, is_all=False):
            try:
                res = await db.execute(query)
                if is_scalar:
                    return res.scalar() or 0
                if is_all:
                    return res.all()
                return res.scalars().all()
            except Exception as e:
                print(f"Query Error: {e}")
                return [] if is_all else (0 if is_scalar else None)

        # Executando sequencialmente para evitar erro de concorrência do SQLAlchemy AsyncSession
        total_banks = await safe_execute(total_banks_q, is_scalar=True)
        total_tables = await safe_execute(total_tables_q, is_scalar=True)
        total_simulations = await safe_execute(total_simulations_q, is_scalar=True)
        sim_period_count = await safe_execute(simulations_period_q, is_scalar=True)
        
        origin_counts = await safe_execute(origin_counts_q, is_all=True)
        agreement_counts = await safe_execute(agreement_counts_q, is_all=True)
        user_counts = await safe_execute(user_counts_q, is_all=True)
        historical_raw = await safe_execute(historical_q, is_all=True)
        bank_stats = await safe_execute(bank_stats_q, is_all=True)
        table_stats = await safe_execute(table_stats_q, is_all=True)
        avg_rate = await safe_execute(rate_stats_q, is_scalar=True)
        hist_val = await safe_execute(hist_val_q, is_all=True)
        recent_simulations_db = await safe_execute(recent_query)
        all_banks = await safe_execute(banks_q)
        sub_logos = await safe_execute(sub_logos_q)

        banks_map = {b.id: b.name for b in all_banks} if all_banks else {}
        banks_logo_map = {b.id: b.logo_url for b in all_banks} if all_banks else {}
        sub_logos_map = {l.name.upper(): l.logo_url for l in sub_logos} if sub_logos else {}

        top_10_banks = []
        for bid, count, vol in bank_stats:
            top_10_banks.append({
                "name": banks_map.get(bid, f"Banco {bid}"),
                "logo": banks_logo_map.get(bid),
                "count": count,
                "total_volume": float(vol) if vol else 0.0
            })

        top_10_users = []
        for uid, uname, uavatar, urole, count in user_counts:
            top_10_users.append({
                "name": uname or "Usuário Removido",
                "avatar": uavatar,
                "count": count,
                "role": urole or "N/A"
            })

        top_table_name = "N/A"
        top_table_logo = None
        if table_stats and len(table_stats) > 0:
            tname, count, bid = table_stats[0]
            top_table_bank_id = bid
            top_table_logo = banks_logo_map.get(bid)
            bank_name = banks_map.get(bid, "")
            if "-" in bank_name: bank_name = bank_name.split("-")[-1].strip()
            top_table_name = f"{tname} ({bank_name.upper()})" if bank_name else tname

        top_origin_bank = origin_counts[0][0] if origin_counts else "N/A"
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

        historical = {}
        for dt, ag, cnt in historical_raw:
            d_str = dt.strftime("%d/%m") if hasattr(dt, "strftime") else str(dt)[8:10] + "/" + str(dt)[5:7]
            if d_str not in historical: historical[d_str] = {"total": 0}
            historical[d_str][ag] = historical[d_str].get(ag, 0) + cnt
            historical[d_str]["total"] += cnt
            
        historical_values = {}
        for dt, ag, val in hist_val:
            d_str = dt.strftime("%d/%m") if hasattr(dt, "strftime") else str(dt)[8:10] + "/" + str(dt)[5:7]
            if d_str not in historical_values: historical_values[d_str] = {}
            historical_values[d_str][ag] = float(val) if val else 0.0

        agreements_list = [row[0] for row in agreement_counts] if agreement_counts else []
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
                "simulations_period": sim_period_count
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
                {"name": name, "value": count} for name, count in agreement_counts
            ] if agreement_counts else [],
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
                } for s in recent_simulations_db
            ] if recent_simulations_db else []
        }
        AdminService._dashboard_cache[cache_key] = (response_data, now)
        return response_data"""

start_str = "    @staticmethod\n    async def get_dashboard_stats(db: AsyncSession, current_user: User, days: int = 30):"
end_str = "    @staticmethod\n    async def get_active_announcement(db: AsyncSession):"

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + new_method + "\n" + content[end_idx:]
    with open(r'c:\Users\alexa\OneDrive\Ambiente de Trabalho\Projeto Simulador de Porabilidade\backend\app\services\admin_service.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Replaced get_dashboard_stats successfully")
else:
    print("Function not found")
