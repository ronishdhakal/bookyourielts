export type TestFormat = "computer" | "computer_wop";
export type ProviderCode = "british_council" | "idp";
export type Examinee = "self" | "other";
export type SeatStatus = "available" | "few_left" | "full" | "closed";
export type BookingStatus = "initiated" | "confirmed" | "cancelled";
export type InquiryStatus = "new" | "contacted" | "closed";

export interface City {
  id: number;
  name: string;
  slug: string;
  intro: string;
  upcoming_count: number;
}

export interface TestType {
  id: number;
  code: string;
  name: string;
  is_ukvi: boolean;
  description: string;
}

export interface TestSession {
  id: number;
  date: string;
  weekday: string;
  provider: ProviderCode;
  provider_label: string;
  slot: "morning" | "afternoon";
  slot_label: string;
  city: { name: string; slug: string };
  venue: { name: string; address: string } | null;
  test_type: TestType;
  format: TestFormat;
  format_label: string;
  fee_npr: number;
  seats_left: number;
  seat_status: SeatStatus;
  seat_status_label: string;
  is_bookable: boolean;
  registration_closes_on: string;
  results_date: string;
  speaking_note: string;
}

export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  date_of_birth: string | null;
  email_verified: boolean;
  is_staff: boolean;
  date_joined: string;
}

export interface Booking {
  id: number;
  reference: string;
  status: BookingStatus;
  status_label: string;
  session: TestSession;
  whatsapp_url: string;
  created_at: string;
  examinee: Examinee;
  candidate_name: string;
  candidate_phone: string;
  candidate_email: string;
  date_of_birth: string | null;
  province: string;
  district: string;
  municipality: string;
  has_passport: boolean;
}

export interface Inquiry {
  id: number;
  name: string;
  phone: string;
  email: string;
  preferred_city: string | null;
  test_type: string | null;
  format: TestFormat | "";
  preferred_month: string;
  message: string;
  status: InquiryStatus;
  created_at: string;
  whatsapp_url: string;
}

export interface SiteInfo {
  whatsapp_number: string;
  contact_email: string;
  contact_phone: string;
  office_address: string;
  low_seat_threshold: number;
  announcement: string;
  footer_disclaimer: string;
}

export interface Faq {
  id: number;
  page: string;
  question: string;
  answer: string;
}

export interface ContentBlock {
  key: string;
  title: string;
  body: string;
}

export interface SessionFilters {
  city?: string;
  provider?: string;
  category?: string;
  test_type?: string;
  test_format?: string;
  month?: string;
  hide_closed?: string;
  page?: string;
  page_size?: string;
}

/* ---- Staff dashboard ---- */
export interface Stats {
  bookings: { initiated: number; confirmed: number; cancelled: number; total: number };
  new_inquiries: number;
  open_dates: number;
  hidden_dates: number;
  seats_next_30_days: { total: number; booked: number };
  students: number;
  per_day: { date: string; count: number }[];
  low_seat_dates: TestSession[];
  recent_bookings: {
    id: number;
    reference: string;
    status: BookingStatus;
    student: string;
    test: string;
    city: string;
    date: string;
    created_at: string;
  }[];
}

export interface StaffBooking {
  id: number;
  reference: string;
  status: BookingStatus;
  status_label: string;
  created_at: string;
  whatsapp_clicked_at: string | null;
  user: { id: number; email: string; full_name: string; phone: string };
  session: TestSession;
  examinee: Examinee;
  candidate_name: string;
  candidate_phone: string;
  candidate_email: string;
  date_of_birth: string | null;
  province: string;
  district: string;
  municipality: string;
  has_passport_front: boolean;
  has_passport_back: boolean;
  admin_notes: string;
  whatsapp_url: string;
}

export interface StaffInquiry {
  id: number;
  name: string;
  phone: string;
  email: string;
  preferred_city_name: string;
  test_type_name: string;
  format: TestFormat | "";
  format_label: string;
  preferred_month: string;
  message: string;
  status: InquiryStatus;
  status_label: string;
  admin_notes: string;
  created_at: string;
}

export interface StaffSession {
  id: number;
  date: string;
  weekday: string;
  provider: ProviderCode;
  provider_label: string;
  slot: "morning" | "afternoon";
  city: number;
  city_name: string;
  venue: number | null;
  venue_name: string;
  test_type: number;
  test_type_name: string;
  format: TestFormat;
  format_label: string;
  fee_npr: number;
  seats_total: number;
  seats_booked: number;
  seat_status: SeatStatus;
  registration_closes_on: string;
  results_date: string;
  speaking_note: string;
  is_visible: boolean;
  notes: string;
  booking_count: number;
}

export interface StaffMeta {
  cities: { id: number; name: string; venues: { id: number; name: string }[] }[];
  test_types: { id: number; name: string; is_ukvi: boolean }[];
  providers: { value: ProviderCode; label: string }[];
  formats: { value: TestFormat; label: string }[];
}

export interface StaffSettings {
  whatsapp_number: string;
  booking_message_template: string;
  inquiry_message_template: string;
  contact_email: string;
  contact_phone: string;
  office_address: string;
  low_seat_threshold: number;
  announcement: string;
  footer_disclaimer: string;
}
