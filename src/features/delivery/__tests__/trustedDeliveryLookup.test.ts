import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { TrustedPackingView } from '../../packing/trustedPackingTypes';
import type { TrustedDeliveryView, TrustedDispatch } from '../trustedDeliveryTypes';
import { trustedPackageDestination } from '../../packing/trustedPackingLabels';
import { trustedDeliveryLookup } from '../trustedDeliveryLookup';

const origin='https://erp.example', root=randomUUID(), child=randomUUID(), project=randomUUID(), plan=randomUUID();
const dispatch={id:randomUUID(),plan_id:plan,project_id:project,roots:[root],receipts:[],snapshot:{site_name:'Synthetic school',packages:[{id:root,kind:'kit',parent_id:null},{id:child,kind:'pouch',parent_id:root}]}} as unknown as TrustedDispatch;
const packing:TrustedPackingView={enabled:true,plans:[],outputs:[]}, delivery:TrustedDeliveryView={enabled:true,dispatches:[dispatch]};
const lookup=(input:string,scope?:string)=>trustedDeliveryLookup(input,origin,packing,delivery,scope);

describe('manifest QR to tenant-scoped dispatch lookup',()=>{
  it.each([child,`PK-${child}`,`pk-${child.toUpperCase()}`,trustedPackageDestination(origin,child)])('resolves child label %s using the frozen dispatch without a packing plan',input=>{
    const before=JSON.stringify({packing,delivery});
    expect(lookup(input,project)).toEqual({planId:plan,projectId:project,root,dispatchId:dispatch.id,siteName:'Synthetic school'});
    expect(JSON.stringify({packing,delivery})).toBe(before);
  });
  it('does not disclose a dispatch outside the selected project or loaded tenant evidence',()=>{
    expect(()=>lookup(child,randomUUID())).toThrow('unavailable for this tenant');
    expect(()=>lookup(randomUUID())).toThrow('unavailable for this tenant');
  });
  it.each([`https://other.example/?trusted_packing_package=${child}`,`https://user:pass@erp.example/?trusted_packing_package=${child}`,`${origin}/?trusted_packing_package=${child}&trusted_packing_package=${root}`,`${origin}/private?trusted_packing_package=${child}`])('rejects untrusted or ambiguous URLs',input=>expect(()=>lookup(input)).toThrow('this ERP'));
  it('rejects malformed labels and incomplete assembly ancestry',()=>{
    expect(()=>lookup('unavailable-package')).toThrow('Invalid package label');
    const invalid={...dispatch,snapshot:{...dispatch.snapshot,packages:[dispatch.snapshot.packages[1]]}};
    expect(()=>trustedDeliveryLookup(child,origin,packing,{...delivery,dispatches:[invalid]})).toThrow('complete kit');
  });
  it('rejects conflicting custody instead of arbitrarily selecting a manifest',()=>{
    expect(()=>trustedDeliveryLookup(child,origin,packing,{...delivery,dispatches:[dispatch,{...dispatch,id:randomUUID()}]})).toThrow('Ambiguous dispatch custody');
  });
  it('resolves an undispatched kit without selecting or acknowledging physical units',()=>{
    const plans={...packing,plans:[{id:plan,project_id:project,snapshot:dispatch.snapshot} as TrustedPackingView['plans'][number]]};
    expect(trustedDeliveryLookup(child,origin,plans,{enabled:true,dispatches:[]})).toHaveProperty('dispatchId','');
  });
});
