import React from 'react';
import { Home, User, Settings, Menu, X } from 'lucide-react';
import { logger } from '../utils/logger';

const TestNavigation = () => {
  try {
    
    return (
      <div style={{
        background: 'red',
        color: 'white',
        padding: '30px',
        textAlign: 'center',
        fontSize: '24px',
        fontWeight: 'bold',
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        zIndex: '99999',
        border: '3px solid yellow'
      }}>
        🔥 TEST NAVIGATION COMPONENT IS ACTIVE! 🔥
        <br />
        <small>Time: {new Date().toLocaleTimeString()}</small>
      </div>
    );
  } catch (error) {
    logger.error('🚨 TestNavigation error:', error);
    return (
      <div style={{
        background: 'orange',
        color: 'black',
        padding: '20px',
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        zIndex: '99999'
      }}>
        ERROR IN TEST NAVIGATION: {error.message}
      </div>
    );
  }
};

export default TestNavigation; 
