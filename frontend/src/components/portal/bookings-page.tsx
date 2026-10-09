"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { portalHref } from "@/lib/portal";
import { useAuth } from "../auth-provider";
import { BookingsList } from "./bookings";
import { ProfileCard } from "./profile-card";

/** The bookings list: profile on the left, exam bookings on the right. */
export function BookingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  if (!user) return null;
  return (
    <>
      <div className="mb-6 flex items-start gap-3">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => router.push(portalHref("/"))}
          className="border-mist hover:border-ink flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-white text-xl"
        >
          ‹
        </button>
        <div>
          <h1 className="text-2xl leading-tight font-bold md:text-3xl">Bookings</h1>
          <p className="text-muted text-[0.875rem]">
            <Link href={portalHref("/")} className="hover:underline">
              Home
            </Link>{" "}
            / Bookings
          </p>
        </div>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <ProfileCard user={user} />
        <section className="panel panel-pad" aria-labelledby="exam-bookings">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 id="exam-bookings" className="text-xl font-bold md:text-2xl">
              Exam bookings
            </h2>
            <Link href={portalHref("/book")} className="btn btn-primary btn-sm">
              Book an exam
            </Link>
          </div>
          <BookingsList />
        </section>
      </div>
    </>
  );
}
