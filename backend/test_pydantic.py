import json
import asyncio
from app.schemas.consultas import ConsultaCpfMultiResponse, ConsultaResponse
from app.services.consultas.promosys_provider import PromosysProvider
import httpx

async def test():
    try:
        provider = PromosysProvider()
        token = await provider._get_token()
        print("Token obtido:", token[:10])

        cpf = "60072718382"
        # 1. Beneficios
        async with httpx.AsyncClient() as client:
            r1 = await client.post(f"{provider.base_url}/beneficios.php", data={"token": token, "cpf": cpf}, timeout=10)
        d1 = r1.json()
        print("Beneficios:", d1)

        # 2. Offline
        async with httpx.AsyncClient() as client:
            r2 = await client.post(f"{provider.base_url}/consultaOffline.php", data={"token": token, "beneficio": d1["Beneficios"][0]}, timeout=10)
        d2 = r2.json()
        print("Offline Code:", d2.get("Code"))
        
        raw = d2["Consulta"]
        if isinstance(raw, list): raw = raw[0]
        
        res_dict = await provider._normalize_response(raw, cpf)
        print("Normalize success!")

        # Fix telefones
        if "telefones" in res_dict and isinstance(res_dict["telefones"], list):
            res_dict["telefones"] = [t for t in res_dict["telefones"] if t]

        from app.schemas.consultas import BeneficioDetalhado
        detalhe = BeneficioDetalhado(
            numero=d1["Beneficios"][0],
            cliente=res_dict["cliente"],
            margens=res_dict["margens"],
            beneficio=res_dict["beneficio"],
            banco_pagador=res_dict["banco_pagador"],
            emprestimos=res_dict["emprestimos"],
            cartoes=res_dict["cartoes"],
            telefones=res_dict["telefones"],
            resumo=res_dict["resumo"]
        )
        print("BeneficioDetalhado success!")

        bp = ConsultaResponse(**res_dict)
        print("ConsultaResponse success!")

        multi = ConsultaCpfMultiResponse(
            success=True,
            cpf=cpf,
            total_beneficios=1,
            beneficios=[detalhe],
            beneficio_principal=bp,
            **res_dict
        )
        print("MultiResponse success!")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
