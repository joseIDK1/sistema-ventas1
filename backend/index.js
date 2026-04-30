const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// --- FUNCIÓN DE BITÁCORA ---
async function logAction(userId, action, entity, details) {
  try {
    await prisma.systemLog.create({
      data: {
        userId: userId ? parseInt(userId) : null,
        action,
        entity,
        details
      }
    });
  } catch (error) {
    console.error("Error al guardar en bitácora:", error);
  }
}

// --- AUTENTICACIÓN ---
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    await logAction(user.id, 'LOGIN', 'SYSTEM', `Usuario ${user.username} inició sesión`);
    res.json({ id: user.id, name: user.name, role: user.role });
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// --- BITÁCORA (NUEVO ENDPOINT) ---
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await prisma.systemLog.findMany({
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100 // Solo los últimos 100 por rendimiento
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo bitácora' });
  }
});

// --- USUARIOS ---
app.post('/api/setup', async (req, res) => {
  try {
    await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: { name: 'Administrador', username: 'admin', password: '123', role: 'ADMIN' }
    });
    
    await prisma.user.upsert({
      where: { username: 'cajero' },
      update: {},
      create: { name: 'Cajero General', username: 'cajero', password: '123', role: 'CASHIER' }
    });

    res.json({ message: 'Usuarios creados correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  const users = await prisma.user.findMany({ select: { id: true, name: true, username: true, role: true, createdAt: true } });
  res.json(users);
});

app.post('/api/users', async (req, res) => {
  const { name, username, password, role, adminId } = req.body;
  try {
    const user = await prisma.user.create({ data: { name, username, password, role } });
    await logAction(adminId, 'CREATE', 'USER', `Creó al usuario: ${username} (${role})`);
    res.json({ id: user.id, name: user.name, role: user.role });
  } catch(error) { res.status(400).json({error: 'Error al crear usuario'}); }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, username, password, role, adminId } = req.body;
  try {
    const data = { name, username, role };
    if (password) data.password = password;
    
    const user = await prisma.user.update({ where: { id: parseInt(id) }, data });
    await logAction(adminId, 'UPDATE', 'USER', `Actualizó al usuario ID: ${id}`);
    res.json({ id: user.id, name: user.name, role: user.role });
  } catch (error) { res.status(400).json({error: 'Error al actualizar usuario'}); }
});

app.delete('/api/users/:id', async (req, res) => {
  const { adminId } = req.body;
  await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
  await logAction(adminId, 'DELETE', 'USER', `Eliminó al usuario ID: ${req.params.id}`);
  res.json({ message: 'Usuario eliminado' });
});

// --- CATEGORÍAS ---
app.get('/api/categories', async (req, res) => {
  const categories = await prisma.category.findMany();
  res.json(categories);
});

app.post('/api/categories', async (req, res) => {
  const { name, description, adminId } = req.body;
  const category = await prisma.category.create({ data: { name, description } });
  await logAction(adminId, 'CREATE', 'CATEGORY', `Creó la categoría: ${name}`);
  res.json(category);
});

app.put('/api/categories/:id', async (req, res) => {
  const { name, description, adminId } = req.body;
  const category = await prisma.category.update({
    where: { id: parseInt(req.params.id) },
    data: { name, description }
  });
  await logAction(adminId, 'UPDATE', 'CATEGORY', `Actualizó la categoría: ${name}`);
  res.json(category);
});

app.delete('/api/categories/:id', async (req, res) => {
  const { adminId } = req.body; // Requiere que el front envíe adminId incluso en DELETE si se usa { data: { adminId } } en axios
  await prisma.category.delete({ where: { id: parseInt(req.params.id) } });
  await logAction(adminId, 'DELETE', 'CATEGORY', `Eliminó la categoría ID: ${req.params.id}`);
  res.json({ message: 'Categoría eliminada' });
});

// --- PRODUCTOS ---
app.get('/api/products', async (req, res) => {
  const products = await prisma.product.findMany({ include: { category: true } });
  res.json(products);
});

app.post('/api/products', async (req, res) => {
  const { name, description, price, stock, categoryId, adminId } = req.body;
  const product = await prisma.product.create({
    data: { name, description, price: parseFloat(price), stock: parseInt(stock), categoryId: parseInt(categoryId) }
  });
  await logAction(adminId, 'CREATE', 'PRODUCT', `Creó el producto: ${name} (Stock: ${stock})`);
  res.json(product);
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, price, stock, categoryId, adminId } = req.body;
  const product = await prisma.product.update({
    where: { id: parseInt(id) },
    data: { name, description, price: parseFloat(price), stock: parseInt(stock), categoryId: parseInt(categoryId) }
  });
  await logAction(adminId, 'UPDATE', 'PRODUCT', `Actualizó el producto: ${name}`);
  res.json(product);
});

app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { adminId } = req.body;
  await prisma.product.delete({ where: { id: parseInt(id) } });
  await logAction(adminId, 'DELETE', 'PRODUCT', `Eliminó el producto ID: ${id}`);
  res.json({ message: 'Producto eliminado' });
});

// --- VENTAS ---
app.post('/api/sales', async (req, res) => {
  const { userId, items, paymentMethod = 'CASH' } = req.body;
  
  try {
    const total = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);

    const sale = await prisma.sale.create({
      data: {
        userId: parseInt(userId),
        total: parseFloat(total),
        paymentMethod: paymentMethod,
        items: {
          create: items.map(item => ({
            productId: parseInt(item.productId),
            quantity: parseInt(item.quantity),
            price: parseFloat(item.price)
          }))
        }
      },
      include: { items: true }
    });

    for (const item of items) {
      await prisma.product.update({
        where: { id: parseInt(item.productId) },
        data: { stock: { decrement: parseInt(item.quantity) } }
      });
    }

    await logAction(userId, 'CREATE', 'SALE', `Registró venta #${sale.id} por $${total.toFixed(2)} (${paymentMethod})`);

    res.json(sale);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sales', async (req, res) => {
  const sales = await prisma.sale.findMany({ 
    include: { items: { include: { product: true } }, user: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(sales);
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;
