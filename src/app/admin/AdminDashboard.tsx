"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
  updateOrderStatusAction,
} from "../actions";
import { UNIT_FACTORS, getUnitsForDimension, type DimensionType } from "@/utils/conversions";

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
  dimensionType: "WEIGHT" | "VOLUME" | "COUNT";
  enteredQuantity: number;
  enteredUnit: string;
  quantityInBaseUnit: number;
  calculatedPrice: number;
  baseUnit: string;
  ratePerBaseUnit: number;
}

interface Order {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  totalPrice: number;
  createdAt: string;
  items: OrderItem[];
}

interface AdminDashboardProps {
  initialProducts: Product[];
  initialOrders: Order[];
  user: {
    name?: string | null;
    email?: string | null;
    role: string;
  };
}

export default function AdminDashboard({
  initialProducts,
  initialOrders,
  user,
}: AdminDashboardProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<"products" | "orders">("products");

  // Modals / Form State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [dimensionType, setDimensionType] = useState<"WEIGHT" | "VOLUME" | "COUNT">("WEIGHT");
  const [displayUnit, setDisplayUnit] = useState("kg");
  const [displayRate, setDisplayRate] = useState("");
  const [displayStock, setDisplayStock] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Handle Dimension Change
  const handleDimensionChange = (dim: "WEIGHT" | "VOLUME" | "COUNT") => {
    setDimensionType(dim);
    if (dim === "WEIGHT") {
      setDisplayUnit("kg");
    } else if (dim === "VOLUME") {
      setDisplayUnit("L");
    } else {
      setDisplayUnit("item");
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setName("");
    setDescription("");
    setCategory("");
    setDimensionType("WEIGHT");
    setDisplayUnit("kg");
    setDisplayRate("");
    setDisplayStock("");
    setError("");
    setShowProductModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setDescription(p.description);
    setCategory(p.category);
    setDimensionType(p.dimensionType);
    
    // Choose sensible display units for form fields
    const defaultUnit = p.dimensionType === "WEIGHT" ? "kg" : p.dimensionType === "VOLUME" ? "L" : "item";
    setDisplayUnit(defaultUnit);

    const factor = UNIT_FACTORS[defaultUnit];
    setDisplayRate((p.ratePerBaseUnit * factor).toString());
    setDisplayStock((p.stockQuantity / factor).toString());
    setError("");
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const rateNum = parseFloat(displayRate);
    const stockNum = parseFloat(displayStock);

    if (isNaN(rateNum) || rateNum <= 0) {
      setError("Please enter a valid rate");
      setLoading(false);
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setError("Please enter a valid stock quantity");
      setLoading(false);
      return;
    }

    const payload = {
      name,
      description,
      category,
      dimensionType,
      displayUnit,
      displayRate: rateNum,
      displayStock: stockNum,
    };

    let result;
    if (editingProduct) {
      result = await updateProductAction({ id: editingProduct.id, ...payload });
    } else {
      result = await createProductAction(payload);
    }

    if (result.success && result.product) {
      // Re-map product values
      const updatedProduct: Product = {
        id: result.product.id,
        name: result.product.name,
        description: result.product.description || "",
        category: result.product.category,
        dimensionType: result.product.dimensionType as DimensionType,
        baseUnit: result.product.baseUnit,
        ratePerBaseUnit: Number(result.product.ratePerBaseUnit),
        stockQuantity: Number(result.product.stockQuantity),
      };

      if (editingProduct) {
        setProducts(products.map((p) => (p.id === editingProduct.id ? updatedProduct : p)));
      } else {
        setProducts([...products, updatedProduct]);
      }
      setShowProductModal(false);
    } else {
      setError(result.error || "An error occurred while saving");
    }
    setLoading(false);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    const result = await deleteProductAction(id);
    if (result.success) {
      setProducts(products.filter((p) => p.id !== id));
    } else {
      alert(result.error || "Failed to delete product");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: "APPROVED" | "REJECTED") => {
    const confirmMsg = `Are you sure you want to ${status.toLowerCase()} this order?`;
    if (!confirm(confirmMsg)) return;

    const result = await updateOrderStatusAction(orderId, status);
    if (result.success) {
      setOrders(
        orders.map((o) => {
          if (o.id === orderId) {
            // If approved, deduct local products state stock just for consistency in display
            if (status === "APPROVED") {
              const updatedProducts = [...products];
              o.items.forEach((item) => {
                const prodIndex = updatedProducts.findIndex((p) => p.name === item.productName);
                if (prodIndex !== -1) {
                  updatedProducts[prodIndex].stockQuantity -= item.quantityInBaseUnit;
                }
              });
              setProducts(updatedProducts);
            }
            return { ...o, status };
          }
          return o;
        })
      );
    } else {
      alert(result.error || `Failed to ${status.toLowerCase()} order`);
    }
  };

  // Live Conversion Calculation for Admin Form
  const factor = UNIT_FACTORS[displayUnit] || 1;
  const rateVal = parseFloat(displayRate);
  const stockVal = parseFloat(displayStock);

  const baseUnit = dimensionType === "WEIGHT" ? "g" : dimensionType === "VOLUME" ? "mL" : "item";
  const calculatedBaseRate = !isNaN(rateVal) ? rateVal / factor : 0;
  const calculatedBaseStock = !isNaN(stockVal) ? stockVal * factor : 0;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-950 font-sans">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              AasaMedChem
            </span>
            <span className="text-xs px-2.5 py-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-900/60 rounded-full font-semibold">
              Admin Portal
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

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        {/* Navigation Tabs */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-900 pb-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("products")}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 rounded-t-sm transition duration-200 ${
                activeTab === "products"
                  ? "border-cyan-400 text-cyan-400 bg-cyan-950/10"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Products & Stock
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 rounded-t-sm transition duration-200 ${
                activeTab === "orders"
                  ? "border-cyan-400 text-cyan-400 bg-cyan-950/10"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Incoming Orders
              {orders.filter((o) => o.status === "PENDING").length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-2xs bg-cyan-500 text-slate-950 rounded-full font-extrabold">
                  {orders.filter((o) => o.status === "PENDING").length}
                </span>
              )}
            </button>
          </div>

          {activeTab === "products" && (
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-xs font-bold rounded-lg shadow-lg hover:shadow-cyan-500/10 transition duration-200"
            >
              Add Product
            </button>
          )}
        </div>

        {/* Tab 1: Products Panel */}
        {activeTab === "products" && (
          <div className="flex-1 flex flex-col">
            <div className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 bg-slate-950/50">
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Product Name</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Category</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Dimension</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Base Unit Rate</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Display Unit Equivalent</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Available Stock</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60">
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-sm text-slate-500">
                          No products found. Click &quot;Add Product&quot; to create one.
                        </td>
                      </tr>
                    ) : (
                      products.map((p) => {
                        const displayUnitEquivalent = p.dimensionType === "WEIGHT" ? "kg" : p.dimensionType === "VOLUME" ? "L" : "item";
                        const displayRateEquivalent = p.ratePerBaseUnit * (UNIT_FACTORS[displayUnitEquivalent] || 1);
                        const displayStockEquivalent = p.stockQuantity / (UNIT_FACTORS[displayUnitEquivalent] || 1);

                        return (
                          <tr key={p.id} className="hover:bg-slate-900/20 transition duration-150">
                            <td className="p-4 text-sm font-semibold text-slate-200">
                              <div>{p.name}</div>
                              {p.description && (
                                <div className="text-xs text-slate-400 font-normal mt-0.5 line-clamp-1">{p.description}</div>
                              )}
                            </td>
                            <td className="p-4 text-sm text-slate-300 font-medium">{p.category}</td>
                            <td className="p-4 text-sm">
                              <span className="text-2xs px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 rounded font-semibold">
                                {p.dimensionType}
                              </span>
                            </td>
                            <td className="p-4 text-sm font-mono text-cyan-400">
                              ₹{p.ratePerBaseUnit.toFixed(4)} / {p.baseUnit}
                            </td>
                            <td className="p-4 text-sm font-mono text-emerald-400">
                              ₹{displayRateEquivalent.toFixed(2)} / {displayUnitEquivalent}
                            </td>
                            <td className="p-4 text-sm font-mono text-right text-slate-200 font-semibold">
                              <div>{p.stockQuantity.toLocaleString()} {p.baseUnit}</div>
                              {p.dimensionType !== "COUNT" && (
                                <div className="text-2xs text-slate-400 font-normal">
                                  ({displayStockEquivalent.toFixed(2)} {displayUnitEquivalent})
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex justify-center gap-3">
                                <button
                                  onClick={() => openEditModal(p)}
                                  className="px-2.5 py-1 text-2xs font-semibold border border-slate-850 hover:border-cyan-500/50 hover:bg-slate-900 text-slate-300 hover:text-cyan-400 rounded-md transition duration-200"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="px-2.5 py-1 text-2xs font-semibold border border-slate-850 hover:border-red-500/50 hover:bg-slate-900 text-slate-300 hover:text-red-400 rounded-md transition duration-200"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Orders Panel */}
        {activeTab === "orders" && (
          <div className="flex-1 flex flex-col">
            <div className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 bg-slate-950/50">
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Order ID</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Seller Details</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Date</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Total Price</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Status</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-sm text-slate-500">
                          No orders or quotations have been submitted yet.
                        </td>
                      </tr>
                    ) : (
                      orders.map((o) => {
                        const isExpanded = expandedOrderId === o.id;

                        return (
                          <React.Fragment key={o.id}>
                            <tr
                              onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                              className="hover:bg-slate-900/10 cursor-pointer transition duration-150"
                            >
                              <td className="p-4 text-sm font-semibold text-slate-300 font-mono">
                                {o.id.substring(0, 8)}...
                              </td>
                              <td className="p-4 text-sm">
                                <div className="text-slate-200 font-semibold">{o.userName}</div>
                                <div className="text-xs text-slate-400">{o.userEmail}</div>
                              </td>
                              <td className="p-4 text-sm text-slate-300">
                                {new Date(o.createdAt).toLocaleDateString(undefined, {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="p-4 text-sm font-mono text-cyan-400 font-bold">
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
                              <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-center gap-2">
                                  {o.status === "PENDING" ? (
                                    <>
                                      <button
                                        onClick={() => handleUpdateOrderStatus(o.id, "APPROVED")}
                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-2xs font-bold rounded transition duration-200"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleUpdateOrderStatus(o.id, "REJECTED")}
                                        className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-slate-950 text-2xs font-bold rounded transition duration-200"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-2xs text-slate-500 font-semibold uppercase">
                                      Done
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Item Details (Verification Panel) */}
                            {isExpanded && (
                              <tr className="bg-slate-950/40 border-l-2 border-l-cyan-400">
                                <td colSpan={6} className="p-6">
                                  <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-5">
                                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">
                                      Order items & Conversion Audit Trail
                                    </h4>
                                    <div className="space-y-4">
                                      {o.items.map((item, idx) => (
                                        <div
                                          key={idx}
                                          className="p-4 bg-slate-950/60 border border-slate-900 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                                        >
                                          <div>
                                            <div className="text-sm font-bold text-slate-200">{item.productName}</div>
                                            <div className="text-xs text-slate-400 mt-1">
                                              Entered Order Qty: <strong className="text-slate-300 font-semibold">{item.enteredQuantity} {item.enteredUnit}</strong>
                                            </div>
                                            <div className="text-2xs text-slate-500 mt-0.5">
                                              Internally Stored: <strong className="text-slate-400 font-semibold">{item.quantityInBaseUnit} {item.baseUnit}</strong> (conversion factor: {UNIT_FACTORS[item.enteredUnit]})
                                            </div>
                                          </div>

                                          <div className="flex flex-col md:items-end gap-1">
                                            <div className="text-xs text-slate-400">
                                              Rate: <span className="font-mono text-slate-300">₹{item.ratePerBaseUnit.toFixed(4)} / {item.baseUnit}</span>
                                            </div>
                                            <div className="text-2xs text-slate-500">
                                              ({item.enteredUnit} Rate: <span className="font-mono text-slate-400">₹{(item.ratePerBaseUnit * UNIT_FACTORS[item.enteredUnit]).toFixed(2)} / {item.enteredUnit}</span>)
                                            </div>
                                            <div className="text-sm font-bold font-mono text-cyan-400 mt-1">
                                              Total: ₹{item.calculatedPrice.toFixed(2)}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <h3 className="text-lg font-bold text-slate-200 mb-6">
              {editingProduct ? `Edit ${editingProduct.name}` : "Add New Product"}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-900/60 rounded-xl text-xs text-red-400 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Product Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Acetone"
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition duration-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  placeholder="e.g. Solvents"
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition duration-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Chemical purity levels, SKU, storage conditions..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition duration-200 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Dimension Type
                  </label>
                  <select
                    value={dimensionType}
                    onChange={(e) => handleDimensionChange(e.target.value as DimensionType)}
                    className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition duration-200"
                  >
                    <option value="WEIGHT">Weight (g, kg)</option>
                    <option value="VOLUME">Volume (mL, L)</option>
                    <option value="COUNT">Count (items)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Display Unit
                  </label>
                  <select
                    value={displayUnit}
                    onChange={(e) => setDisplayUnit(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition duration-200"
                  >
                    {getUnitsForDimension(dimensionType).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Rate per Display Unit (₹)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={displayRate}
                    onChange={(e) => setDisplayRate(e.target.value)}
                    required
                    placeholder="e.g. 1000"
                    className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition duration-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Stock in Display Unit
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={displayStock}
                    onChange={(e) => setDisplayStock(e.target.value)}
                    required
                    placeholder="e.g. 50"
                    className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition duration-200"
                  />
                </div>
              </div>

              {/* Real-time Conversion Visualizer */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-1.5">
                <div className="text-2xs font-extrabold uppercase tracking-widest text-slate-500">
                  Real-time Database Schema Conversions
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-500">Rate stored in database:</span>
                    <div className="text-cyan-400 font-bold mt-0.5">
                      ₹{calculatedBaseRate.toFixed(6)} / {baseUnit}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Stock quantity stored:</span>
                    <div className="text-emerald-400 font-bold mt-0.5">
                      {calculatedBaseStock.toLocaleString()} {baseUnit}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  disabled={loading}
                  className="px-4 py-2.5 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg transition duration-200 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
