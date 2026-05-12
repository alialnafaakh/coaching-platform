"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid credentials. Please try again.");
    } else {
      router.push("/admin");
    }
  };

  const inputCls =
    "w-full px-4 py-3 rounded-xl border border-[#e5e0d8] text-sm text-[#1a1a2e] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#0d7377] focus:ring-2 focus:ring-[#0d7377]/10 transition-all";

  return (
    <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-semibold mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #0d7377, #d4a843)" }}
          >
            M
          </div>
          <h1
            className="text-2xl text-[#1a1a2e]"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
          >
            Admin Login
          </h1>
          <p className="text-xs text-[#9ca3af] mt-1">
            Maryem Coaching Dashboard
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-6 border border-[#e5e0d8] space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-[#6b7280] mb-1.5">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#6b7280] mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputCls}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-medium text-white transition-all hover:shadow-md disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
          >
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
