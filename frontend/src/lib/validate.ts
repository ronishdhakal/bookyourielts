/** Client-side checks mirror the API rules so students get instant, specific messages. */
export function validatePhone(raw: string): string | null {
  let d = raw.replace(/[\s\-().]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("977") && d.length === 13) d = d.slice(3);
  else if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  if (!/^9[78]\d{8}$/.test(d))
    return "Enter a Nepali mobile number, like 98XXXXXXXX or +977 98XXXXXXXX.";
  return null;
}

export function validateEmail(v: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : "Enter a valid email address.";
}

export function validatePassword(v: string): string | null {
  if (v.length < 8) return "Use at least 8 characters.";
  if (/^\d+$/.test(v)) return "Add some letters; a password cannot be only numbers.";
  return null;
}

const PASSPORT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/** Quick browser-side check. The server re-checks the file type, size and contents. */
export function validatePassportFile(file: File): string | null {
  if (!PASSPORT_TYPES.includes(file.type)) return "Upload a JPG, PNG, WebP or PDF file.";
  if (file.size > 10 * 1024 * 1024)
    return "The file is larger than 10 MB. Choose a smaller photo or scan.";
  return null;
}

export function validateDob(v: string): string | null {
  if (!v) return "Enter the date of birth.";
  const d = new Date(`${v}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "Enter a valid date.";
  const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (age < 14) return "Candidates must be at least 14 years old.";
  if (age > 100) return "Check the year of birth.";
  return null;
}
