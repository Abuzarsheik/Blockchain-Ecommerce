import React from 'react';
import { useLocation } from 'react-router-dom';

const EnhancedNavigation = () => {
  const location = useLocation();
  
  // DEBUG: Console log to verify component is loading
  
  return (
    <>
      {/* DEBUG: Temporary banner to confirm new navigation is loading */}
      <div style={{
        background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57, #ff9ff3)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 3s ease infinite',
        color: 'white',
        padding: '20px',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '20px',
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        zIndex: '99999',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        textShadow: '3px 3px 6px rgba(0,0,0,0.8)',
        border: '4px solid #fff',
        fontFamily: 'Arial, sans-serif'
      }}>
        🎉🚀 SIMPLIFIED NAVIGATION TEST! 🚀🎉
        <br />
        <small style={{ fontSize: '16px', opacity: 0.95, fontWeight: 'bold' }}>
          ✅ BASIC COMPONENT LOADED! Check console for debug info.
        </small>
        <br />
        <small style={{ fontSize: '14px', opacity: 0.9 }}>
          Current page: {location.pathname}
        </small>
      </div>
      
      {/* Add keyframes for the animation */}
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      
      {/* Simple navigation placeholder */}
      <nav style={{ 
        marginTop: '120px', 
        padding: '20px', 
        background: '#f0f0f0', 
        textAlign: 'center',
        fontSize: '18px',
        fontWeight: 'bold'
      }}>
        🔧 SIMPLIFIED NAVIGATION - IF YOU SEE THIS, THE COMPONENT IS WORKING! 🔧
      </nav>
    </>
  );
};

export default EnhancedNavigation; 