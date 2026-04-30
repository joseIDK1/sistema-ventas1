import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingCart, Search, CreditCard, LogOut, Plus, Minus, Trash2, Printer, CheckCircle, LayoutDashboard, History, Banknote } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000/api`;

function CashierPanel({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' or 'history'
  
  // POS States
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  
  // Payment Modal States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Receipt States
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  // History States
  const [mySales, setMySales] = useState([]);
  
  // Toast State
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      if (activeTab === 'pos') {
        const [prodRes, catRes] = await Promise.all([
          axios.get(`${API_URL}/products`),
          axios.get(`${API_URL}/categories`)
        ]);
        setProducts(prodRes.data);
        setCategories(catRes.data);
      } else if (activeTab === 'history') {
        const salesRes = await axios.get(`${API_URL}/sales`);
        // Filter sales to only show those made by the current cashier
        const personalSales = salesRes.data.filter(s => s.userId === user.id);
        setMySales(personalSales);
      }
    } catch (error) {
      console.error("Error fetching data");
    }
  };

  // --- CART LOGIC ---
  const addToCart = (product) => {
    if (product.stock <= 0) return alert("Producto sin stock");
    setCart(currentCart => {
      const existing = currentCart.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert("No hay más stock disponible");
          return currentCart;
        }
        return currentCart.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...currentCart, { product, quantity: 1, price: product.price }];
    });
    
    // Mostrar precio del producto agregado
    setToastMessage(`Agregado: ${product.name} - $${product.price.toFixed(2)}`);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const updateQuantity = (productId, change) => {
    setCart(currentCart => {
      return currentCart.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + change;
          if (newQty <= 0) return null;
          if (newQty > item.product.stock) return item;
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (productId) => setCart(current => current.filter(item => item.product.id !== productId));
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // --- CHECKOUT LOGIC ---
  const processCheckout = async (paymentMethod) => {
    setIsProcessing(true);
    try {
      const items = cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.price
      }));
      
      const res = await axios.post(`${API_URL}/sales`, { 
        userId: user.id, 
        items,
        paymentMethod
      });
      
      setLastSale({ ...res.data, cart: [...cart] });
      setShowPaymentModal(false);
      setShowReceipt(true);
      setCart([]);
      fetchData(); // Refresh stock
    } catch (error) {
      alert("Error al procesar la venta");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadReceipt = (saleData) => {
    // Calculamos el alto aproximado del ticket
    const itemsList = saleData.cart || saleData.items;
    const ticketHeight = 110 + (itemsList.length * 6);
    
    // Formato de rollo térmico estándar (80mm de ancho)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, ticketHeight]
    });
    
    // Fuente monospace típica de tickets
    doc.setFont('courier', 'normal');
    
    const centerText = (text, y) => {
      const textWidth = doc.getStringUnitWidth(text) * doc.internal.getFontSize() / doc.internal.scaleFactor;
      const textOffset = (80 - textWidth) / 2;
      doc.text(text, textOffset, y);
    }

    const drawDashedLine = (y) => {
      doc.text("-".repeat(31), 40, y, null, null, "center");
    }

    let y = 12;
    
    // ENCABEZADO
    doc.setFont('courier', 'bold');
    doc.setFontSize(14);
    centerText("MI SUPERMERCADO", y);
    
    y += 5;
    doc.setFont('courier', 'normal');
    doc.setFontSize(9);
    centerText("Sucursal Centro", y);
    y += 4;
    centerText("NIT: 0000-000000-000-0", y);
    
    y += 6;
    drawDashedLine(y);
    
    // DATOS FACTURA
    y += 6;
    doc.text(`TICKET NO: ${saleData.id.toString().padStart(6, '0')}`, 4, y);
    y += 5;
    doc.text(`FECHA: ${new Date(saleData.createdAt).toLocaleDateString()}`, 4, y);
    y += 5;
    doc.text(`HORA: ${new Date(saleData.createdAt).toLocaleTimeString()}`, 4, y);
    y += 5;
    doc.text(`CAJERO: ${user.name.substring(0, 15)}`, 4, y);
    
    y += 6;
    drawDashedLine(y);
    
    // ENCABEZADO TABLA
    y += 6;
    doc.setFont('courier', 'bold');
    doc.text("CANT DESCRIPCION       TOTAL", 4, y);
    
    y += 4;
    doc.setFont('courier', 'normal');
    drawDashedLine(y);
    
    // PRODUCTOS
    y += 6;
    itemsList.forEach(item => {
      const qty = item.quantity.toString().padEnd(4, ' ');
      const name = item.product.name.substring(0, 16).padEnd(17, ' ');
      const lineTotal = `$${(item.quantity * item.price).toFixed(2)}`.padStart(7, ' ');
      
      doc.text(`${qty} ${name} ${lineTotal}`, 4, y);
      y += 5;
    });
    
    y += 2;
    drawDashedLine(y);
    
    // TOTALES
    y += 6;
    doc.text("SUBTOTAL:", 4, y);
    doc.text(`$${saleData.total.toFixed(2)}`, 76, y, null, null, "right");
    
    y += 6;
    doc.setFont('courier', 'bold');
    doc.setFontSize(11);
    doc.text("TOTAL A PAGAR:", 4, y);
    doc.text(`$${saleData.total.toFixed(2)}`, 76, y, null, null, "right");
    
    y += 6;
    doc.setFont('courier', 'normal');
    doc.setFontSize(9);
    doc.text(`PAGO CON: ${saleData.paymentMethod === 'CARD' ? 'TARJETA' : 'EFECTIVO'}`, 4, y);
    
    y += 8;
    drawDashedLine(y);
    
    // PIE DE PAGINA
    y += 8;
    centerText("¡GRACIAS POR SU COMPRA!", y);
    y += 5;
    centerText("VUELVA PRONTO", y);

    // Descargar el PDF
    doc.save(`Ticket_${saleData.id.toString().padStart(6, '0')}.pdf`);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'all' || p.categoryId === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="app-container animate-fade-in">
      
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', background: 'var(--primary)', color: 'white', padding: '16px 24px', borderRadius: '12px', zIndex: 9999, animation: 'fadeIn 0.3s', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CheckCircle size={20} />
          {toastMessage}
        </div>
      )}

      {/* SIDEBAR */}
      <div className="sidebar glass-panel no-print" style={{ borderRadius: 0, borderTop: 0, borderBottom: 0, borderLeft: 0 }}>
        <div style={{ marginBottom: '32px' }}>
          <h2 className="text-gradient">CloudPOS</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Panel de Cajero</p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <button className={`btn ${activeTab === 'pos' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('pos')}>
            <ShoppingCart size={18} /> Punto de Venta
          </button>
          <button className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-outline'}`} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('history')}>
            <History size={18} /> Mis Ventas
          </button>
        </nav>

        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' }}>
              {user.name.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: '600' }}>{user.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cajero</div>
            </div>
          </div>
          <button className="btn btn-outline" style={{ width: '100%', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={onLogout}>
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="main-content" style={{ padding: 0 }}>
        
        {/* === TAB: PUNTO DE VENTA === */}
        {activeTab === 'pos' && (
          <div style={{ display: 'flex', height: '100%' }}>
            {/* Catalogo de Productos */}
            <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input 
                    placeholder="Buscar producto por nombre..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: '40px', width: '100%', borderRadius: '12px', padding: '10px 40px' }}
                  />
                </div>
              </div>

              {/* Filtros de Categorías */}
              <div className="glass-panel" style={{ padding: '12px', display: 'flex', gap: '12px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                <button className={`btn ${activeCategory === 'all' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveCategory('all')} style={{ borderRadius: '20px', padding: '6px 16px' }}>
                  Todas
                </button>
                {categories.map(c => (
                  <button key={c.id} className={`btn ${activeCategory === c.id ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveCategory(c.id)} style={{ borderRadius: '20px', padding: '6px 16px' }}>
                    {c.name}
                  </button>
                ))}
              </div>

              {/* Grilla de Productos */}
              <div className="products-grid">
                {filteredProducts.map(p => (
                  <div key={p.id} className="product-card glass-panel" onClick={() => addToCart(p)} style={{ opacity: p.stock > 0 ? 1 : 0.5 }}>
                    <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{p.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.category?.name || 'General'}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                      <div style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '1.2rem' }}>${p.price.toFixed(2)}</div>
                      <div style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '10px' }}>Stock: {p.stock}</div>
                    </div>
                  </div>
                ))}
                {filteredProducts.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No se encontraron productos</div>}
              </div>
            </div>

            {/* Carrito Lateral Derecho */}
            <div className="glass-panel cart-panel" style={{ width: '380px', borderRadius: 0, borderTop: 0, borderBottom: 0, borderRight: 0, display: 'flex', flexDirection: 'column', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
                <ShoppingCart size={24} color="var(--primary)" />
                <h3 style={{ margin: 0 }}>Ticket de Venta</h3>
              </div>

              <div className="cart-items" style={{ flex: 1, overflowY: 'auto', margin: '16px 0' }}>
                {cart.length === 0 ? (
                  <div style={{ margin: 'auto', color: 'var(--text-muted)', textAlign: 'center', paddingTop: '40px' }}>
                    <ShoppingCart size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                    <p>Agrega productos al carrito</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.product.id} className="cart-item" style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600' }}>{item.product.name}</div>
                        <div style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>${item.price.toFixed(2)} c/u</div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '20px' }}>
                          <button onClick={() => updateQuantity(item.product.id, -1)} style={{ background: 'none', border: 'none', color: 'white', padding: '4px 8px', cursor: 'pointer' }}><Minus size={14} /></button>
                          <span style={{ fontSize: '0.9rem', width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product.id, 1)} style={{ background: 'none', border: 'none', color: 'white', padding: '4px 8px', cursor: 'pointer' }}><Plus size={14} /></button>
                        </div>
                        <div style={{ fontWeight: 'bold', width: '60px', textAlign: 'right' }}>${(item.price * item.quantity).toFixed(2)}</div>
                        <button onClick={() => removeFromCart(item.product.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="cart-total" style={{ borderTop: '2px dashed var(--glass-border)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-muted)' }}><span>Subtotal</span><span>${total.toFixed(2)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '1.5rem', fontWeight: 'bold' }}><span>Total</span><span style={{ color: 'var(--accent)' }}>${total.toFixed(2)}</span></div>
                
                <button className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.2rem', gap: '12px' }} onClick={() => setShowPaymentModal(true)} disabled={cart.length === 0}>
                  <CreditCard size={24} /> Cobrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* === TAB: MIS VENTAS (HISTORIAL) === */}
        {activeTab === 'history' && (
          <div style={{ padding: '32px' }}>
            <h2 style={{ marginBottom: '24px' }}>Mi Historial de Ventas</h2>
            <div className="table-container">
              <table>
                <thead><tr><th>No. Factura</th><th>Fecha y Hora</th><th>Método de Pago</th><th>Artículos</th><th>Total</th><th>Acción</th></tr></thead>
                <tbody>
                  {mySales.map(s => (
                    <tr key={s.id}>
                      <td>#{s.id}</td>
                      <td>{new Date(s.createdAt).toLocaleString()}</td>
                      <td>
                        <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.85rem', background: s.paymentMethod === 'CARD' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: s.paymentMethod === 'CARD' ? 'var(--primary)' : 'var(--accent)' }}>
                          {s.paymentMethod === 'CARD' ? 'Tarjeta' : 'Efectivo'}
                        </span>
                      </td>
                      <td>{s.items.reduce((acc, item) => acc + item.quantity, 0)} uds</td>
                      <td style={{ color: 'var(--accent)', fontWeight: 'bold' }}>${s.total.toFixed(2)}</td>
                      <td>
                        <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => downloadReceipt(s)}>
                          <Printer size={14} style={{ marginRight: '6px' }} /> Ver Factura PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                  {mySales.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>No has realizado ninguna venta hoy.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '400px', padding: '32px', textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
            <h2 style={{ marginBottom: '8px' }}>Método de Pago</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Total a cobrar: <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '1.2rem' }}>${total.toFixed(2)}</span></p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <button 
                className="btn btn-outline" 
                style={{ flexDirection: 'column', padding: '24px', height: 'auto', gap: '12px', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                onClick={() => processCheckout('CASH')}
                disabled={isProcessing}
              >
                <Banknote size={40} />
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Efectivo</span>
              </button>
              
              <button 
                className="btn btn-outline" 
                style={{ flexDirection: 'column', padding: '24px', height: 'auto', gap: '12px', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                onClick={() => processCheckout('CARD')}
                disabled={isProcessing}
              >
                <CreditCard size={40} />
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Tarjeta</span>
              </button>
            </div>
            
            <button className="btn" style={{ width: '100%', background: 'transparent', color: 'var(--text-muted)' }} onClick={() => setShowPaymentModal(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL (Success Download) */}
      {showReceipt && lastSale && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ background: '#fff', color: '#000', width: '350px', padding: '32px', borderRadius: '12px', animation: 'fadeIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <CheckCircle size={48} color="var(--accent)" style={{ margin: '0 auto 16px' }} />
              <h2 style={{ color: '#000', margin: 0 }}>¡Venta Exitosa!</h2>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>Factura #{lastSale.id}</p>
              <p style={{ color: '#666', fontSize: '0.8rem' }}>{new Date(lastSale.createdAt).toLocaleString()}</p>
            </div>

            <div style={{ borderTop: '2px dashed #ccc', borderBottom: '2px dashed #ccc', padding: '16px 0', marginBottom: '24px' }}>
              {lastSale.cart.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                  <span style={{ flex: 1 }}>{item.quantity}x {item.product.name}</span>
                  <span style={{ fontWeight: '600' }}>${(item.quantity * item.price).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '32px' }}>
              <span>TOTAL</span>
              <span>${lastSale.total.toFixed(2)}</span>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '24px', fontSize: '0.9rem', color: '#666', padding: '8px', background: '#f8fafc', borderRadius: '8px' }}>
              Pagado con: <strong>{lastSale.paymentMethod === 'CARD' ? 'Tarjeta 💳' : 'Efectivo 💵'}</strong>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn" style={{ flex: 1, background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1' }} onClick={() => setShowReceipt(false)}>
                Cerrar
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => downloadReceipt(lastSale)}>
                <Printer size={18} /> Descargar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CashierPanel;
