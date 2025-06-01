import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to monitoring service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-container">
            <div className="error-icon">
              <AlertTriangle size={64} color="#ef4444" />
            </div>
            
            <h1>Oops! Something went wrong</h1>
            <p>We encountered an unexpected error. Don't worry, we've been notified!</p>
            
            <div className="error-actions">
              <button 
                className="retry-button"
                onClick={() => window.location.reload()}
              >
                <RefreshCw size={16} />
                Refresh Page
              </button>
              
              <button 
                className="home-button"
                onClick={() => window.location.href = '/'}
              >
                <Home size={16} />
                Go Home
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Error Details (Development Only)</summary>
                <pre>{this.state.error && this.state.error.toString()}</pre>
                <pre>{this.state.errorInfo.componentStack}</pre>
              </details>
            )}
          </div>

          <style jsx>{`
            .error-boundary {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #f8fafc;
              padding: 2rem;
            }

            .error-container {
              text-align: center;
              max-width: 500px;
              background: white;
              padding: 3rem;
              border-radius: 16px;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            }

            .error-icon {
              margin-bottom: 2rem;
            }

            h1 {
              font-size: 1.5rem;
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 1rem;
            }

            p {
              color: #6b7280;
              margin-bottom: 2rem;
              line-height: 1.6;
            }

            .error-actions {
              display: flex;
              gap: 1rem;
              justify-content: center;
              margin-bottom: 2rem;
            }

            .retry-button, .home-button {
              display: flex;
              align-items: center;
              gap: 0.5rem;
              padding: 0.75rem 1.5rem;
              border: none;
              border-radius: 8px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s ease;
            }

            .retry-button {
              background: #3b82f6;
              color: white;
            }

            .retry-button:hover {
              background: #2563eb;
            }

            .home-button {
              background: #f3f4f6;
              color: #374151;
            }

            .home-button:hover {
              background: #e5e7eb;
            }

            .error-details {
              text-align: left;
              background: #f3f4f6;
              padding: 1rem;
              border-radius: 8px;
              margin-top: 1rem;
            }

            .error-details pre {
              font-size: 0.75rem;
              white-space: pre-wrap;
              word-wrap: break-word;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 