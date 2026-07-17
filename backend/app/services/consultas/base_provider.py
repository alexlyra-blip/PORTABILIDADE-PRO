from abc import ABC, abstractmethod
from typing import Dict, Any

class ConsultaBeneficioProvider(ABC):
    @abstractmethod
    async def consultar_por_cpf(self, cpf: str) -> Dict[str, Any]:
        """
        Consulta os dados do benefício a partir de um CPF.
        Deve retornar o JSON padronizado conforme o schema ConsultaResponse.
        """
        pass
