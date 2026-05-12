"use client";

import { useState } from "react";
import { TimeSlot } from "@/types";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface Props {
  slot: TimeSlot;
  date: Date;
}

export default function BookingForm({ slot, date }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: slot.id,
          client_name: name,
          client_email: email,
          notes,
          date: format(date, "yyyy-MM-dd"),
          start_time: slot.start_time,
          end_time: slot.end_time,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Something went wrong");
      if (data.url) window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
      setLoading(false);
    }
  };

  const inputCls =
    "w-full px-4 py-3 rounded-xl border border-[#e5e0d8] bg-[#faf9f6] text-[#1a1a2e] text-sm placeholder:text-[#9ca3af] focus:outline-none focus:border-[#0d7377] focus:ring-2 focus:ring-[#0d7377]/10 transition-all";

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {/* Summary */}
      <div className="p-4 rounded-xl bg-[#0d7377]/6 border border-[#0d7377]/15">
        <p className="text-xs text-[#0d7377] font-medium uppercase tracking-wider mb-1">
          Your booking
        </p>
        <p className="text-sm font-semibold text-[#1a1a2e]">
          {format(date, "EEEE, MMMM d, yyyy")} at{" "}
          {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
        </p>
        <p className="text-sm text-[#6b7280]">
          40-minute session ·{" "}
          <span className="line-through text-[#9ca3af]">$100</span>{" "}
          <span className="font-semibold text-[#0d7377]">$50</span>
        </p>
      </div>

      {/* Fields */}
      <div>
        <label className="block text-xs font-medium text-[#6b7280] mb-1.5">
          Full Name
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6b7280] mb-1.5">
          Email Address
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6b7280] mb-1.5">
          What brings you here? <span className="text-[#9ca3af]">(optional)</span>
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Brief context about what you'd like to work on…"
          className={`${inputCls} resize-none`}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
          ⚠️ {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-xl text-base font-medium text-white transition-all duration-200 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
      >
        {loading ? "Redirecting to Stripe…" : "Confirm & Pay $50 →"}
      </button>

      <p className="text-center text-xs text-[#9ca3af]">
        Secure payment via Stripe · SSL encrypted
      </p>
    </motion.form>
  );
}
