"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  convertToBaseUnit,
  convertRateToPerBaseUnit,
  calculatePrice,
  getBaseUnit,
  DimensionType,
} from "@/utils/conversions";
import { revalidatePath } from "next/cache";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function createProductAction(data: {
  name: string;
  description: string;
  category: string;
  dimensionType: DimensionType;
  displayUnit: string;
  displayRate: number;
  displayStock: number;
}) {
  try {
    const baseUnit = getBaseUnit(data.dimensionType);
    const ratePerBaseUnit = convertRateToPerBaseUnit(data.displayRate, data.displayUnit);
    const stockQuantity = convertToBaseUnit(data.displayStock, data.displayUnit);

    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        dimensionType: data.dimensionType,
        baseUnit,
        ratePerBaseUnit,
        stockQuantity,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/seller");
    return { success: true, product };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("Error in createProductAction:", message);
    return { success: false, error: message || "Failed to create product" };
  }
}

export async function updateProductAction(data: {
  id: string;
  name: string;
  description: string;
  category: string;
  dimensionType: DimensionType;
  displayUnit: string;
  displayRate: number;
  displayStock: number;
}) {
  try {
    const baseUnit = getBaseUnit(data.dimensionType);
    const ratePerBaseUnit = convertRateToPerBaseUnit(data.displayRate, data.displayUnit);
    const stockQuantity = convertToBaseUnit(data.displayStock, data.displayUnit);

    const product = await prisma.product.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        dimensionType: data.dimensionType,
        baseUnit,
        ratePerBaseUnit,
        stockQuantity,
      },
    });

    revalidatePath("/admin");
    revalidatePath("/seller");
    return { success: true, product };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("Error in updateProductAction:", message);
    return { success: false, error: message || "Failed to update product" };
  }
}

export async function deleteProductAction(id: string) {
  try {
    await prisma.product.delete({
      where: { id },
    });

    revalidatePath("/admin");
    revalidatePath("/seller");
    return { success: true };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("Error in deleteProductAction:", message);
    return { success: false, error: message || "Failed to delete product" };
  }
}

export async function placeOrderAction(
  userId: string,
  items: { productId: string; enteredQuantity: number; enteredUnit: string }[]
) {
  try {
    if (items.length === 0) {
      throw new Error("Cannot place an empty order");
    }

    let totalPrice = 0;
    const orderItemsData: Prisma.OrderItemCreateWithoutOrderInput[] = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new Error(`Product not found`);
      }

      const quantityInBaseUnit = convertToBaseUnit(item.enteredQuantity, item.enteredUnit);
      
      // Check stock availability
      if (Number(product.stockQuantity) < quantityInBaseUnit) {
        const factor = item.enteredUnit === 'kg' || item.enteredUnit === 'L' ? 1000 : 1;
        const displayAvailable = Number(product.stockQuantity) / factor;
        throw new Error(`Insufficient stock for ${product.name}. Available: ${displayAvailable} ${item.enteredUnit}`);
      }

      const calculatedPrice = calculatePrice(quantityInBaseUnit, Number(product.ratePerBaseUnit));
      totalPrice += calculatedPrice;

      orderItemsData.push({
        product: {
          connect: { id: item.productId },
        },
        enteredQuantity: item.enteredQuantity,
        enteredUnit: item.enteredUnit,
        quantityInBaseUnit,
        calculatedPrice,
      });
    }

    // Create order and order items in a transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          status: "PENDING",
          totalPrice,
          items: {
            create: orderItemsData,
          },
        },
      });

      return newOrder;
    });

    revalidatePath("/admin");
    revalidatePath("/seller");
    return { success: true, orderId: order.id };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("Error in placeOrderAction:", message);
    return { success: false, error: message || "Failed to place order" };
  }
}

export async function updateOrderStatusAction(orderId: string, status: "APPROVED" | "REJECTED") {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status !== "PENDING") {
      throw new Error(`Order has already been ${order.status.toLowerCase()}`);
    }

    if (status === "APPROVED") {
      // Perform database transaction to deduct stock and update status
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!product) {
            throw new Error(`Product ${item.productId} not found`);
          }

          const currentStock = Number(product.stockQuantity);
          const quantityToDeduct = Number(item.quantityInBaseUnit);

          if (currentStock < quantityToDeduct) {
            throw new Error(`Insufficient stock for product ${product.name}`);
          }

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: currentStock - quantityToDeduct,
            },
          });
        }

        await tx.order.update({
          where: { id: orderId },
          data: { status: "APPROVED" },
        });
      });
    } else {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "REJECTED" },
      });
    }

    revalidatePath("/admin");
    revalidatePath("/seller");
    return { success: true };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("Error in updateOrderStatusAction:", message);
    return { success: false, error: message || "Failed to update order status" };
  }
}
