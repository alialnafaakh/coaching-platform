"use client";

import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { addDays, startOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
}

export default function BookingDatePicker({ selected, onSelect }: Props) {
  const { lang, isRtl } = useLanguage();
  // Block today and all past dates — minimum is tomorrow
  const tomorrow = startOfDay(addDays(new Date(), 1));

  return (
    <div className="flex justify-center" dir={isRtl ? "rtl" : "ltr"}>
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={onSelect}
        disabled={{ before: tomorrow }}
        startMonth={tomorrow}
        showOutsideDays
        className="rdp-root"
        locale={lang === "ar" ? ar : undefined}
        dir={isRtl ? "rtl" : "ltr"}
      />
    </div>
  );
}
