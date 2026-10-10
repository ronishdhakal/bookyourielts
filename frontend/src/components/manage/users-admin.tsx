"use client";

import { manageApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useLoader } from "@/lib/use-loader";
import { useQueryState } from "@/lib/use-query-state";
import {
  EmptyRow,
  ErrorNote,
  PageTitle,
  Pager,
  SearchBox,
  SkeletonRows,
  Tabs,
  relativeTime,
} from "./ui";

const PAGE = 24;
type Role = "all" | "student" | "staff" | "unverified";

function waLink(phone: string, name: string) {
  return `https://wa.me/${phone.replace(/^\+/, "")}?text=${encodeURIComponent(`Hi ${name}, this is bookyourielts.com.`)}`;
}

export function UsersAdmin() {
  const q = useQueryState();
  const role = (q.get("role") || "all") as Role;
  const page = Number(q.get("page") || 1);
  const list = useLoader(`users|${q.key}`, (signal) =>
    manageApi.users({ role: role === "all" ? "" : role, q: q.get("q"), page }, signal),
  );

  return (
    <>
      <PageTitle
        title="Users"
        lede="Everyone who has created an account. Open the Django admin to edit or deactivate an account."
      />
      <Tabs
        label="Role"
        value={role}
        onChange={(v) => q.set({ role: v === "all" ? "" : v })}
        items={[
          { value: "all", label: "All" },
          { value: "student", label: "Students" },
          { value: "staff", label: "Staff" },
          { value: "unverified", label: "Email not verified" },
        ]}
      />
      <div className="my-4 flex items-center gap-4">
        <SearchBox
          label="Search users"
          placeholder="Search name, phone or email"
          value={q.get("q")}
          onChange={(v) => q.set({ q: v })}
        />
        {list.data && (
          <p className="text-muted text-sm" role="status">
            {list.data.count} {list.data.count === 1 ? "user" : "users"}
          </p>
        )}
      </div>
      {list.error ? (
        <ErrorNote message={list.error} onRetry={list.reload} />
      ) : list.loading ? (
        <SkeletonRows />
      ) : !list.data || list.data.results.length === 0 ? (
        <EmptyRow title="No users here" text="Accounts appear when students register." />
      ) : (
        <ul
          className={`panel divide-mist divide-y overflow-hidden ${list.refreshing ? "opacity-70" : ""}`}
        >
          {list.data.results.map((u) => (
            <li
              key={u.id}
              className="grid items-center gap-x-4 gap-y-1 px-4 py-3.5 sm:grid-cols-[1fr_auto_8rem]"
            >
              <div className="min-w-0">
                <p className="font-semibold">
                  {u.full_name || u.email}
                  {u.is_staff && (
                    <span className="bg-ink ml-2 rounded px-1.5 py-0.5 text-xs font-semibold text-white">
                      Staff
                    </span>
                  )}
                  {!u.is_active && <span className="text-muted ml-2 text-xs">Deactivated</span>}
                </p>
                <p className="text-muted truncate text-[0.875rem]">
                  {u.email}
                  {!u.email_verified && " · email not verified"}
                  {u.phone && (
                    <>
                      {" · "}
                      <a
                        href={waLink(u.phone, u.full_name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4"
                      >
                        {u.phone}
                      </a>
                    </>
                  )}
                </p>
              </div>
              <p className="text-[0.9375rem] font-semibold">
                {u.booking_count} {u.booking_count === 1 ? "booking" : "bookings"}
              </p>
              <p
                className="text-muted text-[0.8125rem] sm:text-right"
                title={formatDate(u.date_joined.slice(0, 10))}
              >
                Joined {relativeTime(u.date_joined)}
              </p>
            </li>
          ))}
        </ul>
      )}
      {list.data && (
        <Pager
          page={page}
          count={list.data.count}
          size={PAGE}
          onPage={(p) => q.set({ page: String(p) })}
        />
      )}
    </>
  );
}
