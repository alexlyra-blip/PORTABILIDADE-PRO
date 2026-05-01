// Simulated Database & Rule Engine

const BANCOS_CADASTRADOS = [
  { id: 1, nome: 'Banco Itaú', taxaMaxima: 1.60, idadeMax: 70, coeficiente: 0.02345, bancoAtualProibido: ['Banco Itaú'] },
  { id: 2, nome: 'Banco do Brasil', taxaMaxima: 1.55, idadeMax: 65, coeficiente: 0.02410, bancoAtualProibido: ['Banco do Brasil'] },
  { id: 3, nome: 'Bradesco', taxaMaxima: 1.65, idadeMax: 73, coeficiente: 0.02290, bancoAtualProibido: ['Bradesco'] },
  { id: 4, nome: 'Caixa Econômica', taxaMaxima: 1.50, idadeMax: 68, coeficiente: 0.02450, bancoAtualProibido: ['Caixa Econômica'] },
  { id: 5, nome: 'Santander', taxaMaxima: 1.58, idadeMax: 72, coeficiente: 0.02380, bancoAtualProibido: ['Santander'] },
  { id: 6, nome: 'Banco PAN', taxaMaxima: 1.70, idadeMax: 75, coeficiente: 0.02200, bancoAtualProibido: [] },
  { id: 7, nome: 'Banco BMG', taxaMaxima: 1.68, idadeMax: 74, coeficiente: 0.02250, bancoAtualProibido: [] }
];

/**
 * Motor de regras para avaliar a portabilidade
 * @param {Object} dadosCliente { idade, beneficio }
 * @param {Object} dadosContrato { bancoAtual, saldoDevedor, valorParcela, taxaAtual }
 * @returns {Array} Lista de bancos aprovados ordenados pelo maior troco
 */
export const simularPortabilidade = (dadosCliente, dadosContrato) => {
  const idade = parseInt(dadosCliente.idade, 10);
  const taxaAtual = parseFloat(String(dadosContrato.taxaAtual).replace(',', '.'));
  const saldoDevedor = parseFloat(String(dadosContrato.saldoDevedor).replace(',', '.'));
  const valorParcela = parseFloat(String(dadosContrato.valorParcela).replace(',', '.'));

  if (isNaN(idade) || isNaN(taxaAtual) || isNaN(saldoDevedor) || isNaN(valorParcela)) {
    throw new Error('Dados inválidos para cálculo');
  }

  const bancosAprovados = [];

  BANCOS_CADASTRADOS.forEach(banco => {
    // Regra 1: O cliente não pode portar para o mesmo banco que já está
    if (banco.bancoAtualProibido.includes(dadosContrato.bancoAtual)) return;

    // Regra 2: Limite de Idade
    if (idade > banco.idadeMax) return;

    // Regra 3: A taxa do banco de destino deve ser menor que a atual
    if (banco.taxaMaxima >= taxaAtual) return;

    // Cálculo do valor liberado (Troco)
    // Formula exemplo: (Valor Parcela / Coeficiente) - Saldo Devedor
    // Esta é uma fórmula aproximada baseada no mercado (Pode ser substituida pela real do painel)
    
    const parcelaEstimadaNovaViaCoeficiente = banco.coeficiente * saldoDevedor;
    
    // Se a parcela que o banco pede pelo saldo for maior que a parcela que o cliente já paga, não vale a pena
    if (parcelaEstimadaNovaViaCoeficiente >= valorParcela) return;

    // Quanto de crédito 'novo' essa parcela do cliente consegue comprar na taxa do novo banco?
    const valorTotalComprado = valorParcela / banco.coeficiente;
    
    // Troco = Valor Total Comprado (capacidade) - Saldo Devedor (que vai quitar o antigo)
    const trocoLiberado = valorTotalComprado - saldoDevedor;

    if (trocoLiberado > 0) {
      bancosAprovados.push({
        id: banco.id,
        nome: banco.nome,
        taxaOferecida: banco.taxaMaxima,
        valorLiberado: trocoLiberado
      });
    }
  });

  // Retornar bancos ordenados do maior troco para o menor
  return bancosAprovados.sort((a, b) => b.valorLiberado - a.valorLiberado);
};

export const BANCOS_LISTA = BANCOS_CADASTRADOS.map(b => b.nome).sort();
