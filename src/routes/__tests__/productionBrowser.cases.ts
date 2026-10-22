import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import type { Express } from "express";

/** Component harness: real restricted HTTP and session; test-only profile bootstrap. */
export async function verifyProductionBrowser(app:Express,base:string,access:string,profile:{id:string},output:any) {
  const compiled=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';
    import Panel from './src/features/production/TrustedProductionPanel';createRoot(document.getElementById('root')).render(<Panel/>);`,
    resolveDir:process.cwd(),loader:"tsx"},bundle:true,write:false,format:"iife",jsx:"automatic",
    plugins:[{name:"test-profile",setup(b){b.onResolve({filter:/AuthContext$/},()=>({path:"profile",namespace:"test"}));
      b.onLoad({filter:/.*/,namespace:"test"},()=>({contents:"export const useAuth=()=>({currentUser:JSON.parse(localStorage.getItem('test_profile'))});"}));}}]});
  app.get("/operator-test",(_req,res)=>res.type("html").send('<div id="root"></div><script src="/operator-test.js"></script>'));
  app.get("/operator-test.js",(_req,res)=>res.type("js").send(compiled.outputFiles[0].text));
  const browser=await chromium.launch({channel:"msedge",headless:true,ignoreDefaultArgs:["--no-sandbox"]});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}}),errors:string[]=[];
    page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(8000);
    page.on("pageerror",e=>errors.push(e.message));
    const pending={key:output.operation_key,path:`/operator/orders/${output.order_id}/finished-outputs`,
      input:{order:output.order_id,source:output.source_id,quantity:output.quantity,unit:output.unit,location:output.location}};
    await page.addInitScript(({access,profile,pending})=>{
      localStorage.setItem("experimind_auth_token",access);localStorage.setItem("test_profile",JSON.stringify({...profile,role:"admin"}));
      sessionStorage.setItem(`production.pending.${profile.id}`,JSON.stringify(pending));
    },{access,profile,pending});
    await page.goto(base+"/operator-test");
    await expect(page.getByRole("button",{name:"Retry saved request"})).toBeEnabled();
    await page.getByRole("button",{name:"Retry saved request"}).focus();await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toContainText(output.id);
    await expect(page.getByRole("button",{name:"Retry saved request"})).toHaveCount(0);
    await page.getByRole("combobox",{name:/^Work order/}).selectOption(output.order_id);
    await expect(page.getByText(`Identity: ${output.qr}`,{exact:true})).toBeVisible();
    await page.getByRole("combobox",{name:/^Operation/}).selectOption("output");
    await expect(page.getByRole("button",{name:"Record pending-QC output"})).toBeDisabled();
    await page.getByRole("button",{name:"Refresh evidence"}).click();
    expect(errors).toEqual([]);
  } finally {await browser.close();}
}
