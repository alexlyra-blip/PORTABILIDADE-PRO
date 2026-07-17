import React from 'react';

const Button = ({ children, isFullWidth = false, variant = 'primary', ...props }) => {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.875rem 2rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition)',
    border: 'none',
    outline: 'none',
    width: isFullWidth ? '100%' : 'auto',
    fontFamily: 'inherit'
  };

  const variants = {
    primary: {
      backgroundColor: 'var(--accent-primary)',
      color: 'white',
      boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)'
    },
    secondary: {
      backgroundColor: 'transparent',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-color)'
    }
  };

  return (
    <button
      {...props}
      style={{
        ...baseStyle,
        ...variants[variant],
        ...props.style
      }}
      onMouseEnter={(e) => {
        if (!props.disabled) {
          if (variant === 'primary') {
            e.target.style.backgroundColor = 'var(--accent-hover)';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.39)';
          } else {
            e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!props.disabled) {
          if (variant === 'primary') {
            e.target.style.backgroundColor = 'var(--accent-primary)';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 14px 0 rgba(99, 102, 241, 0.39)';
          } else {
            e.target.style.backgroundColor = 'transparent';
          }
        }
      }}
    >
      {children}
    </button>
  );
};

export default Button;
