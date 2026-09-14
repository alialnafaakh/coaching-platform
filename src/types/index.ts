export interface TimeSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  created_at: string;
}

export type PaymentProvider = "wayl" | "qicard" | "patreon" | null;
export type AppointmentStatus =
  | "pending_payment"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "failed";

export interface Appointment {
  id: string;
  slot_id: string;
  client_name: string;
  client_email: string;
  notes: string | null;
  stripe_session_id: string | null;
  payment_reference: string | null;
  payment_provider: PaymentProvider;
  payment_status: PaymentStatus;
  payment_expires_at: string | null;
  join_token: string;
  room_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  status: AppointmentStatus;
  created_at: string;
  time_slots?: TimeSlot;
}

export interface PublicAppointment {
  id: string;
  status: AppointmentStatus;
  payment_status: PaymentStatus;
  payment_expires_at: string | null;
  client_name: string;
  client_email: string;
  notes: string | null;
  date: string;
  start_time: string;
  end_time: string;
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
  slots?: CreateSlotPayload[];
}
