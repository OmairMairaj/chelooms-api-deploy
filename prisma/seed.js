const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding...');

  // --- 1. SETUP CATEGORIES ---
  
  // Fabric Category Check/Create
  let fabricCat = await prisma.inventoryCategory.findFirst({ where: { name: 'Fabrics' } });
  if (!fabricCat) {
    console.log('📦 Creating Fabrics Category...');
    fabricCat = await prisma.inventoryCategory.create({
      data: {
        name: 'Fabrics',
        type: 'FABRIC', // Enum value must match schema
        description: 'Premium quality fabrics for your designs'
      }
    });
  }

  // Embellishment Category Check/Create
  let embellishCat = await prisma.inventoryCategory.findFirst({ where: { name: 'Embellishments' } });
  if (!embellishCat) {
    console.log('✨ Creating Embellishments Category...');
    embellishCat = await prisma.inventoryCategory.create({
      data: {
        name: 'Embellishments',
        type: 'EMBELLISHMENT', // Enum value must match schema
        description: 'Buttons, Laces, and Motifs'
      }
    });
  }

  // --- 2. SEED FABRICS (50 Items) ---
  console.log('🧵 Seeding 50 Fabrics...');
  const fabricColors = ['Crimson', 'Navy', 'Emerald', 'Black', 'White', 'Gold', 'Silver', 'Maroon'];
  const fabricTypes = ['Silk', 'Cotton', 'Velvet', 'Linen', 'Chiffon'];

  for (let i = 1; i <= 50; i++) {
    const color = fabricColors[i % fabricColors.length];
    const material = fabricTypes[i % fabricTypes.length];
    
    await prisma.inventoryItem.create({
      data: {
        categoryId: fabricCat.id, // Using dynamic ID
        name: `Premium ${color} ${material}`,
        description: `High-quality ${material} fabric.`,
        price: Math.floor(Math.random() * (5000 - 1000 + 1)) + 1000,
        stockQuantity: Math.floor(Math.random() * (200 - 20 + 1)) + 20,
        colorName: color,
        images: {
          thumbnail: `https://via.placeholder.com/600x600/CCCCCC/333333?text=${color}+${material}`,
          gallery: [`https://via.placeholder.com/600x600/CCCCCC/333333?text=${color}+${material}+View`]
        }
      }
    });
  }

  // --- 3. SEED EMBELLISHMENTS (50 Items) ---
  console.log('💎 Seeding 50 Embellishments...');
  const embTypes = ['Button', 'Tassel', 'Lace', 'Motif', 'Border'];
  
  for (let i = 1; i <= 50; i++) {
    const color = fabricColors[i % fabricColors.length]; // Reusing colors
    const type = embTypes[i % embTypes.length];

    await prisma.inventoryItem.create({
      data: {
        categoryId: embellishCat.id, // Using dynamic ID
        name: `${color} ${type}`,
        description: `Decorative ${color} ${type}.`,
        price: Math.floor(Math.random() * (500 - 50 + 1)) + 50,
        stockQuantity: Math.floor(Math.random() * (1000 - 100 + 1)) + 100,
        colorName: color,
        images: {
          thumbnail: `https://via.placeholder.com/600x600/FFF8DC/333333?text=${color}+${type}`,
          gallery: [`https://via.placeholder.com/600x600/FFF8DC/333333?text=${color}+${type}+View`]
        }
      }
    });
  }

  console.log('✅ Seeding Complete! Shop is ready.');
}

main()
  .catch((e) => {
    console.error('❌ Error Seeding Data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });