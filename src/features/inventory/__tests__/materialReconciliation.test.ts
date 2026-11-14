import { describe, expect, it } from 'vitest';
import { diagnoseMaterial, exactQuantity } from '../materialReconciliation';
import { reconciliationFixtures } from './materialReconciliation.fixtures';

describe('read-only material reconciliation',()=>{
  for(const fixture of reconciliationFixtures) it(fixture.name,()=>{
    const before=JSON.stringify(fixture.lanes);
    const result=diagnoseMaterial(fixture.lanes,1);
    for(const kind of fixture.expected) expect(result.some(i=>i.kind===kind)).toBe(true);
    expect(JSON.stringify(fixture.lanes)).toBe(before);
    expect(diagnoseMaterial(structuredClone(fixture.lanes),1)).toEqual(result);
  });
  it('uses exact six-place quantities beyond Number precision',()=>{
    expect(exactQuantity('9007199254740993.000001')-exactQuantity('9007199254740993')).toBe(1n);
    for(const value of [1,undefined,'NaN','1e3','0.0000001']) expect(()=>exactQuantity(value)).toThrow();
  });
  it('preserves school, grade, subject and unlike unit dimensions',()=>{
    const fixture=reconciliationFixtures.find(f=>f.name==='shared SKU across schools')!;
    const issues=diagnoseMaterial(fixture.lanes,1);
    expect(issues.map(i=>i.identity)).toEqual(['procurement-A','procurement-B']);
    expect(issues[0].detail).toContain('kg; school school-A');
    expect(issues[1].detail).toContain('pcs; school school-B');
    expect(fixture.lanes[0].rows[0].selector).toEqual({item:'shared',grade:'8',subject:'Science'});
  });
  it('keeps adjacent half-open coverage disjoint and detects sub-unit overlap',()=>{
    const lanes=structuredClone(reconciliationFixtures.find(f=>f.name==='duplicate source coverage')!.lanes);
    lanes[0].rows[1].start_quantity='3';
    expect(diagnoseMaterial(lanes,1)).toEqual([]);
    lanes[0].rows[1].start_quantity='2.999999';
    expect(diagnoseMaterial(lanes,1)[0].kind).toBe('conflicting claims');
  });
  it('reports cache/claim conservation failures, stale revisions and incomplete sources',()=>{
    const lanes=structuredClone(reconciliationFixtures[0].lanes);
    Object.assign(lanes[0].rows[0],{held:'11',claim_held:'10'});
    lanes.push({source:'entitlements',available:true,truncated:false,rows:[{id:'approval-old',revision:0}]});
    lanes.push({source:'events',available:false,truncated:false,rows:[]});
    const kinds=diagnoseMaterial(lanes,1).map(i=>i.kind);
    expect(kinds).toContain('conflicting claims');expect(kinds).toContain('stale source');expect(kinds).toContain('missing provenance');
  });
});
