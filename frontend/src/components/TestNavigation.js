import React from 'react';

const TestNavigation = () => {
  try {
    console.log('🔥 TEST NAVIGATION IS WORKING!');
    console.log('🔥 TestNavigation render at:', new Date().toISOString());
    
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
    console.error('🚨 TestNavigation error:', error);
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