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

// --- SEMBRAR TODO ---
app.post('/api/seed-all', async (req, res) => {
  try {
    const defaultCategories = [
      { name: 'Bebidas', description: 'Gaseosas, jugos, aguas y licores' },
      { name: 'Abarrotes', description: 'Arroz, frijoles, aceite, azúcar, etc.' },
      { name: 'Lácteos', description: 'Leche, queso, crema, yogurt' },
      { name: 'Snacks y Dulces', description: 'Papas, galletas, chocolates' },
      { name: 'Limpieza', description: 'Jabón, cloro, detergentes' },
      { name: 'Cuidado Personal', description: 'Shampoo, desodorante, papel higiénico' },
      { name: 'Carnes y Embutidos', description: 'Pollo, res, salchichas, jamón' },
      { name: 'Frutas y Verduras', description: 'Vegetales frescos' }
    ];

    const sampleProducts = [
      { name: 'Coca Cola 2.5L', description: 'Gaseosa original', price: 2.50, stock: 50, categoryName: 'Bebidas' },
      { name: 'Agua Mineral 1L', description: 'Agua con gas', price: 1.00, stock: 100, categoryName: 'Bebidas' },
      { name: 'Jugo del Valle', description: 'Jugo de manzana', price: 1.25, stock: 40, categoryName: 'Bebidas' },
      { name: 'Arroz San Pedro 1kg', description: 'Arroz blanco entero', price: 1.80, stock: 200, categoryName: 'Abarrotes' },
      { name: 'Frijol Negro 1kg', description: 'Frijol empacado', price: 2.10, stock: 150, categoryName: 'Abarrotes' },
      { name: 'Aceite de Girasol 1L', description: 'Aceite vegetal', price: 3.50, stock: 80, categoryName: 'Abarrotes' },
      { name: 'Leche Deslactosada 1L', description: 'Leche de vaca', price: 1.60, stock: 60, categoryName: 'Lácteos' },
      { name: 'Queso Crema 200g', description: 'Para untar', price: 2.20, stock: 35, categoryName: 'Lácteos' },
      { name: 'Papas Lays', description: 'Sabor original', price: 1.50, stock: 120, categoryName: 'Snacks y Dulces' },
      { name: 'Galletas Oreo', description: 'Paquete grande', price: 1.10, stock: 90, categoryName: 'Snacks y Dulces' },
      { name: 'Jabón Zote', description: 'Para lavar ropa', price: 0.90, stock: 300, categoryName: 'Limpieza' },
      { name: 'Cloro 1 Galón', description: 'Desinfectante', price: 4.00, stock: 45, categoryName: 'Limpieza' },
      { name: 'Shampoo Head & Shoulders', description: 'Anticaspa', price: 5.50, stock: 25, categoryName: 'Cuidado Personal' },
      { name: 'Papel Higiénico 4 Rollos', description: 'Doble hoja', price: 2.80, stock: 100, categoryName: 'Cuidado Personal' },
    ];

    for (const cat of defaultCategories) {
      const existing = await prisma.category.findFirst({ where: { name: cat.name } });
      if (!existing) await prisma.category.create({ data: cat });
    }

    const categories = await prisma.category.findMany();
    for (const prod of sampleProducts) {
      const category = categories.find(c => c.name === prod.categoryName);
      if (category) {
        const exists = await prisma.product.findFirst({ where: { name: prod.name } });
        if (!exists) {
          await prisma.product.create({
            data: {
              name: prod.name,
              description: prod.description,
              price: prod.price,
              stock: prod.stock,
              categoryId: category.id
            }
          });
        }
      }
    }

    res.json({ message: 'Base de datos sembrada con productos y categorías exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

module.exports = app;
