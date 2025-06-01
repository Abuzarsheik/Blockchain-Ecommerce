import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ariaUtils } from '../utils/accessibility';

const SmartFeedback = ({ 
  type = 'info', 
  message, 
  action,
  autoClose = true,
  duration = 5000,
  onClose,
  persistent = false,
  showProgress = false
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    onClose && onClose();
  }, [onClose]);

  useEffect(() => {
    if (autoClose && !persistent) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      if (showProgress) {
        const progressTimer = setInterval(() => {
          setProgress(prev => Math.max(0, prev - (100 / (duration / 100))));
        }, 100);

        return () => {
          clearTimeout(timer);
          clearInterval(progressTimer);
        };
      }

      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, persistent, showProgress, handleClose]);

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'error': return <AlertTriangle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    const baseStyles = "fixed top-4 right-4 max-w-md p-4 rounded-lg shadow-lg z-50 transform transition-all duration-300";
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-50 border border-green-200 text-green-800`;
      case 'error':
        return `${baseStyles} bg-red-50 border border-red-200 text-red-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 border border-yellow-200 text-yellow-800`;
      default:
        return `${baseStyles} bg-blue-50 border border-blue-200 text-blue-800`;
    }
  };

  useEffect(() => {
    if (isVisible) {
      ariaUtils.announce(message, type === 'error' ? 'assertive' : 'polite');
    }
  }, [isVisible, message, type]);

  if (!isVisible) return null;

  return (
    <div 
      className={getStyles()}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1">
          <p className="font-medium">{message}</p>
          
          {action && (
            <div className="mt-2">
              <button
                onClick={action.onClick}
                className="text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {action.label}
              </button>
            </div>
          )}
        </div>
        
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1 hover:bg-black hover:bg-opacity-10 rounded"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {showProgress && (
        <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
          <div 
            className="bg-current h-1 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

// Hook for easy feedback management
export const useFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);

  const showFeedback = (type, message, options = {}) => {
    const id = Date.now();
    const feedback = {
      id,
      type,
      message,
      ...options,
      onClose: () => {
        setFeedbacks(prev => prev.filter(f => f.id !== id));
        options.onClose && options.onClose();
      }
    };
    
    setFeedbacks(prev => [...prev, feedback]);
    
    return id;
  };

  const clearFeedback = (id) => {
    setFeedbacks(prev => prev.filter(f => f.id !== id));
  };

  const clearAll = () => {
    setFeedbacks([]);
  };

  return {
    feedbacks,
    showFeedback,
    clearFeedback,
    clearAll,
    // Convenience methods
    success: (message, options) => showFeedback('success', message, options),
    error: (message, options) => showFeedback('error', message, options),
    warning: (message, options) => showFeedback('warning', message, options),
    info: (message, options) => showFeedback('info', message, options)
  };
};

// Feedback container component
export const FeedbackContainer = () => {
  const { feedbacks } = useFeedback();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {feedbacks.map(feedback => (
        <SmartFeedback
          key={feedback.id}
          {...feedback}
        />
      ))}
    </div>
  );
};

export default SmartFeedback; 