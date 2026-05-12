"use client";

import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { addDays, startOfDay } from "date-fns";

interface Props {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
}

export default function BookingDatePicker({ selected, onSelect }: Props) {
  // Block today and all past dates — minimum is tomorrow
  const tomorrow = startOfDay(addDays(new Date(), 1));

  return (
    <div className="flex justify-center">
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={onSelect}
        disabled={{ before: tomorrow }}
        startMonth={tomorrow}
        showOutsideDays
        className="rdp-root"
      />
    </div>
  );
}
