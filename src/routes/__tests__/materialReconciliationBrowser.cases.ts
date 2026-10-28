import { build } from 'esbuild';
import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import type { Express } from 'express';

/** Synthetic authenticated profile; real component, built stylesheet and read-only HTTP. */
export async function verifyMaterialReconciliationBrowser(app:Express,base:string,access:string,profile:{id:string},project:string,
  boundaries:{foreignProject:string;setDeniedRole:(denied:boolean)=>Promise<void>}) {
  const compiled=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';
    import Panel from './src/features/inventory/MaterialReconciliationPanel';createRoot(document.getElementById('root')).render(<Panel/>);`,
    resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',jsx:'automatic',
    plugins:[{name:'synthetic-profile',setup(b){b.onResolve({filter:/AuthContext$/},()=>({path:'profile',namespace:'test'}));
      b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:"export const useAuth=()=>({currentUser:JSON.parse(localStorage.getItem('test_profile'))});"}));}}]});
  const css=(await readdir('dist/assets')).find(f=>/^index-.*\.css$/.test(f));
  if(!css)throw Error('Build the application before browser acceptance');
  app.get('/reconciliation-test',(_req,res)=>res.type('html').send('<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/reconciliation-test.css"><main style="max-width:1200px;margin:auto;padding:16px"><div id="root"></div></main><script src="/reconciliation-test.js"></script>'));
  app.get('/reconciliation-test.js',(_req,res)=>res.type('js').send(compiled.outputFiles[0].text));
  const stylesheet=await readFile(`dist/assets/${css}`,'utf8');
  app.get('/reconciliation-test.css',(_req,res)=>res.type('css').send(stylesheet));
  const browser=await chromium.launch({channel:'msedge',headless:true,ignoreDefaultArgs:['--no-sandbox']});
  const evidence:Record<string,unknown>[]=[];
  try {
    const page=await browser.newPage(),errors:string[]=[],mutations:string[]=[];
    page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(r.method()!=='GET')mutations.push(r.method()+' '+r.url());});
    await page.addInitScript(({access,profile})=>{localStorage.setItem('experimind_auth_token',access);localStorage.setItem('test_profile',JSON.stringify(profile));},{access,profile});
    await mkdir('.local-dev/d6p-browser',{recursive:true});
    for(const [name,width,height] of [['desktop',1440,900],['tablet',768,1024],['phone',390,844]] as const) {
      await page.setViewportSize({width,height});await page.goto(base+'/reconciliation-test');
      await page.getByRole('textbox',{name:'Project UUID'}).fill(project);
      await page.getByRole('textbox',{name:'Project UUID'}).press('Tab');
      await expect(page.getByRole('button',{name:'Reconcile project'})).toBeFocused();await page.keyboard.press('Enter');
      await expect(page.getByText(/snapshot SHA-256/)).toBeVisible();
      await expect(page.getByRole('heading',{name:'Closure blockers'})).toBeVisible();
      await expect(page.getByText(/unresolved material ownership hold/).first()).toBeVisible();
      await page.locator('summary').first().focus();await page.keyboard.press('Enter');
      await expect(page.getByLabel('accounts source evidence',{exact:true})).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.screenshot({path:`.local-dev/d6p-browser/${name}.png`,fullPage:true});
      evidence.push({name,width,height,keyboard:true,no_overflow:true,residual_closure_blocker:true});
    }
    await page.getByRole('textbox',{name:'Project UUID'}).fill('invalid');await page.getByRole('button',{name:'Reconcile project'}).click();
    await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByText(/snapshot SHA-256/)).toHaveCount(0);
    const deniedRead=async(projectId:string,status:number)=>{
      await page.getByRole('textbox',{name:'Project UUID'}).fill(projectId);
      const response=page.waitForResponse(r=>r.url().includes('/material-reconciliation/'));
      await page.getByRole('button',{name:'Reconcile project'}).click();
      expect((await response).status()).toBe(status);
      await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByText(/snapshot SHA-256/)).toHaveCount(0);
    };
    await deniedRead(boundaries.foreignProject,404);
    await boundaries.setDeniedRole(true);
    try {await deniedRead(project,403);} finally {await boundaries.setDeniedRole(false);}
    expect(errors).toEqual([]);expect(mutations).toEqual([]);
    await writeFile('.local-dev/d6p-browser/acceptance.json',JSON.stringify({layouts:evidence,error_handling:true,tenant_denial:404,live_role_denial:403,no_mutations:true,console_errors:errors},null,2));
  } finally {await browser.close();}
}
