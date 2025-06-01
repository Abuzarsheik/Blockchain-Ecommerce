import '../styles/LoadingSpinner.css';
import React from 'react';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'primary', 
  text = 'Loading...', 
  className = '',
  ariaLabel = 'Loading content'
}) => {
  return (
    <div 
      className={`loading-spinner ${size} ${color} ${className}`}
      role="status"
      aria-label={ariaLabel}
    >
      <div className="spinner" aria-hidden="true"></div>
      {text && (
        <span className="sr-only">{text}</span>
      )}
    </div>
  );
};

export default LoadingSpinner; 