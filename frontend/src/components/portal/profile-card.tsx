"use client";

import Link from "next/link";
import { formatDate } from "@/lib/format";
import { portalHref } from "@/lib/portal";
import type { User } from "@/lib/types";

function Icon({ d }: { d: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="text-muted shrink-0"
    >
      <path d={d} />
    </svg>
  );
}

const PHONE =
  "M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z";
const MAIL = "M4 6h16v12H4zM4 7l8 6 8-6";
const CAL = "M5 5h14v15H5zM5 10h14M9 3v4M15 3v4";

/** Who the student is: the left column of every portal page. */
export function ProfileCard({ user }: { user: User }) {
  const missing = !user.phone || !user.date_of_birth || !user.email_verified;
  return (
    <section className="panel p-6" aria-label="Your profile">
      <div className="flex flex-col items-center text-center">
        <span
          className="flex h-28 w-28 items-end justify-center overflow-hidden rounded-full bg-[#c9ced5]"
          aria-hidden
        >
          <svg viewBox="0 0 100 100" className="h-24 w-24 text-white" fill="currentColor">
            <circle cx="50" cy="36" r="18" />
            <path d="M14 100c0-22 16-36 36-36s36 14 36 36z" />
          </svg>
        </span>
        <h2 className="mt-4 text-xl font-bold">{user.full_name}</h2>
      </div>

      <div className="border-mist mt-4 rounded-md border px-4 py-3 text-center text-[0.8125rem]">
        <p>
          <span className="font-semibold">Status:</span>{" "}
          <span className="bg-ink ml-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white">
            Active
          </span>
        </p>
        <p className="text-muted mt-2">Member since: {formatDate(user.date_joined.slice(0, 10))}</p>
      </div>

      <dl className="border-mist mt-5 space-y-4 border-t pt-5 text-[0.9375rem]">
        <div>
          <dt className="text-muted text-[0.8125rem]">Mobile number</dt>
          <dd className="mt-0.5 flex items-center gap-2 font-medium">
            <Icon d={PHONE} />
            {user.phone || "Not added"}
          </dd>
        </div>
        <div>
          <dt className="text-muted text-[0.8125rem]">Email address</dt>
          <dd className="mt-0.5 flex items-center gap-2 font-medium break-all">
            <Icon d={MAIL} />
            {user.email}
            {!user.email_verified && (
              <span className="text-crimson shrink-0 text-xs font-semibold">Not verified</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted text-[0.8125rem]">Date of birth</dt>
          <dd className="mt-0.5 flex items-center gap-2 font-medium">
            <Icon d={CAL} />
            {user.date_of_birth ? formatDate(user.date_of_birth) : "N/A"}
          </dd>
        </div>
      </dl>

      {missing && (
        <Link
          href={portalHref("/profile")}
          className="text-crimson mt-5 inline-block text-[0.9375rem] font-semibold underline underline-offset-4"
        >
          Complete your profile
        </Link>
      )}
    </section>
  );
}
