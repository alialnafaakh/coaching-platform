"use client";

import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { startOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import { useLanguage } from "@/context/LanguageContext";
import { istanbulCalendarDate } from "@/lib/consultationAccess";

interface Props {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
}

/** Local Date at midnight for Istanbul's current calendar day (for DayPicker). */
function istanbulTodayLocalDate(): Date {
  const [y, m, d] = istanbulCalendarDate().split("-").map(Number);
  return startOfDay(new Date(y, m - 1, d));
}

export default function BookingDatePicker({ selected, onSelect }: Props) {
  const { lang, isRtl } = useLanguage();
  // Allow today (Istanbul); only past calendar days are disabled
  const today = istanbulTodayLocalDate();

  return (
    <div className="flex justify-center" dir={isRtl ? "rtl" : "ltr"}>
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={onSelect}
        disabled={{ before: today }}
        startMonth={today}
        showOutsideDays
        className="rdp-root"
        locale={lang === "ar" ? ar : undefined}
        dir={isRtl ? "rtl" : "ltr"}
      />
    </div>
  );
}
