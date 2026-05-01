import React, { useState } from 'react';
import Input from './components/Input';
import Select from './components/Select';
import Button from './components/Button';
import BankCard from './components/BankCard';
import { simularPortabilidade, BANCOS_LISTA } from './utils/simulator';

function App() {
  const [formData, setFormData] = useState({
    nome: '',
    idade: '',
    beneficio: '',
    bancoAtual: '',
    saldoDevedor: '',
    valorParcela: '',
    taxaAtual: ''
  });

  const [resultados, setResultados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSimular = (e) => {
    e.preventDefault();
    setErro('');
    
    // Validar form rudimentar
    if (!formData.idade || !formData.saldoDevedor || !formData.valorParcela || !formData.taxaAtual || !formData.bancoAtual) {
      setErro('Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    setLoading(true);
    setResultados(null);

    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:8000/simular', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idade: Number(formData.idade),
            tipo_beneficio: formData.beneficio,
            banco_atual: formData.bancoAtual,
            saldo_devedor: Number(formData.saldoDevedor.replace(',','.')),
            parcela: Number(formData.valorParcela.replace(',','.')),
            taxa_atual: Number(formData.taxaAtual.replace(',','.'))
          }),
        });
        
        if (!response.ok) {
          throw new Error('Falha na resposta da API');
        }
        
        const bancosAprovados = await response.json();
        
        // Mapeando do formato da API Python para o formato esperado pelo BankCard
        const resultadosFormatados = bancosAprovados.map(banco => ({
          id: banco.banco,
          nome: banco.banco,
          taxaOferecida: banco.taxa_juros,
          valorLiberado: banco.valor_liberado
        }));
        
        setResultados(resultadosFormatados);
      } catch (err) {
        setErro('Erro de comunicação com o servidor de cálculos. O backend Python está rodando?');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  };

  return (
    <div className="app-container">
      <div className="bg-orb bg-orb-1"></div>
      <div className="bg-orb bg-orb-2"></div>
      
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            Simulador de Portabilidade
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', maxWidth: '600px', margin: '0 auto' }}>
            Descubra as melhores oportunidades para reduzir sua parcela ou receber troco na portabilidade do seu empréstimo.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
          
          {/* Formulário de Dados */}
          <div className="glass-panel animate-fade-in">
            <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              Dados da Simulação
            </h2>
            
            {erro && (
              <div style={{ padding: '1rem', backgroundColor: 'var(--accent-light)', color: '#ffb3b3', borderLeft: '4px solid #ff4d4d', marginBottom: '1.5rem', borderRadius: '4px' }}>
                {erro}
              </div>
            )}

            <form onSubmit={handleSimular}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                 <div style={{ gridColumn: '1 / -1' }}>
                    <Input id="nome" label="Nome do Cliente (Opcional)" placeholder="Ex: João da Silva" value={formData.nome} onChange={handleChange} />
                 </div>
                 
                 <Input id="idade" label="Idade *" type="number" placeholder="Ex: 65" min="18" max="100" value={formData.idade} onChange={handleChange} required />
                 
                 <Select id="beneficio" label="Tipo de Benefício *" value={formData.beneficio} onChange={handleChange} required options={[
                   { value: 'INSS', label: 'Aposentado/Pensionista INSS' },
                   { value: 'SIAPE', label: 'Servidor Federal (SIAPE)' },
                   { value: 'Governo', label: 'Governo Estadual' },
                   { value: 'Prefeitura', label: 'Servidor Municipal' },
                   { value: 'ForcasArmadas', label: 'Forças Armadas' }
                 ]} />
              </div>

              <h3 style={{ margin: '1.5rem 0 1rem', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Dados do Contrato Atual</h3>

              <Select id="bancoAtual" label="Banco Atual *" value={formData.bancoAtual} onChange={handleChange} required options={
                BANCOS_LISTA.map(b => ({ value: b, label: b }))
              } />

              <Input id="saldoDevedor" label="Saldo Devedor Aproximado (R$) *" type="number" step="0.01" placeholder="Ex: 15000.00" value={formData.saldoDevedor} onChange={handleChange} required />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                <Input id="valorParcela" label="Valor da Parcela (R$) *" type="number" step="0.01" placeholder="Ex: 450.00" value={formData.valorParcela} onChange={handleChange} required />
                <Input id="taxaAtual" label="Taxa Atual (%) *" type="number" step="0.01" placeholder="Ex: 1.80" value={formData.taxaAtual} onChange={handleChange} required />
              </div>

              <div style={{ marginTop: '2rem' }}>
                <Button type="submit" isFullWidth disabled={loading}>
                  {loading ? 'Calculando Oportunidades...' : 'Simular Portabilidade'}
                </Button>
              </div>
            </form>
          </div>

          {/* Área de Resultados */}
          <div className="glass-panel animate-fade-in" style={{ animationDelay: '0.2s', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              Resultados da Análise
            </h2>

            {loading ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
                <div style={{ 
                  width: '50px', height: '50px', borderRadius: '50%', border: '4px solid var(--border-color)', 
                  borderTopColor: 'var(--accent-primary)', animation: 'spin 1s linear infinite', marginBottom: '1rem' 
                }} />
                <p>Analisando regras de {BANCOS_CADASTRADOS?.length || 7} bancos...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
            ) : resultados === null ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: 0.5 }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}>
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <p>Preencha os dados e clique em "Simular" para ver os bancos elegíveis para o cliente.</p>
              </div>
            ) : !resultados || resultados.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div style={{ color: '#ffb3b3', marginBottom: '1rem' }}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
                <h3 style={{ marginBottom: '0.5rem' }}>Nenhum Banco Aprovado</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Com os dados informados, o cliente não possui margem para troco ou as regras de idade/taxa não permitem a portabilidade no momento.
                </p>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
                <p style={{ color: 'var(--success)', fontWeight: '500', marginBottom: '0.5rem' }}>
                  Encontramos {resultados.length} oportunidade{resultados.length > 1 ? 's' : ''} com troco!
                </p>
                {resultados.map((banco, index) => (
                  <BankCard 
                    key={banco.id}
                    bankName={banco.nome}
                    offeredRate={banco.taxaOferecida}
                    releaseAmount={banco.valorLiberado}
                    isBestOption={index === 0}
                  />
                ))}
              </div>
            )}
          </div>
          
        </div>
      </main>
    </div>
  );
}

export default App;
