import type { Examinee, ProviderCode, TestFormat } from "@/lib/types";

export interface Prefs {
  provider: ProviderCode | "";
  category: "regular" | "ukvi";
  testType: string;
  format: TestFormat | "";
  city: string;
}

export const EMPTY_PREFS: Prefs = {
  provider: "",
  category: "regular",
  testType: "",
  format: "",
  city: "",
};

export interface DetailsForm {
  examinee: Examinee;
  name: string;
  phone: string;
  email: string;
  dob: string;
  province: string;
  district: string;
  municipality: string;
  passportFront: File | null;
  passportBack: File | null;
  confirmed: boolean;
}

export const EMPTY_DETAILS: DetailsForm = {
  examinee: "self",
  name: "",
  phone: "",
  email: "",
  dob: "",
  province: "",
  district: "",
  municipality: "",
  passportFront: null,
  passportBack: null,
  confirmed: false,
};

export const PROVIDERS: { code: ProviderCode; label: string; blurb: string }[] = [
  {
    code: "british_council",
    label: "British Council IELTS",
    blurb: "Test sessions run by the British Council.",
  },
  { code: "idp", label: "IDP IELTS", blurb: "Test sessions run by IDP." },
];
