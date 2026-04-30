import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, User } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000/api`;

function Login({ onLogin }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Asegurar que los usuarios de prueba existan
  useEffect(() => {
    axios.post(`${API_URL}/setup`).catch(() => {});
  }, []);

  const handleQuickLogin = async (username, password) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_URL}/login`, { username, password });
      onLogin(response.data);
    } catch (err) {
      setError('Error al conectar con el servidor. Espera un momento y vuelve a intentar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, var(--bg-dark) 0%, #1e1b4b 100%)' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px', width: '100%' }}>
        <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '8px' }}>CloudPOS V2</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Selecciona tu perfil para ingresar</p>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '12px', marginBottom: '24px', textAlign: 'center', maxWidth: '600px', width: '100%' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '32px', maxWidth: '800px', width: '100%', padding: '0 24px', flexWrap: 'wrap', justifyContent: 'center' }}>
        
        {/* Admin Card */}
        <div 
          className="glass-panel animate-fade-in" 
          style={{ flex: '1 1 300px', padding: '40px 32px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s ease', borderTop: '4px solid var(--primary)' }}
          onClick={() => handleQuickLogin('admin', '123')}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-8px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <ShieldCheck size={40} color="var(--primary)" />
          </div>
          <h2 style={{ marginBottom: '8px' }}>Administrador</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px' }}>Control total del inventario, gestión de usuarios, categorías y métricas de ventas.</p>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar como Admin'}
          </button>
        </div>

        {/* Cashier Card */}
        <div 
          className="glass-panel animate-fade-in" 
          style={{ flex: '1 1 300px', padding: '40px 32px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s ease', borderTop: '4px solid var(--accent)', animationDelay: '0.1s' }}
          onClick={() => handleQuickLogin('cajero', '123')}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-8px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <User size={40} color="var(--accent)" />
          </div>
          <h2 style={{ marginBottom: '8px' }}>Cajero</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px' }}>Interfaz rápida de ventas (POS), catálogo de productos y generación de tickets.</p>
          <button className="btn" style={{ width: '100%', background: 'var(--accent)', color: 'white' }} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar como Cajero'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default Login;
