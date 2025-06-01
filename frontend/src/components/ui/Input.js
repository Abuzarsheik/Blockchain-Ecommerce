import React from 'react';

const Input = ({ 
  type = 'text',
  placeholder = '',
  value,
  onChange,
  disabled = false,
  className = '',
  ...props 
}) => {
  const baseClasses = 'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
  const disabledClasses = disabled ? 'bg-gray-100 cursor-not-allowed' : '';
  
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`${baseClasses} ${disabledClasses} ${className}`}
      {...props}
    />
  );
};

export { Input }; 