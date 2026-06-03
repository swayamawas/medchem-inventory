"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, Suspense } from "react";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: "admin" | "seller") => {
    setLoading(true);
    setError("");

    const quickEmail = role === "admin" ? "admin@aasamedchem.com" : "seller@aasamedchem.com";
    const quickPassword = role === "admin" ? "AdminPass123" : "SellerPass123";

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: quickEmail,
        password: quickPassword,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        router.push(role === "admin" ? "/admin" : "/seller");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-slate-900/60 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          AasaMedChem
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          Inventory & Order Management Portal
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-950/40 border border-red-900/60 rounded-xl text-sm text-red-400 text-center animate-shake">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition duration-200"
            placeholder="name@company.com"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition duration-200"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg hover:shadow-cyan-500/25 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="relative flex items-center justify-center my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-800"></div>
        </div>
        <span className="relative bg-slate-900 px-3 text-xs text-slate-500 uppercase tracking-wider">
          Demo Quick Access
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleQuickLogin("admin")}
          disabled={loading}
          className="py-3 px-4 bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 rounded-xl text-xs font-medium text-emerald-400 transition duration-200"
        >
          Login as Admin
        </button>
        <button
          onClick={() => handleQuickLogin("seller")}
          disabled={loading}
          className="py-3 px-4 bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 rounded-xl text-xs font-medium text-cyan-400 transition duration-200"
        >
          Login as Seller
        </button>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={
        <div className="text-slate-400 text-sm">Loading sign in portal...</div>
      }>
        <SignInForm />
      </Suspense>
    </div>
  );
}
