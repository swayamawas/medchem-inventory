import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SellerDashboard from "./SellerDashboard";

export const revalidate = 0; // Disable caching

export default async function SellerPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "SELLER") {
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

  // Fetch orders placed by this seller
  const ordersRaw = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: {
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
    status: o.status,
    totalPrice: Number(o.totalPrice),
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((i) => ({
      id: i.id,
      productName: i.product.name,
      enteredQuantity: Number(i.enteredQuantity),
      enteredUnit: i.enteredUnit,
      quantityInBaseUnit: Number(i.quantityInBaseUnit),
      calculatedPrice: Number(i.calculatedPrice),
      baseUnit: i.product.baseUnit,
      ratePerBaseUnit: Number(i.product.ratePerBaseUnit),
    })),
  }));

  return (
    <SellerDashboard
      initialProducts={products}
      initialOrders={orders}
      user={session.user}
    />
  );
}
