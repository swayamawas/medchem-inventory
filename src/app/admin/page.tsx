import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminDashboard from "./AdminDashboard";

export const revalidate = 0; // Disable caching

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
console.log("ADMIN SESSION:", JSON.stringify(session, null, 2));
 if (!session) {
  redirect("/auth/signin");
}

  // Fetch products
  const productsRaw = await prisma.product.findMany({
    orderBy: { name: "asc" },
  });

  const products = productsRaw.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || "",
    category: p.category,
    dimensionType: p.dimensionType,
    baseUnit: p.baseUnit,
    ratePerBaseUnit: Number(p.ratePerBaseUnit),
    stockQuantity: Number(p.stockQuantity),
  }));

  // Fetch orders
  const ordersRaw = await prisma.order.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const orders = ordersRaw.map((o) => ({
    id: o.id,
    userId: o.userId,
    userName: o.user.name,
    userEmail: o.user.email,
    status: o.status,
    totalPrice: Number(o.totalPrice),
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((i) => ({
      id: i.id,
      productName: i.product.name,
      dimensionType: i.product.dimensionType,
      enteredQuantity: Number(i.enteredQuantity),
      enteredUnit: i.enteredUnit,
      quantityInBaseUnit: Number(i.quantityInBaseUnit),
      calculatedPrice: Number(i.calculatedPrice),
      baseUnit: i.product.baseUnit,
      ratePerBaseUnit: Number(i.product.ratePerBaseUnit),
    })),
  }));

  return (
    <AdminDashboard
      initialProducts={products}
      initialOrders={orders}
      user={session.user}
    />
  );
}
