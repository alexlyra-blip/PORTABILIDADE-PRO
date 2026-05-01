import React from 'react';

const BankCard = ({ bankName, offeredRate, releaseAmount, isBestOption }) => {
  // Simple color mapping based on bank name just for visual variation (simulating branding)
  const getBrandColor = (name) => {
    const brandMap = {
      'Banco Itaú': '#ec4e20',
      'Banco do Brasil': '#f6a90a',
      'Bradesco': '#cc092f',
      'Caixa Econômica': '#fdb913',
      'Santander': '#ec0000',
      'Banco PAN': '#00b0f0',
      'Banco BMG': '#f58220',
      'Banco Safra': '#002f6c',
      'C6 Bank': '#555555'
    };
    return brandMap[name] || 'var(--accent-primary)';
  };

  const brandColor = getBrandColor(bankName);
  
  const safeReleaseAmount = Number(releaseAmount) || 0;
  const safeOfferedRate = Number(offeredRate) || 0;
  
  const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(safeReleaseAmount);
  const formattedRate = `${safeOfferedRate.toFixed(2).replace('.', ',')}%`;

  return (
    <div 
      className={`glass-panel animate-fade-in ${isBestOption ? 'best-option' : ''}`}
      style={{
        padding: '1.5rem',
        marginBottom: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        position: 'relative',
        overflow: 'hidden',
        borderLeft: `4px solid ${brandColor}`,
        transition: 'transform 0.2s',
        cursor: 'default'
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {isBestOption && (
        <div style={{
          position: 'absolute',
          top: '0.5rem',
          right: '-2rem',
          backgroundColor: 'var(--success)',
          color: 'white',
          fontSize: '0.7rem',
          fontWeight: 'bold',
          padding: '0.2rem 2.5rem',
          transform: 'rotate(45deg)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          Melhor Opção
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0 }}>
          {bankName}
        </h3>
        <div style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.05)', 
          padding: '0.25rem 0.75rem', 
          borderRadius: '20px',
          fontSize: '0.875rem',
          color: 'var(--text-secondary)'
        }}>
          Taxa: <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{formattedRate}</span>
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end',
        marginTop: '0.5rem',
        borderTop: '1px solid var(--border-color)',
        paddingTop: '1rem'
      }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Valor Liberado (Troco)
        </div>
        <div style={{ 
          fontSize: '1.75rem', 
          fontWeight: '700', 
          color: isBestOption ? 'var(--success)' : 'var(--accent-primary)',
          letterSpacing: '-1px'
        }}>
          {formattedAmount}
        </div>
      </div>
    </div>
  );
};

export default BankCard;
