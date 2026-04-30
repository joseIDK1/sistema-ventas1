const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

async function seed() {
  console.log('Sembrando categorías...');
  for (const cat of defaultCategories) {
    // Upsert para no duplicarlas si ya existen o corren el script dos veces
    const existing = await prisma.category.findFirst({ where: { name: cat.name } });
    if (!existing) {
      await prisma.category.create({ data: cat });
      console.log(`Categoría agregada: ${cat.name}`);
    } else {
      console.log(`Categoría ya existe: ${cat.name}`);
    }
  }
  console.log('¡Categorías inicializadas con éxito!');
}

seed()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
