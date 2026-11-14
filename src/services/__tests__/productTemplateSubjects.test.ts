import { describe, it, expect } from "vitest";
import { normalizeSubjects, DraftKitError } from "../ProductTemplateService.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const grade = (name: string, id?: string) => ({ id: id ?? crypto.randomUUID(), name });
const subject = (name: string, grades: unknown[] = [], id?: string) => ({ id: id ?? crypto.randomUUID(), name, grades });

describe("normalizeSubjects", () => {
  it("accepts a generic Prastuti-style structure and preserves order and identifiers", () => {
    const scienceGrades = [grade("Grade 8"), grade("Grade 9"), grade("Grade 10")];
    const mathsGrades = [grade("Grade 8"), grade("Grade 9"), grade("Grade 10")];
    const input = [subject("Science", scienceGrades), subject("Mathematics", mathsGrades)];
    const result = normalizeSubjects(input);
    expect(result.map(s => s.name)).toEqual(["Science", "Mathematics"]);
    expect(result[0].grades.map(g => g.name)).toEqual(["Grade 8", "Grade 9", "Grade 10"]);
    expect(result[0].id).toBe(input[0].id);
    expect(result[0].grades[2].id).toBe(scienceGrades[2].id);
    expect(result.every(s => uuid.test(s.id))).toBe(true);
  });
  it("trims names and assigns identifiers to new entries", () => {
    const result = normalizeSubjects([{ name: "  Science  ", grades: [{ name: " Grade 8 " }] }]);
    expect(result[0].name).toBe("Science");
    expect(result[0].grades[0].name).toBe("Grade 8");
    expect(uuid.test(result[0].id)).toBe(true);
    expect(uuid.test(result[0].grades[0].id)).toBe(true);
  });
  it("defaults missing grades to an empty list", () => {
    const result = normalizeSubjects([subject("Science")]);
    expect(result[0].grades).toEqual([]);
  });
  it("rejects non-list and oversized structures", () => {
    for (const value of ["Science", 12, null, {}, Array.from({ length: 101 }, () => subject("S"))]) {
      expect(() => normalizeSubjects(value)).toThrow(DraftKitError);
    }
  });
  it("rejects invalid entries and names", () => {
    for (const value of [["Science"], [null], [12], [subject("")], [subject("x".repeat(101))], [subject("Science", ["Grade 8"]), ], [subject("Science", [null])], [subject("Science", [grade("")])], [subject("Science", [grade("x".repeat(101))])]]) {
      expect(() => normalizeSubjects(value)).toThrow(DraftKitError);
    }
  });
  it("rejects duplicate subject names case-insensitively", () => {
    expect(() => normalizeSubjects([subject("Science"), subject("science")])).toThrow(/Subject names must be unique/);
  });
  it("rejects duplicate grade names within a subject but allows them across subjects", () => {
    expect(() => normalizeSubjects([subject("Science", [grade("Grade 8"), grade("GRADE 8")])])).toThrow(/unique within a subject/);
    const result = normalizeSubjects([subject("Science", [grade("Grade 8")]), subject("Mathematics", [grade("Grade 8")])]);
    expect(result[1].grades[0].name).toBe("Grade 8");
  });
  it("rejects malformed and duplicate identifiers", () => {
    expect(() => normalizeSubjects([subject("Science", [], "not-a-uuid")])).toThrow(/valid UUID/);
    expect(() => normalizeSubjects([subject("Science", [grade("Grade 8", "bad-id")])])).toThrow(/valid UUID/);
    const shared = crypto.randomUUID();
    expect(() => normalizeSubjects([subject("Science", [], shared), subject("Maths", [], shared)])).toThrow(/unique/);
    expect(() => normalizeSubjects([subject("Science", [grade("Grade 8", shared)], shared)])).toThrow(/unique/);
  });
  it("rejects grades that are not a list", () => {
    expect(() => normalizeSubjects([subject("Science", "Grade 8" as unknown as unknown[])])).toThrow(/Grades must be a list/);
  });
});
