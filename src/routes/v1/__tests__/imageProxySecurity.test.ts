import { describe,expect,it,vi,afterEach } from "vitest";
import https from "node:https";
import { EventEmitter } from "node:events";
import { fetchRemoteBuffer,isAllowedImageTarget } from "../image-proxy";
afterEach(()=>vi.restoreAllMocks());
describe("public catalog image proxy boundary",()=>{
  it.each(["http://drive.google.com/a","https://127.0.0.1/a","https://[::1]/a","https://169.254.169.254/a","https://internal.example/a","https://drive.google.com.evil.test/a","https://user:secret@drive.google.com/a","https://drive.google.com:444/a","file:///a"])("blocks %s before network access",async target=>{
    const get=vi.spyOn(https,"get");expect(isAllowedImageTarget(target)).toBe(false);expect(await fetchRemoteBuffer(target)).toBeNull();expect(get).not.toHaveBeenCalled();
  });
  it("allows existing Google image providers",()=>{
    expect(isAllowedImageTarget("https://lh3.googleusercontent.com/d/synthetic=w600")).toBe(true);
    expect(isAllowedImageTarget("https://drive.google.com/thumbnail?id=synthetic")).toBe(true);
  });
  function remote(statusCode:number,headers:Record<string,string>,emit?:(res:EventEmitter)=>void){
    const response=Object.assign(new EventEmitter(),{statusCode,headers,resume:vi.fn(),destroy:vi.fn()});
    const request=Object.assign(new EventEmitter(),{destroy:vi.fn()});
    const get=vi.spyOn(https,"get").mockImplementation(((_url:unknown,_options:unknown,cb:(r:unknown)=>void)=>{
      queueMicrotask(()=>{cb(response);emit?.(response);});return request;
    }) as never);return {get,response};
  }
  it("rechecks redirects before connecting to another host",async()=>{
    const {get}=remote(302,{location:"https://127.0.0.1/private"});expect(await fetchRemoteBuffer("https://drive.google.com/a")).toBeNull();expect(get).toHaveBeenCalledTimes(1);
  });
  it("rejects active content",async()=>{
    remote(200,{"content-type":"image/svg+xml"});expect(await fetchRemoteBuffer("https://drive.google.com/a")).toBeNull();
  });
  it("bounds response bytes",async()=>{
    const {response}=remote(200,{"content-type":"image/png"},r=>r.emit("data",Buffer.alloc(8*1024*1024+1)));
    expect(await fetchRemoteBuffer("https://drive.google.com/a")).toBeNull();expect(response.destroy).toHaveBeenCalled();
  });
  it("returns permitted image bytes",async()=>{
    const bytes=Buffer.alloc(101,1);remote(200,{"content-type":"image/png"},r=>{r.emit("data",bytes);r.emit("end");});
    expect(await fetchRemoteBuffer("https://drive.google.com/a")).toEqual({buffer:bytes,contentType:"image/png"});
  });
});
