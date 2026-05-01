import React from 'react';

const Select = ({ label, id, options, ...props }) => {
  return (
    <div style={{ marginBottom: '1.5rem', width: '100%', textAlign: 'left' }}>
      {label && (
        <label 
          htmlFor={id} 
          style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontSize: '0.875rem', 
            fontWeight: '500', 
            color: 'var(--text-secondary)' 
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <select
          id={id}
          {...props}
          style={{
            appearance: 'none',
            width: '100%',
            padding: '0.875rem 1rem',
            paddingRight: '2.5rem',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            outline: 'none',
            transition: 'var(--transition)',
            fontFamily: 'inherit',
            cursor: 'pointer',
            ...props.style
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--accent-primary)';
            e.target.style.boxShadow = '0 0 0 4px var(--accent-light)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border-color)';
            e.target.style.boxShadow = 'none';
          }}
        >
          <option value="" disabled style={{ color: '#000' }}>Selecione uma opção</option>
          {options.map((opt, index) => (
            <option key={index} value={opt.value} style={{ color: '#000' }}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* Custom Caret Icon */}
        <div style={{
          position: 'absolute',
          right: '1rem',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Select;
