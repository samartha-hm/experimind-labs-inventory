import { describe, expect, it } from 'vitest';
import { planningTraceLabel } from './planningTraceLabel';
import { planningFixture } from './__tests__/planningFixture';

describe('readable planning trace references', () => {
  it('resolves grade identities to their subjects without changing quantities or unknown references', () => {
    const { subjects } = planningFixture();
    const grade = subjects[0].grades[0];
    const unknown = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const basis = `Explicit complete sets: 2; ${grade.id} × 1, ${unknown} × 3; 0.3 × 2`;
    expect(planningTraceLabel(basis, subjects)).toBe(`Explicit complete sets: 2; ${subjects[0].name} / ${grade.name} × 1, ${unknown} × 3; 0.3 × 2`);
    expect(planningTraceLabel(basis, [])).toBe(basis);
  });
});
