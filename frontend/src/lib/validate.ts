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
