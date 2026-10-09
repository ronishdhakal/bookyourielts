"use client";

import { useState } from "react";
import { ApiError, candidateApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { SavedCandidate } from "@/lib/types";
import { useLoader } from "@/lib/use-loader";
import { ErrorNoteSimple } from "./simple";
import {
  EMPTY_PERSON,
  PersonFields,
  appendPerson,
  personFromCandidate,
  validatePerson,
  type PersonErrors,
  type PersonForm,
} from "./person";

/** People the student books for. Saved once, picked in one tap when booking. */
export function Candidates() {
  const list = useLoader("candidates", () => candidateApi.list());
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [person, setPerson] = useState<PersonForm>(EMPTY_PERSON);
  const [errors, setErrors] = useState<PersonErrors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [askDelete, setAskDelete] = useState<number | null>(null);

  function start(c?: SavedCandidate) {
    setEditing(c ? c.id : "new");
    setPerson(c ? personFromCandidate(c) : { ...EMPTY_PERSON });
    setErrors({});
    setError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const v = validatePerson(person);
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      appendPerson(form, person, "candidate");
      if (editing === "new") await candidateApi.create(form);
      else if (typeof editing === "number") await candidateApi.update(editing, form);
      setEditing(null);
      list.reload();
    } catch (er) {
      setError(er instanceof ApiError ? er.message : "Could not save this candidate.");
    }
    setBusy(false);
  }

  async function remove(id: number) {
    setBusy(true);
    try {
      await candidateApi.remove(id);
      setAskDelete(null);
      list.reload();
    } catch (er) {
      setError(er instanceof ApiError ? er.message : "Could not delete.");
    }
    setBusy(false);
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Candidates</h1>
          <p className="text-muted mt-1 max-w-2xl">
            Save the people you book for, such as a child, a sibling or a client. Their details and
            passport are reused, so each new booking takes a few taps.
          </p>
        </div>
        {editing === null && (
          <button type="button" className="btn btn-primary" onClick={() => start()}>
            Add a candidate
          </button>
        )}
      </div>

      {list.error && <ErrorNoteSimple message={list.error} onRetry={list.reload} />}

      {editing !== null && (
        <form onSubmit={save} noValidate className="panel panel-pad mb-6 max-w-3xl">
          <h2 className="mb-5 text-xl font-bold">
            {editing === "new" ? "Add a candidate" : "Edit candidate"}
          </h2>
          <PersonFields
            value={person}
            onChange={(p) => {
              setPerson(p);
              setErrors({});
            }}
            errors={errors}
            idPrefix="cd"
            showRelation
            saved={
              typeof editing === "number"
                ? (() => {
                    const c = list.data?.find((x) => x.id === editing);
                    return c
                      ? { front: c.has_passport_front, back: c.has_passport_back }
                      : undefined;
                  })()
                : undefined
            }
          />
          {error && (
            <p role="alert" className="field-error mt-4">
              {error}
            </p>
          )}
          <div className="border-mist mt-6 flex gap-3 border-t pt-5">
            <button type="submit" className="btn btn-dark" disabled={busy}>
              {busy ? "Saving…" : "Save candidate"}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setEditing(null)}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {list.loading ? (
        <div
          className="skeleton-light h-32 rounded-lg"
          role="status"
          aria-label="Loading candidates"
        />
      ) : (list.data ?? []).length === 0 && editing === null ? (
        <div className="panel px-6 py-14 text-center">
          <h2 className="text-xl font-bold">No saved candidates yet</h2>
          <p className="text-muted mx-auto mt-1 max-w-md">
            They are also saved automatically when you book for someone new and tick “Save to my
            candidates”.
          </p>
          <button type="button" className="btn btn-primary mt-5" onClick={() => start()}>
            Add a candidate
          </button>
        </div>
      ) : (
        <ul className="panel divide-mist divide-y overflow-hidden">
          {(list.data ?? []).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="font-semibold">
                  {c.full_name}
                  {c.relation && <span className="text-muted font-normal"> · {c.relation}</span>}
                </p>
                <p className="text-muted text-[0.875rem]">
                  {c.phone || "No mobile"} ·{" "}
                  {c.date_of_birth ? formatDate(c.date_of_birth) : "No date of birth"} · Passport{" "}
                  {c.has_passport_front ? "saved" : "not saved"}
                </p>
              </div>
              {askDelete === c.id ? (
                <div
                  role="alertdialog"
                  aria-label={`Delete ${c.full_name}`}
                  className="flex items-center gap-2"
                >
                  <span className="text-[0.9375rem] font-semibold">Delete?</span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={busy}
                    onClick={() => void remove(c.id)}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setAskDelete(null)}
                  >
                    No
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => start(c)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setAskDelete(c.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
