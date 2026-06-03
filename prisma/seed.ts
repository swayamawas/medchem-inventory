import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Hash passwords
  const adminPasswordHash = await bcrypt.hash("AdminPass123", 10);
  const sellerPasswordHash = await bcrypt.hash("SellerPass123", 10);

  // Seed Users
  const admin = await prisma.user.upsert({
    where: { email: "admin@aasamedchem.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@aasamedchem.com",
      password: adminPasswordHash,
      role: "ADMIN",
    },
  });

  const seller = await prisma.user.upsert({
    where: { email: "seller@aasamedchem.com" },
    update: {},
    create: {
      name: "Seller User",
      email: "seller@aasamedchem.com",
      password: sellerPasswordHash,
      role: "SELLER",
    },
  });

  console.log("Seeded Users:", { admin: admin.email, seller: seller.email });

  // Seed Products
  const products = [
    {
      name: "Acetone",
      description: "High purity solvent for synthesis and cleaning.",
      category: "Solvents",
      dimensionType: "VOLUME" as const,
      baseUnit: "mL",
      ratePerBaseUnit: 0.5, // ₹500 per L
      stockQuantity: 50000, // 50 Liters
    },
    {
      name: "Sulfuric Acid",
      description: "Concentrated acid (98%) for analytical use.",
      category: "Acids",
      dimensionType: "VOLUME" as const,
      baseUnit: "mL",
      ratePerBaseUnit: 1.2, // ₹1200 per L
      stockQuantity: 20000, // 20 Liters
    },
    {
      name: "Ethanol",
      description: "Absolute ethanol, 99.9% pure for lab applications.",
      category: "Solvents",
      dimensionType: "VOLUME" as const,
      baseUnit: "mL",
      ratePerBaseUnit: 1.0, // ₹1000 per L
      stockQuantity: 100000, // 100 Liters
    },
    {
      name: "Sodium Chloride",
      description: "Analytical grade salt for solution preparation.",
      category: "Salts",
      dimensionType: "WEIGHT" as const,
      baseUnit: "g",
      ratePerBaseUnit: 0.6, // ₹600 per kg
      stockQuantity: 10000, // 10 kg
    },
    {
      name: "Glass Beakers (500mL)",
      description: "Heat-resistant borosilicate glass beakers.",
      category: "Labware",
      dimensionType: "COUNT" as const,
      baseUnit: "item",
      ratePerBaseUnit: 150.0, // ₹150 per beaker
      stockQuantity: 200, // 200 items
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { name: product.name },
      update: {
        description: product.description,
        category: product.category,
        dimensionType: product.dimensionType,
        baseUnit: product.baseUnit,
        ratePerBaseUnit: product.ratePerBaseUnit,
        stockQuantity: product.stockQuantity,
      },
      create: product,
    });
  }

  console.log("Seeded Products successfully.");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
