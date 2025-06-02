import React, { useState } from 'react';

function App() {
  const [test, setTest] = useState('Hello World');

  return (
    <div className="App">
      <header className="App-header">
        <h1>{test}</h1>
        <button onClick={() => setTest('React is working!')}>
          Test useState
        </button>
      </header>
    </div>
  );
}

export default App; 