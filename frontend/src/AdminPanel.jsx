import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Users, LayoutDashboard, LogOut, Plus, Trash2, Edit, Tags, TrendingUp, Box, DollarSign, Activity } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000/api`;

function AdminPanel({ user, onLogout }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [sales, setSales] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      if (activeTab === 'dashboard') {
        const [salesRes, prodRes] = await Promise.all([axios.get(`${API_URL}/sales`), axios.get(`${API_URL}/products`)]);
        setSales(salesRes.data);
        setProducts(prodRes.data);
      } else if (activeTab === 'products') {
        const [prodRes, catRes] = await Promise.all([axios.get(`${API_URL}/products`), axios.get(`${API_URL}/categories`)]);
        setProducts(prodRes.data);
        setCategories(catRes.data);
      } else if (activeTab === 'categories') {
        const catRes = await axios.get(`${API_URL}/categories`);
        setCategories(catRes.data);
      } else if (activeTab === 'users') {
        const usersRes = await axios.get(`${API_URL}/users`);
        setUsers(usersRes.data);
      } else if (activeTab === 'logs') {
        const logsRes = await axios.get(`${API_URL}/logs`);
        setLogs(logsRes.data);
      }
    } catch (error) {
      console.error("Error fetching data", error);
    }
  };

  const openForm = (data = null) => {
    setEditingId(data ? data.id : null);
    if (activeTab === 'products') {
      setFormData(data ? { name: data.name, description: data.description || '', price: data.price, stock: data.stock, categoryId: data.categoryId } : { name: '', description: '', price: '', stock: '', categoryId: '' });
    } else if (activeTab === 'categories') {
      setFormData(data ? { name: data.name, description: data.description || '' } : { name: '', description: '' });
    } else if (activeTab === 'users') {
      setFormData(data ? { name: data.name, username: data.username, password: '', role: data.role } : { name: '', username: '', password: '', role: 'CASHIER' });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = `${API_URL}/${activeTab}`;
      const dataToSend = { ...formData, adminId: user.id };
      
      if (editingId) {
        if (activeTab === 'users' && !formData.password) delete dataToSend.password;
        await axios.put(`${endpoint}/${editingId}`, dataToSend);
      } else {
        await axios.post(endpoint, dataToSend);
      }
      setShowForm(false);
      fetchData();
    } catch (error) {
      alert("Error al guardar");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este registro?")) {
      try {
        await axios.delete(`${API_URL}/${activeTab}/${id}`, { data: { adminId: user.id } });
        fetchData();
      } catch (error) {
        alert("Error al eliminar. Es posible que esté en uso.");
      }
    }
  };

  // KPIs
  const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
  const totalInventoryValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
  const totalSalesValue = sales.reduce((acc, s) => acc + s.total, 0);

  return (
    <div className="app-container animate-fade-in">
      <div className="sidebar glass-panel" style={{ borderRadius: 0, borderTop: 0, borderBottom: 0, borderLeft: 0 }}>
        <div style={{ marginBottom: '32px' }}>
          <h2 className="text-gradient">CloudPOS</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Panel de Administrador</p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <button className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button className={`btn ${activeTab === 'products' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('products')}>
            <Package size={18} /> Productos
          </button>
          <button className={`btn ${activeTab === 'categories' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('categories')}>
            <Tags size={18} /> Categorías
          </button>
          <button className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('users')}>
            <Users size={18} /> Empleados
          </button>
          <button className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('logs')}>
            <Activity size={18} /> Bitácora
          </button>
        </nav>

        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {user.name.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: '600' }}>{user.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.role}</div>
            </div>
          </div>
          <button className="btn btn-outline" style={{ width: '100%', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={onLogout}>
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </div>

      <div className="main-content">
        {/* === DASHBOARD === */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={{ marginBottom: '24px' }}>Resumen del Negocio</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '16px', borderRadius: '12px' }}><DollarSign size={24} color="var(--primary)" /></div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Ingresos Totales</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>${totalSalesValue.toFixed(2)}</div>
                </div>
              </div>
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '16px', borderRadius: '12px' }}><Box size={24} color="var(--accent)" /></div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Valor de Inventario</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>${totalInventoryValue.toFixed(2)}</div>
                </div>
              </div>
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '16px', borderRadius: '12px' }}><TrendingUp size={24} color="var(--secondary)" /></div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total de Ventas</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{sales.length} facturas</div>
                </div>
              </div>
            </div>

            <h3 style={{ marginBottom: '16px' }}>Últimas Ventas Realizadas</h3>
            <div className="table-container">
              <table>
                <thead><tr><th>ID</th><th>Fecha</th><th>Cajero</th><th>Artículos</th><th>Total</th></tr></thead>
                <tbody>
                  {sales.slice(0, 10).map(s => (
                    <tr key={s.id}>
                      <td>#{s.id}</td>
                      <td>{new Date(s.createdAt).toLocaleString()}</td>
                      <td>{s.user?.name || 'Desconocido'}</td>
                      <td>{s.items.reduce((acc, item) => acc + item.quantity, 0)} uds</td>
                      <td style={{ color: 'var(--accent)', fontWeight: 'bold' }}>${s.total.toFixed(2)}</td>
                    </tr>
                  ))}
                  {sales.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>No hay ventas registradas</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* === CRUD GENERICO PARA PRODUCTOS, CATEGORIAS Y USUARIOS === */}
        {['products', 'categories', 'users'].includes(activeTab) && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ textTransform: 'capitalize' }}>
                Gestión de {activeTab === 'products' ? 'Productos' : activeTab === 'categories' ? 'Categorías' : 'Empleados'}
              </h2>
              <button className="btn btn-primary" onClick={() => openForm(null)}>
                <Plus size={18} /> Nuevo Registro
              </button>
            </div>

            {showForm && (
              <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', animation: 'fadeIn 0.3s ease' }}>
                <h3>{editingId ? 'Editar' : 'Agregar Nuevo'}</h3>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                  
                  {/* Campos de Productos */}
                  {activeTab === 'products' && (
                    <>
                      <div className="input-group"><label>Nombre</label><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                      <div className="input-group">
                        <label>Categoría</label>
                        <select required value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                          <option value="">Seleccione...</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="input-group"><label>Precio ($)</label><input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} /></div>
                      <div className="input-group"><label>Stock</label><input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} /></div>
                    </>
                  )}

                  {/* Campos de Categorías */}
                  {activeTab === 'categories' && (
                    <div className="input-group" style={{ gridColumn: '1/-1' }}><label>Nombre de la Categoría</label><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                  )}

                  {/* Campos de Usuarios */}
                  {activeTab === 'users' && (
                    <>
                      <div className="input-group"><label>Nombre Real</label><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                      <div className="input-group"><label>Usuario (Login)</label><input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} /></div>
                      <div className="input-group"><label>Contraseña {editingId && '(Dejar en blanco para no cambiar)'}</label><input type="password" required={!editingId} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div>
                      <div className="input-group">
                        <label>Rol</label>
                        <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                          <option value="CASHIER">Cajero</option>
                          <option value="ADMIN">Administrador</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* Campo Descripción compartido para prod y cat */}
                  {['products', 'categories'].includes(activeTab) && (
                    <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Descripción</label>
                      <input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>
                  )}

                  <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button>
                    <button type="submit" className="btn btn-primary">Guardar</button>
                  </div>
                </form>
              </div>
            )}

            <div className="table-container">
              <table>
                <thead>
                  {activeTab === 'products' && <tr><th>ID</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Acciones</th></tr>}
                  {activeTab === 'categories' && <tr><th>ID</th><th>Nombre</th><th>Descripción</th><th>Acciones</th></tr>}
                  {activeTab === 'users' && <tr><th>Usuario</th><th>Nombre Real</th><th>Rol</th><th>Creado</th><th>Acciones</th></tr>}
                </thead>
                <tbody>
                  {activeTab === 'products' && products.map(p => (
                    <tr key={p.id}>
                      <td>#{p.id}</td><td>{p.name}</td><td>{p.category?.name}</td><td style={{ color: 'var(--accent)', fontWeight: '600' }}>${p.price.toFixed(2)}</td>
                      <td><span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.85rem', background: p.stock > 10 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: p.stock > 10 ? 'var(--accent)' : 'var(--danger)' }}>{p.stock} uds</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}><button className="btn btn-outline" style={{ padding: '8px' }} onClick={() => openForm(p)}><Edit size={16} /></button><button className="btn btn-danger" style={{ padding: '8px' }} onClick={() => handleDelete(p.id)}><Trash2 size={16} /></button></div>
                      </td>
                    </tr>
                  ))}
                  
                  {activeTab === 'categories' && categories.map(c => (
                    <tr key={c.id}>
                      <td>#{c.id}</td><td>{c.name}</td><td>{c.description || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}><button className="btn btn-outline" style={{ padding: '8px' }} onClick={() => openForm(c)}><Edit size={16} /></button><button className="btn btn-danger" style={{ padding: '8px' }} onClick={() => handleDelete(c.id)}><Trash2 size={16} /></button></div>
                      </td>
                    </tr>
                  ))}

                  {activeTab === 'users' && users.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 'bold' }}>@{u.username}</td><td>{u.name}</td>
                      <td><span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.85rem', background: u.role === 'ADMIN' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: u.role === 'ADMIN' ? 'var(--primary)' : 'var(--accent)' }}>{u.role === 'ADMIN' ? 'Admin' : 'Cajero'}</span></td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-outline" style={{ padding: '8px' }} onClick={() => openForm(u)}><Edit size={16} /></button>
                          {user.id !== u.id && <button className="btn btn-danger" style={{ padding: '8px' }} onClick={() => handleDelete(u.id)}><Trash2 size={16} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* === TAB: BITÁCORA === */}
        {activeTab === 'logs' && (
          <div>
            <h2 style={{ marginBottom: '24px' }}>Bitácora del Sistema</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Fecha y Hora</th>
                    <th>Usuario</th>
                    <th>Acción</th>
                    <th>Entidad</th>
                    <th>Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleString()}</td>
                      <td style={{ fontWeight: '600' }}>{log.user ? log.user.name : 'Sistema'}</td>
                      <td>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold',
                          background: log.action === 'CREATE' ? 'rgba(16, 185, 129, 0.2)' : 
                                      log.action === 'DELETE' ? 'rgba(239, 68, 68, 0.2)' : 
                                      log.action === 'UPDATE' ? 'rgba(59, 130, 246, 0.2)' : 
                                      'rgba(139, 92, 246, 0.2)',
                          color: log.action === 'CREATE' ? 'var(--accent)' : 
                                 log.action === 'DELETE' ? 'var(--danger)' : 
                                 log.action === 'UPDATE' ? '#3b82f6' : 
                                 'var(--secondary)'
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.9rem' }}>{log.entity}</td>
                      <td>{log.details}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>No hay registros en la bitácora</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
