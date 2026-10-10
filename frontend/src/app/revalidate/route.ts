import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { CATALOG_TAG } from "@/lib/server-api";

/**
 * On-demand revalidation. Django calls this when sessions, fees, cities or content change, so
 * the date and fee pages are fresh without waiting for the ISR window.
 * Needs REVALIDATE_SECRET (same value on the Django side). Without it the route is disabled.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  const given = req.headers.get("x-revalidate-secret") ?? "";
  const ok =
    !!secret &&
    given.length === secret.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });
  revalidateTag(CATALOG_TAG, { expire: 0 });
  return NextResponse.json({ ok: true });
}
