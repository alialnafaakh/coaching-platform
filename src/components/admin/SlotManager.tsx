"use client";

import { useState, useEffect } from "react";
import { format, addDays, startOfDay } from "date-fns";
import { TimeSlot } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

const TIME_OPTIONS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
];

function toEnd(start: string): string {
  const [h, m] = start.split(":").map(Number);
  const totalM = h * 60 + m + 40;
  const endH = Math.floor(totalM / 60) % 24;
  const endM = totalM % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

export default function SlotManager() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("10:00");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchSlots = () => {
    setLoading(true);
    fetch("/api/slots?admin=true")
      .then((r) => r.json())
      .then((d) => setSlots(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSlots(); }, []);

  const minDate = format(startOfDay(addDays(new Date(), 1)), "yyyy-MM-dd");

  const handleAdd = async () => {
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        start_time: `${startTime}:00`,
        end_time: `${toEnd(startTime)}:00`,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("✓ Slot added");
      fetchSlots();
    } else {
      const d = await res.json();
      setMsg(`Error: ${d.error}`);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/slots?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchSlots();
    else {
      const d = await res.json();
      alert(d.error);
    }
  };

  // Group slots by date
  const grouped = slots.reduce<Record<string, TimeSlot[]>>((acc, s) => {
    (acc[s.date] = acc[s.date] || []).push(s);
    return acc;
  }, {});

  return (
    <div>
      <h1
        className="text-3xl text-[#1a1a2e] mb-2"
        style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
      >
        Manage Slots
      </h1>
      <p className="text-sm text-[#6b7280] mb-8">
        Add available time slots that clients can book.
      </p>

      {/* Add slot form */}
      <div className="bg-white rounded-2xl p-6 border border-[#e5e0d8] mb-8">
        <p className="font-medium text-[#1a1a2e] mb-5">Add a new slot</p>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-[#6b7280] mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              min={minDate}
              onChange={(e) => setDate(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-[#e5e0d8] text-sm text-[#1a1a2e] focus:outline-none focus:border-[#0d7377]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#6b7280] mb-1.5">
              Start Time
            </label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-[#e5e0d8] text-sm text-[#1a1a2e] focus:outline-none focus:border-[#0d7377]"
            >
              {TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t} – {toEnd(t)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAdd}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60 hover:shadow-md transition-all"
            style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
          >
            {saving ? "Adding…" : "+ Add Slot"}
          </button>

          {msg && (
            <p className={`text-sm ${msg.startsWith("✓") ? "text-[#0d7377]" : "text-red-600"}`}>
              {msg}
            </p>
          )}
        </div>
      </div>

      {/* Slot list */}
      {loading ? (
        <p className="text-sm text-[#9ca3af]">Loading slots…</p>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-[#9ca3af]">No slots added yet.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([d, daySlots]) => (
              <div key={d} className="bg-white rounded-2xl p-5 border border-[#e5e0d8]">
                <p className="text-sm font-medium text-[#1a1a2e] mb-4">
                  {format(new Date(`${d}T00:00:00`), "EEEE, MMMM d, yyyy")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence>
                    {daySlots.map((s) => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border ${
                          s.is_booked
                            ? "bg-[#0d7377]/8 border-[#0d7377]/20 text-[#0d7377]"
                            : "bg-[#f5f3ef] border-[#e5e0d8] text-[#374151]"
                        }`}
                      >
                        <span>
                          {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                        </span>
                        {s.is_booked ? (
                          <span className="text-[#0d7377] font-medium">✓ Booked</span>
                        ) : (
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="text-[#9ca3af] hover:text-red-500 transition-colors ml-1"
                            title="Delete slot"
                          >
                            ×
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
