"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import { placeOrderAction } from "../actions";
import { UNIT_FACTORS, getUnitsForDimension } from "@/utils/conversions";

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  dimensionType: "WEIGHT" | "VOLUME" | "COUNT";
  baseUnit: string;
  ratePerBaseUnit: number;
  stockQuantity: number;
}

interface OrderItem {
  id: string;
  productName: string;
  enteredQuantity: number;
  enteredUnit: string;
  quantityInBaseUnit: number;
  calculatedPrice: number;
  baseUnit: string;
  ratePerBaseUnit: number;
}

interface Order {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  totalPrice: number;
  createdAt: string;
  items: OrderItem[];
}

interface CartItem {
  product: Product;
  quantity: string;
  unit: string;
}

interface SellerDashboardProps {
  initialProducts: Product[];
  initialOrders: Order[];
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: string;
  };
}

export default function SellerDashboard({
  initialProducts,
  initialOrders,
  user,
}: SellerDashboardProps) {
  const [products] = useState<Product[]>(initialProducts);
  const [orders] = useState<Order[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<"catalog" | "history">("catalog");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderError, setOrderError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Categories list
  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category)))];

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart Handlers
  const addToCart = (product: Product) => {
    const exists = cart.find((item) => item.product.id === product.id);
    if (exists) return; // Already in cart

    // Default units based on dimension
    const defaultUnit =
      product.dimensionType === "WEIGHT"
        ? "kg"
        : product.dimensionType === "VOLUME"
        ? "L"
        : "item";

    setCart([...cart, { product, quantity: "1", unit: defaultUnit }]);
    setOrderSuccess("");
    setOrderError("");
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const updateCartItem = (productId: string, field: "quantity" | "unit", value: string) => {
    setCart(
      cart.map((item) => {
        if (item.product.id === productId) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Real-time calculation helpers for cart item
  const calculateCartItemPrice = (item: CartItem) => {
    const qty = parseFloat(item.quantity);
    if (isNaN(qty) || qty <= 0) return { baseQty: 0, price: 0 };

    const factor = UNIT_FACTORS[item.unit] || 1;
    const baseQty = qty * factor;
    const price = baseQty * item.product.ratePerBaseUnit;

    return { baseQty, price };
  };

  // Total cart price accumulator
  const cartTotal = cart.reduce((sum, item) => {
    const { price } = calculateCartItemPrice(item);
    return sum + price;
  }, 0);

  const handlePlaceOrder = async () => {
    setOrderError("");
    setOrderSuccess("");
    setLoading(true);

    if (cart.length === 0) {
      setOrderError("Your order is empty.");
      setLoading(false);
      return;
    }

    // Format items payload
    const itemsPayload = cart.map((item) => {
      const qty = parseFloat(item.quantity);
      return {
        productId: item.product.id,
        enteredQuantity: isNaN(qty) ? 0 : qty,
        enteredUnit: item.unit,
      };
    });

    const result = await placeOrderAction(user.id, itemsPayload);

    if (result.success && result.orderId) {
      setOrderSuccess(`Quotation placed successfully! Order ID: ${result.orderId.substring(0, 8)}...`);
      setCart([]);
      
      // Fetch updated orders and products
      window.location.reload(); // Quick refresh to update stock and orders
    } else {
      setOrderError(result.error || "Failed to place order.");
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-950 font-sans">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              AasaMedChem
            </span>
            <span className="text-xs px-2.5 py-0.5 bg-cyan-950/60 text-cyan-400 border border-cyan-900/60 rounded-full font-semibold">
              Seller Portal
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 hidden sm:inline">
              Welcome, <strong className="text-slate-200">{user.name || user.email}</strong>
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              className="px-4 py-2 border border-slate-800 hover:border-red-900/40 hover:bg-red-950/20 text-slate-300 hover:text-red-400 text-xs font-semibold rounded-lg transition duration-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-900 pb-4">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 rounded-t-sm transition duration-200 ${
              activeTab === "catalog"
                ? "border-cyan-400 text-cyan-400 bg-cyan-950/10"
                : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
          >
            Browse Chemicals
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 rounded-t-sm transition duration-200 ${
              activeTab === "history"
                ? "border-cyan-400 text-cyan-400 bg-cyan-950/10"
                : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
          >
            My Orders / Quotations
          </button>
        </div>

        {/* Tab 1: Catalog & Checkout Panel */}
        {activeTab === "catalog" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Products Search & List (2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-900/40 border border-slate-900 rounded-2xl">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search chemical products (e.g. Acetone)..."
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition duration-200"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 transition duration-200"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c === "all" ? "All Categories" : c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProducts.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-slate-500 text-sm">
                    No products found matching filters.
                  </div>
                ) : (
                  filteredProducts.map((p) => {
                    const displayUnit = p.dimensionType === "WEIGHT" ? "kg" : p.dimensionType === "VOLUME" ? "L" : "item";
                    const displayRate = p.ratePerBaseUnit * (UNIT_FACTORS[displayUnit] || 1);
                    const displayStock = p.stockQuantity / (UNIT_FACTORS[displayUnit] || 1);
                    const inCart = cart.some((item) => item.product.id === p.id);

                    return (
                      <div
                        key={p.id}
                        className="bg-slate-900/30 border border-slate-900 hover:border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between gap-4 transition duration-200"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="text-base font-bold text-slate-200">{p.name}</h3>
                            <span className="text-3xs px-2 py-0.5 bg-slate-950 border border-slate-850 text-slate-400 rounded-md font-semibold uppercase">
                              {p.category}
                            </span>
                          </div>
                          {p.description && (
                            <p className="text-xs text-slate-400 line-clamp-2">{p.description}</p>
                          )}
                          <div className="pt-2 flex flex-col gap-1">
                            <div className="text-xs text-slate-400">
                              Catalog Price:{" "}
                              <strong className="text-emerald-400 font-mono">
                                ₹{displayRate.toFixed(2)} / {displayUnit}
                              </strong>
                            </div>
                            <div className="text-3xs text-slate-500 font-mono">
                              (Base rate: ₹{p.ratePerBaseUnit.toFixed(4)} / {p.baseUnit})
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-900/60 flex justify-between items-center gap-4">
                          <div className="text-2xs text-slate-400">
                            Available Stock:
                            <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                             {Number(p.stockQuantity).toLocaleString("en-IN")} {p.baseUnit}
                              {p.dimensionType !== "COUNT" && ` (${displayStock.toFixed(2)} ${displayUnit})`}
                            </div>
                          </div>

                          <button
                            onClick={() => addToCart(p)}
                            disabled={inCart || p.stockQuantity <= 0}
                            className={`px-3 py-2 text-2xs font-extrabold rounded-lg transition duration-200 ${
                              inCart
                                ? "bg-slate-900 text-slate-500 border border-slate-850 cursor-default"
                                : p.stockQuantity <= 0
                                ? "bg-red-950/20 text-red-500 border border-red-900/30 cursor-not-allowed"
                                : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md hover:shadow-cyan-500/10"
                            }`}
                          >
                            {inCart ? "In Order" : p.stockQuantity <= 0 ? "Out of Stock" : "Add to Order"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Cart checkout list (1 col) */}
            <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-6 sticky top-24 shadow-xl backdrop-blur-sm">
              <h2 className="text-lg font-bold text-slate-200 mb-6 flex justify-between items-center">
                <span>Order Quotation</span>
                <span className="text-xs px-2.5 py-0.5 bg-slate-950 border border-slate-800 text-slate-400 rounded-full font-bold">
                  {cart.length} items
                </span>
              </h2>

              {orderError && (
                <div className="mb-4 p-3 bg-red-950/40 border border-red-900/60 text-xs text-red-400 rounded-xl text-center">
                  {orderError}
                </div>
              )}
              {orderSuccess && (
                <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-900/60 text-xs text-emerald-400 rounded-xl text-center">
                  {orderSuccess}
                </div>
              )}

              {cart.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs">
                  Your cart is empty. Click &quot;Add to Order&quot; on catalog products.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Cart Items List */}
                  <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                    {cart.map((item) => {
                      const { baseQty, price } = calculateCartItemPrice(item);
                      const baseRate = item.product.ratePerBaseUnit;

                      return (
                        <div
                          key={item.product.id}
                          className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-3 relative"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <h4 className="text-xs font-bold text-slate-200">{item.product.name}</h4>
                            <button
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-slate-500 hover:text-red-400 text-2xs transition"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <input
                                type="number"
                                min="0.000001"
                                step="any"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateCartItem(item.product.id, "quantity", e.target.value)
                                }
                                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none"
                              />
                            </div>
                            <div>
                              <select
                                value={item.unit}
                                onChange={(e) =>
                                  updateCartItem(item.product.id, "unit", e.target.value)
                                }
                                className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
                              >
                                {getUnitsForDimension(item.product.dimensionType).map((u) => (
                                  <option key={u} value={u}>
                                    {u}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Interactive Conversion Calculation formula Display */}
                          <div className="pt-2 border-t border-slate-900/60 text-3xs font-mono text-slate-400 leading-relaxed">
                            <div className="flex justify-between">
                              <span>Conversion:</span>
                              <span className="text-slate-300">
                                {item.quantity || "0"} {item.unit} = {baseQty.toFixed(2)} {item.product.baseUnit}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Formula:</span>
                              <span className="text-slate-300">
                                {baseQty.toFixed(2)} {item.product.baseUnit} * ₹{baseRate.toFixed(4)}/{item.product.baseUnit}
                              </span>
                            </div>
                            <div className="flex justify-between font-bold text-cyan-400 mt-1">
                              <span>Calculated Total:</span>
                              <span>₹{price.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary */}
                  <div className="border-t border-slate-900 pt-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400 font-medium">Estimated Total Price:</span>
                      <span className="text-xl font-bold font-mono text-cyan-400">
                        ₹{cartTotal.toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={handlePlaceOrder}
                      disabled={loading || cartTotal <= 0}
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg hover:shadow-cyan-500/10 transition duration-200 disabled:opacity-50"
                    >
                      {loading ? "Placing Order..." : "Place Quotation / Order"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Order History */}
        {activeTab === "history" && (
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-950/50">
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Order ID</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Date Placed</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Items Ordered</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Total Price</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-sm text-slate-500">
                        You have not placed any orders yet.
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-900/10 transition duration-150">
                        <td className="p-4 text-sm font-mono text-slate-300 font-semibold">
                          {o.id.substring(0, 8)}...
                        </td>
                        <td className="p-4 text-sm text-slate-300">
                          {new Date(o.createdAt).toLocaleDateString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-4 text-sm">
                          <div className="space-y-1.5">
                            {o.items.map((item, idx) => (
                              <div key={idx} className="text-xs text-slate-300">
                                <strong className="text-slate-100">{item.productName}</strong> - {item.enteredQuantity} {item.enteredUnit}{" "}
                                <span className="text-2xs text-slate-500">
                                  ({item.quantityInBaseUnit} {item.baseUnit})
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-sm font-mono font-bold text-cyan-400">
                          ₹{o.totalPrice.toFixed(2)}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-block text-2xs px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                              o.status === "PENDING"
                                ? "bg-yellow-950/60 text-yellow-400 border-yellow-900/60"
                                : o.status === "APPROVED"
                                ? "bg-emerald-950/60 text-emerald-400 border-emerald-900/60"
                                : "bg-red-950/60 text-red-400 border-red-900/60"
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
