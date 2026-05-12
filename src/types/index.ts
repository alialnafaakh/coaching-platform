// ─── Shared TypeScript interfaces ────────────────────────────────────────────

export interface TimeSlot {
  id: string;
  date: string;          // "YYYY-MM-DD"
  start_time: string;    // "HH:MM"
  end_time: string;      // "HH:MM"
  is_booked: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  slot_id: string;
  client_name: string;
  client_email: string;
  notes: string | null;
  stripe_session_id: string;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
  time_slots?: TimeSlot;
}

export interface BookingFormData {
  slot_id: string;
  client_name: string;
  client_email: string;
  notes?: string;
  date: string;
  start_time: string;
  end_time: string;
}

export interface CreateSlotPayload {
  date: string;
  start_time: string;
  end_time: string;
}
