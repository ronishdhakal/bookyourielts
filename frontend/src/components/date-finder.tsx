import type { City, TestType } from "@/lib/types";

/** Plain GET form: works without JavaScript and sends the student to the filtered schedule. */
export function DateFinder({ cities, types }: { cities: City[]; types: TestType[] }) {
  return (
    <form
      action="/ielts-test-dates"
      method="get"
      className="grid gap-3 sm:grid-cols-2"
      aria-label="Find IELTS dates"
    >
      <div>
        <label htmlFor="hf-city" className="field-label">
          City
        </label>
        <select id="hf-city" name="city" className="field-input" defaultValue="">
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="hf-type" className="field-label">
          Test type
        </label>
        <select id="hf-type" name="test_type" className="field-input" defaultValue="">
          <option value="">All test types</option>
          {types.map((t) => (
            <option key={t.code} value={t.code}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="hf-format" className="field-label">
          Format
        </label>
        <select id="hf-format" name="test_format" className="field-input" defaultValue="">
          <option value="">Any format</option>
          <option value="computer">Computer-delivered</option>
          <option value="computer_wop">Computer with Writing on Paper</option>
        </select>
      </div>
      <div className="flex items-end">
        <button type="submit" className="btn btn-primary w-full">
          Show open dates
        </button>
      </div>
    </form>
  );
}
