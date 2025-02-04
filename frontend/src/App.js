import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Health check component
const Health = () => {
  return { status: 'healthy', service: 'frontend' };
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/health" element={<Health />} />
        <Route path="/" element={
          <div className="App">
            <header className="App-header">
              <h1>TikToken</h1>
              <p>Welcome to TikToken - Your AI-Powered Content Platform</p>
            </header>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App; 