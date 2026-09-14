"use client";

import { useEffect, useState } from "react";
import {
  calculateFinalPrice,
  formatUsd,
  MAX_SESSION_MINUTES,
  MIN_SESSION_MINUTES,
  type ConsultationSettings,
} from "@/lib/consultationSettings";

const DURATION_PRESETS = [30, 40, 45, 60];

export default function AdminSettingsPage() {
  const [duration, setDuration] = useState(40);
  const [basePrice, setBasePrice] = useState(50);
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const finalPrice = calculateFinalPrice(basePrice, discount);

  useEffect(() => {
    fetch("/api/consultation-settings")
      .then((r) => r.json())
      .then((d: ConsultationSettings & { error?: string }) => {
        if (d.error) throw new Error(d.error);
        setDuration(d.session_duration_minutes);
        setBasePrice(d.base_price_usd);
        setDiscount(d.discount_percent);
      })
      .catch(() => setError("Could not load consultation settings."))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/consultation-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_duration_minutes: duration,
          base_price_usd: basePrice,
          discount_percent: discount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setDuration(data.session_duration_minutes);
      setBasePrice(data.base_price_usd);
      setDiscount(data.discount_percent);
      setMsg("Settings saved. New bookings and newly opened slots will use these values.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-40 bg-white rounded-2xl animate-pulse border border-[#e5e0d8]" />;
  }

  return (
    <div className="max-w-xl">
      <h1
        className="text-3xl text-[#1a1a2e] mb-2"
        style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
      >
        Consultation Settings
      </h1>
      <p className="text-sm text-[#6b7280] mb-8">
        Control session length and discount. Changes apply to new bookings and newly opened
        slots only — existing appointments keep their original price and duration.
      </p>

      <div className="bg-white rounded-2xl border border-[#e5e0d8] p-6 space-y-6">
        <div>
          <label className="block text-xs font-medium text-[#6b7280] mb-2">
            Session duration (minutes)
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {DURATION_PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setDuration(m)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  duration === m
                    ? "bg-[#0d7377] text-white border-[#0d7377]"
                    : "bg-white text-[#374151] border-[#e5e0d8] hover:border-[#0d7377]/40"
                }`}
              >
                {m} min
              </button>
            ))}
          </div>
          <input
            type="number"
            min={MIN_SESSION_MINUTES}
            max={MAX_SESSION_MINUTES}
            step={1}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-xl border border-[#e5e0d8] text-sm focus:outline-none focus:border-[#0d7377]"
          />
          <p className="text-xs text-[#9ca3af] mt-1.5">
            Allowed range: {MIN_SESSION_MINUTES}–{MAX_SESSION_MINUTES} minutes. Used when opening
            new booking times.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#6b7280] mb-2">
            Base / original price (USD)
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={basePrice}
            onChange={(e) => setBasePrice(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-xl border border-[#e5e0d8] text-sm focus:outline-none focus:border-[#0d7377]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#6b7280] mb-2">
            Discount percentage (0–100)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-xl border border-[#e5e0d8] text-sm focus:outline-none focus:border-[#0d7377]"
          />
        </div>

        <div className="rounded-xl bg-[#0d7377]/6 border border-[#0d7377]/15 p-4">
          <p className="text-xs uppercase tracking-wider text-[#0d7377] font-medium mb-2">
            Preview
          </p>
          <p className="text-sm text-[#374151]">
            {duration}-minute session · Original {formatUsd(basePrice)}
            {discount > 0 ? ` · ${discount}% off` : ""} · Final{" "}
            <span className="font-semibold text-[#0d7377]">{formatUsd(finalPrice)}</span>
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
        )}
        {msg && (
          <p className="text-sm text-emerald-700 bg-emerald-50 px-4 py-3 rounded-xl">{msg}</p>
        )}

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="w-full py-3 rounded-xl text-sm font-medium text-white disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
