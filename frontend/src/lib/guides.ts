/**
 * Informational guides. One primary keyword each. Copy lives in the page files and uses only facts
 * already stated on the site or held in the database; anything unknown is listed in SEO_OPEN_QUESTIONS.md.
 */
export interface Guide {
  path: string;
  /** Footer / link text. */
  label: string;
  title: string;
  description: string;
}

export const GUIDES: Guide[] = [
  {
    path: "/ielts-registration-deadline-nepal",
    label: "IELTS registration deadline",
    title: "IELTS Registration Deadline in Nepal: When Booking Closes",
    description:
      "When does IELTS registration close in Nepal? It usually closes about six days before the test. See how to find the exact closing date for each IELTS date.",
  },
  {
    path: "/ielts-cancellation-refund-nepal",
    label: "IELTS cancellation and refund",
    title: "IELTS Cancellation, Transfer & Refund in Nepal",
    description:
      "How IELTS cancellation, transfer and refund requests work in Nepal: who sets the rules, what to tell us, and why it pays to ask as early as you can.",
  },
  {
    path: "/ielts-results-date-nepal",
    label: "IELTS results date",
    title: "IELTS Results Date in Nepal: How Long Do Results Take?",
    description:
      "How long IELTS results take in Nepal: about three to five days on computer, around thirteen with Writing on Paper. Each date shows its results date.",
  },
  {
    path: "/documents-required-for-ielts-nepal",
    label: "Documents required for IELTS",
    title: "Documents Required for IELTS in Nepal: What to Bring",
    description:
      "What you need for IELTS in Nepal: your original passport, the one you registered with, and your booking confirmation. Plus what to leave outside the test room.",
  },
  {
    path: "/ielts-test-centres-nepal",
    label: "IELTS test cities in Nepal",
    title: "IELTS Test Centres and Cities in Nepal",
    description:
      "Cities in Nepal where IELTS is held, which ones have open dates right now, and how the test session and venue are confirmed after you book.",
  },
];

export const guide = (path: string): Guide => {
  const g = GUIDES.find((x) => x.path === path);
  if (!g) throw new Error(`Unknown guide ${path}`);
  return g;
};
