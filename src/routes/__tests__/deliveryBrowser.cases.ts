import { build } from 'esbuild';
import { chromium, expect } from '@playwright/test';
import type { Express } from 'express';
import type { TrustedDeliveryView } from '../../features/delivery/trustedDeliveryTypes';

export async function verifyDeliveryBrowser(app:Express,base:string,access:string,profile:{id:string},organization:string,view:TrustedDeliveryView,pending:{path:string;key:string;input:unknown;result:{id:string}}) {
  const compiled=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Panel from './src/features/delivery/TrustedDeliveryPanel';createRoot(document.getElementById('root')).render(<Panel/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,outfile:'delivery-test.js',format:'iife',jsx:'automatic',plugins:[{name:'profile',setup(b){b.onResolve({filter:/AuthContext$/},()=>({path:'profile',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:"export const useAuth=()=>({currentUser:JSON.parse(localStorage.getItem('test_profile'))});"}));}}]});
  app.get('/delivery-test',(_req,res)=>res.type('html').send('<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/delivery-test.css"><div id="root"></div><script src="/delivery-test.js"></script>'));
  for(const extension of ['js','css'])app.get(`/delivery-test.${extension}`,(_req,res)=>res.type(extension).send(compiled.outputFiles.find(f=>f.path.endsWith('.'+extension))!.text));
  const dispatch=view.dispatches.find(d=>d.id===pending.result.id)!;
  const browser=await chromium.launch({channel:'msedge',headless:true,ignoreDefaultArgs:['--no-sandbox']});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}}),errors:string[]=[];
    page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(({access,profile,organization,pending})=>{
      localStorage.setItem('experimind_auth_token',access);localStorage.setItem('test_profile',JSON.stringify({...profile,role:'admin',organization_id:organization}));
      sessionStorage.setItem(`delivery.pending.${organization}.${profile.id}`,JSON.stringify({...pending,path:`/operator/delivery/${pending.path}`}));
    },{access,profile,organization,pending});
    await page.goto(`${base}/delivery-test?trusted_packing_package=${dispatch.roots[0]}`);
    await page.getByRole('button',{name:'Retry saved delivery request'}).focus();await page.keyboard.press('Enter');
    await expect(page.getByRole('status')).toContainText(dispatch.id);
    await page.getByRole('button',{name:'Find dispatch package'}).click();
    await expect(page.getByRole('combobox',{name:'Dispatched school assemblies'})).toHaveValue(dispatch.id);
    await expect(page.getByText('2 acknowledged / 2 dispatched',{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Record evidenced school receipt'})).toBeDisabled();
    await expect(page.getByText('Project: closed',{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Record recipient acceptance and close project'})).toBeDisabled();
    await page.getByRole('button',{name:'Preview dispatch manifest'}).click();
    await expect(page.getByTitle('Dispatch manifest preview')).toHaveAttribute('src',/^blob:/);
    const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download dispatch manifest'}).click();
    expect((await download).suggestedFilename()).toBe(`dispatch-${dispatch.id}.pdf`);
    for(const width of [390,1024]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
    await page.getByLabel('Package label',{exact:true}).fill('unavailable-package');await page.getByRole('button',{name:'Find dispatch package'}).click();
    await expect(page.getByRole('alert')).toContainText('Package unavailable for this tenant');expect(errors).toEqual([]);
  } finally {await browser.close();}
}
