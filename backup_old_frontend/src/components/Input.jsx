import React from 'react';

const Input = ({ label, id, ...props }) => {
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
      <input
        id={id}
        {...props}
        style={{
          width: '100%',
          padding: '0.875rem 1rem',
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)',
          fontSize: '1rem',
          outline: 'none',
          transition: 'var(--transition)',
          fontFamily: 'inherit',
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
      />
    </div>
  );
};

export default Input;
