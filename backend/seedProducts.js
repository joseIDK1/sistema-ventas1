const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

async function seed() {
  console.log('Iniciando limpieza y siembra...');

  // 0. Borrar historial de ventas y SaleItems para evitar conflictos de Foreign Keys
  await prisma.saleItem.deleteMany({});
  await prisma.sale.deleteMany({});

  // 1. Eliminar categorías que contengan la palabra "General" o "generales"
  const categoriesToDelete = await prisma.category.findMany({
    where: {
      name: {
        contains: 'General',
      }
    }
  });

  for (const cat of categoriesToDelete) {
    // Primero hay que borrar o reasignar los productos que estén en esta categoría
    await prisma.product.deleteMany({ where: { categoryId: cat.id } });
    await prisma.category.delete({ where: { id: cat.id } });
    console.log(`Eliminada categoría: ${cat.name}`);
  }

  // 2. Traer las categorías actuales para obtener sus IDs
  const categories = await prisma.category.findMany();
  
  if (categories.length === 0) {
    console.log('Error: No hay categorías en la base de datos. Ejecuta seedCategories.js primero.');
    return;
  }

  // 3. Crear productos
  console.log('Agregando productos de simulación...');
  let addedCount = 0;

  for (const prod of sampleProducts) {
    // Buscar la categoría a la que pertenece
    const category = categories.find(c => c.name === prod.categoryName);
    
    if (category) {
      // Usar upsert para no duplicar si el script se corre 2 veces
      await prisma.product.upsert({
        where: { name: prod.name }, // requiere que name sea unique o podemos simplemente crear si no existe
        update: {},
        create: {
          name: prod.name,
          description: prod.description,
          price: prod.price,
          stock: prod.stock,
          categoryId: category.id
        }
      }).catch(async (e) => {
        // Fallback si "name" no es unique en el esquema
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
          addedCount++;
        }
      });
      console.log(`Procesado: ${prod.name}`);
    } else {
      console.log(`Advertencia: Categoría no encontrada para ${prod.name}`);
    }
  }

  console.log(`¡Proceso terminado con éxito!`);
}

seed()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
