"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { TimeSlot } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  date: Date;
  selectedSlot: TimeSlot | null;
  onSelect: (slot: TimeSlot) => void;
}

import { useLanguage } from "@/context/LanguageContext";

export default function TimeSlotPicker({ date, selectedSlot, onSelect }: Props) {
  const { isRtl, t, lang } = useLanguage();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const dateStr = format(date, "yyyy-MM-dd");
    setLoading(true);
    fetch(`/api/slots?date=${dateStr}`)
      .then((r) => r.json())
      .then((data) => setSlots(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-[#f0ede6] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const formatDate = (d: Date) => {
    return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
      month: "long",
      day: "numeric",
    }).format(d);
  };

  if (slots.length === 0) {
    return (
      <div className={`text-center py-10 text-[#9ca3af] text-sm ${isRtl ? "font-arabic" : ""}`}>
        {t("no_slots_for")}{" "}
        <span className="font-medium text-[#6b7280]">
          {formatDate(date)}
        </span>
        . {t("choose_another_date")}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={format(date, "yyyy-MM-dd")}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="grid grid-cols-3 gap-3"
      >
        {slots.map((slot) => (
          <button
            key={slot.id}
            onClick={() => onSelect(slot)}
            className={`py-3 px-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
              selectedSlot?.id === slot.id
                ? "bg-[#0d7377] text-white border-[#0d7377] shadow-md"
                : "bg-white text-[#1a1a2e] border-[#e5e0d8] hover:border-[#0d7377]/50 hover:bg-[#f0fafa]"
            }`}
          >
            {slot.start_time.slice(0, 5)}
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
