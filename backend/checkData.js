const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.count();
  const categories = await prisma.category.count();
  const products = await prisma.product.count();
  const logs = await prisma.systemLog.count();

  console.log(`Usuarios: ${users}`);
  console.log(`Categorías: ${categories}`);
  console.log(`Productos: ${products}`);
  console.log(`Logs: ${logs}`);
}

check()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
