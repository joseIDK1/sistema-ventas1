import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import AdminPanel from './AdminPanel';
import CashierPanel from './CashierPanel';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          user ? (
            <Navigate to={user.role === 'ADMIN' ? '/admin' : '/pos'} replace />
          ) : (
            <Login onLogin={handleLogin} />
          )
        } />
        
        <Route path="/admin" element={
          user && user.role === 'ADMIN' ? (
            <AdminPanel user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        } />
        
        <Route path="/pos" element={
          user ? (
            <CashierPanel user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" replace />
          )
        } />
        
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
