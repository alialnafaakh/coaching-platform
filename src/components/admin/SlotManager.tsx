"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  format,
  isBefore,
  isSameDay,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { TimeSlot } from "@/types";

const TIME_OPTIONS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00",
];

const MORNING = ["09:00", "10:00", "11:00", "12:00"];
const AFTERNOON = ["14:00", "15:00", "16:00", "17:00", "18:00"];

function toEnd(start: string): string {
  const [h, m] = start.split(":").map(Number);
  const totalM = h * 60 + m + 40;
  const endH = Math.floor(totalM / 60) % 24;
  const endM = totalM % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

function dateKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function hhmm(value: string) {
  return value.slice(0, 5);
}

export default function SlotManager() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState(() => addDays(new Date(), 1));
  const [saving, setSaving] = useState(false);
  const [busyTime, setBusyTime] = useState<string | null>(null);
  const [customTime, setCustomTime] = useState("10:00");
  const [msg, setMsg] = useState("");

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/slots?admin=true");
      const data = await res.json();
      setSlots(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const selectedKey = dateKey(selectedDate);
  const daySlots = slots.filter((slot) => slot.date === selectedKey);
  const slotByTime = new Map(daySlots.map((slot) => [hhmm(slot.start_time), slot]));

  const openCount = slots.filter((slot) => !slot.is_booked && slot.date >= dateKey(new Date())).length;
  const bookedCount = slots.filter((slot) => slot.is_booked && slot.date >= dateKey(new Date())).length;

  const setNotice = (text: string) => {
    setMsg(text);
    window.setTimeout(() => setMsg(""), 2500);
  };

  const createSlots = async (items: { date: string; start_time: string; end_time: string }[]) => {
    if (items.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: items }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(`Error: ${data.error || "Could not open times"}`);
        return;
      }
      const created = data.created?.length || 0;
      if (created > 0) setNotice(`✓ Opened ${created} time${created === 1 ? "" : "s"}`);
      else setNotice("Those times are already open");
      await fetchSlots();
    } finally {
      setSaving(false);
    }
  };

  const deleteSlots = async (ids: string[]) => {
    if (ids.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/slots", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(`Error: ${data.error || "Could not close times"}`);
        return;
      }
      setNotice("✓ Closed times");
      await fetchSlots();
    } finally {
      setSaving(false);
    }
  };

  const toggleTime = async (start: string) => {
    const existing = slotByTime.get(start);
    setBusyTime(start);
    try {
      if (existing?.is_booked) {
        setNotice("This time is already booked");
        return;
      }
      if (existing) {
        await deleteSlots([existing.id]);
        return;
      }
      await createSlots([
        {
          date: selectedKey,
          start_time: `${start}:00`,
          end_time: `${toEnd(start)}:00`,
        },
      ]);
    } finally {
      setBusyTime(null);
    }
  };

  const openTimesOnDate = (date: string, times: string[]) =>
    createSlots(
      times.map((start) => ({
        date,
        start_time: `${start}:00`,
        end_time: `${toEnd(start)}:00`,
      }))
    );

  const closeUnbookedOnDay = () => {
    const ids = daySlots.filter((slot) => !slot.is_booked).map((slot) => slot.id);
    return deleteSlots(ids);
  };

  const copyToNextDays = async (days: number) => {
    const openTimes = daySlots.filter((slot) => !slot.is_booked).map((slot) => hhmm(slot.start_time));
    if (openTimes.length === 0) {
      setNotice("Open some times first, then copy them");
      return;
    }
    const today = startOfDay(new Date());
    const items: { date: string; start_time: string; end_time: string }[] = [];
    for (let i = 1; i <= days; i++) {
      const nextDate = addDays(selectedDate, i);
      if (isBefore(nextDate, today)) continue;
      for (const start of openTimes) {
        items.push({
          date: dateKey(nextDate),
          start_time: `${start}:00`,
          end_time: `${toEnd(start)}:00`,
        });
      }
    }
    await createSlots(items);
  };

  const applyWeekdays = async (times: string[]) => {
    const today = startOfDay(new Date());
    const items: { date: string; start_time: string; end_time: string }[] = [];
    for (const day of weekDays) {
      if (day.getDay() === 0 || day.getDay() === 6) continue;
      if (isBefore(day, today)) continue;
      for (const start of times) {
        items.push({
          date: dateKey(day),
          start_time: `${start}:00`,
          end_time: `${toEnd(start)}:00`,
        });
      }
    }
    await createSlots(items);
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-3xl text-[#1a1a2e] mb-2"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
          >
            Booking times
          </h1>
          <p className="text-sm text-[#6b7280]">
            Click a day, then click hours to open them for clients. Click again to close.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 rounded-xl bg-white border border-[#e5e0d8] text-sm">
            <span className="text-[#0d7377] font-semibold">{openCount}</span>
            <span className="text-[#9ca3af]"> open</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-white border border-[#e5e0d8] text-sm">
            <span className="text-[#d4a843] font-semibold">{bookedCount}</span>
            <span className="text-[#9ca3af]"> booked</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-[#e5e0d8] mb-5">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="px-3 py-1.5 rounded-lg text-sm text-[#6b7280] hover:bg-[#f5f3ef]"
          >
            ← Prev week
          </button>
          <p className="text-sm font-medium text-[#1a1a2e]">
            {format(weekDays[0], "MMM d")} – {format(weekDays[6], "MMM d, yyyy")}
          </p>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="px-3 py-1.5 rounded-lg text-sm text-[#6b7280] hover:bg-[#f5f3ef]"
          >
            Next week →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const key = dateKey(day);
            const count = slots.filter((slot) => slot.date === key && !slot.is_booked).length;
            const booked = slots.filter((slot) => slot.date === key && slot.is_booked).length;
            const selected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            return (
              <button
                key={key}
                onClick={() => setSelectedDate(day)}
                className={`rounded-xl border p-3 text-center transition-all ${
                  selected
                    ? "border-[#0d7377] bg-[#0d7377] text-white shadow-sm"
                    : "border-[#e5e0d8] bg-[#faf9f6] hover:border-[#0d7377]/40"
                }`}
              >
                <p className={`text-[11px] uppercase tracking-wide ${selected ? "text-white/70" : "text-[#9ca3af]"}`}>
                  {format(day, "EEE")}
                </p>
                <p className="text-lg font-semibold leading-tight mt-0.5">{format(day, "d")}</p>
                <p className={`text-[11px] mt-1 ${selected ? "text-white/80" : "text-[#0d7377]"}`}>
                  {count > 0 ? `${count} open` : isToday ? "today" : booked > 0 ? `${booked} booked` : "closed"}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-[#e5e0d8] mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <p className="font-medium text-[#1a1a2e]">
              {format(selectedDate, "EEEE, MMMM d")}
            </p>
            <p className="text-xs text-[#9ca3af] mt-0.5">
              Green = open to book · Gold = already booked · Gray = closed
            </p>
          </div>
          {msg && (
            <p className={`text-sm ${msg.startsWith("✓") ? "text-[#0d7377]" : "text-red-600"}`}>
              {msg}
            </p>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {TIME_OPTIONS.map((time) => (
              <div key={time} className="h-16 rounded-xl bg-[#f5f3ef] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {TIME_OPTIONS.map((time) => {
              const slot = slotByTime.get(time);
              const booked = Boolean(slot?.is_booked);
              const open = Boolean(slot) && !booked;
              return (
                <button
                  key={time}
                  disabled={saving || busyTime === time || booked}
                  onClick={() => toggleTime(time)}
                  className={`rounded-xl border px-3 py-3 text-left transition-all disabled:opacity-60 ${
                    booked
                      ? "border-[#d4a843]/40 bg-[#d4a843]/10 cursor-default"
                      : open
                        ? "border-[#0d7377] bg-[#0d7377] text-white hover:bg-[#0b6468]"
                        : "border-[#e5e0d8] bg-[#faf9f6] hover:border-[#0d7377]/50 hover:bg-[#f0fafa]"
                  }`}
                >
                  <p className="text-sm font-semibold">{time}</p>
                  <p className={`text-[11px] mt-0.5 ${open ? "text-white/80" : booked ? "text-[#9a7520]" : "text-[#9ca3af]"}`}>
                    {busyTime === time ? "Saving…" : booked ? "Booked" : open ? "Open · click to close" : "Click to open"}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-[#e5e0d8]">
          <button
            disabled={saving}
            onClick={() => openTimesOnDate(selectedKey, MORNING)}
            className="px-3 py-2 rounded-lg text-xs font-medium border border-[#e5e0d8] hover:border-[#0d7377] hover:text-[#0d7377]"
          >
            Open mornings
          </button>
          <button
            disabled={saving}
            onClick={() => openTimesOnDate(selectedKey, AFTERNOON)}
            className="px-3 py-2 rounded-lg text-xs font-medium border border-[#e5e0d8] hover:border-[#0d7377] hover:text-[#0d7377]"
          >
            Open afternoons
          </button>
          <button
            disabled={saving}
            onClick={() => openTimesOnDate(selectedKey, TIME_OPTIONS)}
            className="px-3 py-2 rounded-lg text-xs font-medium border border-[#e5e0d8] hover:border-[#0d7377] hover:text-[#0d7377]"
          >
            Open all day
          </button>
          <button
            disabled={saving}
            onClick={closeUnbookedOnDay}
            className="px-3 py-2 rounded-lg text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50"
          >
            Close unbooked
          </button>
          <button
            disabled={saving}
            onClick={() => copyToNextDays(7)}
            className="px-3 py-2 rounded-lg text-xs font-medium text-white"
            style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
          >
            Copy this day → next 7 days
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3 mt-4">
          <div>
            <label className="block text-[11px] text-[#9ca3af] mb-1">Custom time</label>
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[#e5e0d8] text-sm"
            />
          </div>
          <button
            disabled={saving || !customTime}
            onClick={() => toggleTime(customTime.slice(0, 5))}
            className="px-4 py-2 rounded-lg text-xs font-medium border border-[#e5e0d8] hover:border-[#0d7377]"
          >
            Open custom time
          </button>
          <button
            disabled={saving}
            onClick={() => applyWeekdays(MORNING.concat(AFTERNOON))}
            className="px-4 py-2 rounded-lg text-xs font-medium border border-[#e5e0d8] hover:border-[#0d7377]"
          >
            Open Mon–Fri 9–12 & 14–18
          </button>
        </div>
      </div>
    </div>
  );
}
