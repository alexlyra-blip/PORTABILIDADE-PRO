from app.services.consultas.base_provider import ConsultaBeneficioProvider

class ConsultaService:
    def __init__(self, provider: ConsultaBeneficioProvider):
        self.provider = provider
        
    def _limpar_cpf(self, cpf: str) -> str:
        return "".join(filter(str.isdigit, cpf))

    def _validar_cpf(self, cpf: str) -> bool:
        cpf_limpo = self._limpar_cpf(cpf)
        if len(cpf_limpo) != 11:
            return False
        # Simplified validation, assume structural validation is enough for API proxying
        return True

    async def consultar_cpf(self, cpf: str) -> dict:
        cpf_limpo = self._limpar_cpf(cpf)
        
        if not self._validar_cpf(cpf_limpo):
            raise ValueError("CPF inválido.")
            
        try:
            dados = await self.provider.consultar_por_cpf(cpf_limpo)
            return dados
        except Exception as e:
            # Captura erros e repassa com uma mensagem padrão ou original
            raise ValueError(f"Erro na consulta: {str(e)}")
