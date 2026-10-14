import { describe,it,expect } from "vitest";
import {stockUnits,stockText,convertStock} from "../physicalQuantity";
describe("Exact physical ledger quantities",()=>{
  it("adds fractional counts without floating point drift",()=>{expect(stockText(stockUnits("0.1")+stockUnits("0.2"))).toBe("0.3000");});
  it("supports exact conversions and signed adjustment deltas",()=>{expect(convertStock("250","0.01")).toBe("2.5000");expect(stockText(stockUnits("1")-stockUnits("2"))).toBe("-1.0000");});
  it.each(["-1","NaN","1e2","0.00001","100000000",""," 1","1."])("rejects invalid stock quantity %s",q=>{expect(()=>stockUnits(q)).toThrow();});
  it.each(["0","-1","0.000001","NaN"])("rejects zero, invalid or inexact conversion %s",factor=>{expect(()=>convertStock("0.0001",factor)).toThrow();});
  it("rejects ledger overflow",()=>{expect(()=>convertStock("99999999","2")).toThrow();});
});
