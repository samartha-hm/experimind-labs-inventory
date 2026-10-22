import { build } from 'esbuild';
import { chromium, expect } from '@playwright/test';
import type { Express } from 'express';
import type { TrustedPackingView } from '../../features/packing/trustedPackingTypes';
import { qcChecks } from '../../features/packing/packingTypes';

/** Real component and restricted HTTP; only the already-authenticated profile is bootstrapped. */
export async function verifyPackingBrowser(app:Express,base:string,access:string,profile:{id:string},view:TrustedPackingView) {
  const compiled=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';
    import Panel from './src/features/packing/TrustedPackingPanel';createRoot(document.getElementById('root')).render(<Panel/>);`,
    resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,outfile:'packing-test.js',format:'iife',jsx:'automatic',
    plugins:[{name:'test-profile',setup(b){b.onResolve({filter:/AuthContext$/},()=>({path:'profile',namespace:'test'}));
      b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:"export const useAuth=()=>({currentUser:JSON.parse(localStorage.getItem('test_profile'))});"}));}}]});
  app.get('/packing-test',(_req,res)=>res.type('html').send('<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/packing-test.css"><div id="root"></div><script src="/packing-test.js"></script>'));
  for(const extension of ['js','css'])app.get(`/packing-test.${extension}`,(_req,res)=>res.type(extension).send(compiled.outputFiles.find(f=>f.path.endsWith('.'+extension))!.text));
  const plan=view.plans.find(p=>p.inspections.some(q=>q.decision==='accept'))!,qc=plan.inspections.find(q=>q.decision==='accept')!;
  const browser=await chromium.launch({channel:'msedge',headless:true,ignoreDefaultArgs:['--no-sandbox']});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}}),errors:string[]=[];
    page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
    const pending={path:'/operator/packing/inspections',key:(qc as unknown as {operation_key:string}).operation_key,
      input:{plan:plan.id,package:qc.package_id,allocationRevision:qc.allocation_revision,decision:qc.decision,checks:qc.checks,notes:qc.notes}};
    await page.addInitScript(({access,profile,organization,pending})=>{
      localStorage.setItem('experimind_auth_token',access);localStorage.setItem('test_profile',JSON.stringify({...profile,role:'admin',organization_id:organization}));
      sessionStorage.setItem(`packing.pending.${organization}.${profile.id}`,JSON.stringify(pending));
    },{access,profile,organization:plan.organization_id,pending});
    await page.goto(`${base}/packing-test?trusted_packing_package=${qc.package_id}`);
    await expect(page.getByRole('combobox',{name:'Physical package'})).toHaveValue(qc.package_id);
    await page.getByRole('button',{name:'Retry saved packing request'}).focus();await page.keyboard.press('Enter');
    await expect(page.getByRole('status')).toContainText(qc.id);
    await expect(page.getByRole('button',{name:'Allocate physical output'})).toBeDisabled();
    await expect(page.getByText(qc.notes,{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Preview package label'}).click();
    await expect(page.getByTitle('Trusted package label preview')).toHaveAttribute('src',/^blob:/);
    const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Download package label'}).click();
    expect((await downloaded).suggestedFilename()).toMatch(/^PK-.*\.pdf$/);
    const rejected=plan.inspections.find(q=>q.decision==='reject')!;
    await page.getByRole('combobox',{name:'Physical package'}).selectOption(rejected.package_id);
    await expect(page.getByText(rejected.notes,{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Allocate physical output'})).toBeDisabled();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const root=plan.snapshot.packages.find(p=>p.parent_id===null)!;
    await page.getByRole('combobox',{name:'Physical package'}).selectOption(root.id);
    await expect(page.getByRole('button',{name:'Accept six-check QC'})).toBeDisabled();
    for(const check of qcChecks){await page.getByLabel(`${check} passed`,{exact:true}).check();await page.getByLabel(`${check} evidence`,{exact:true}).fill('Physical inspection evidence');}
    await page.getByLabel('Inspection notes',{exact:true}).fill('Rejected child must prevent parent acceptance');
    await page.getByLabel('I physically inspected this package and confirm the recorded evidence.').check();
    await page.getByRole('button',{name:'Accept six-check QC'}).click();
    await expect(page.getByRole('alert')).toContainText('Packing denied');
    await expect(page.getByRole('button',{name:'Retry saved packing request'})).toBeVisible();
    await page.setViewportSize({width:1024,height:768});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole('button',{name:'Refresh packing evidence'}).click();expect(errors).toEqual([]);
  } finally {await browser.close();}
}
