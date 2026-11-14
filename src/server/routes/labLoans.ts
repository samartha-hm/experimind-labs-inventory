import { Router } from "express";
import { z } from "zod";
import { AppDataSource } from "../../db";
import { getTenantOrgId } from "../../middleware/tenant";
import { requireRole } from "../../middleware/requireRole";

const label = z.string().trim().min(1).max(160);
export const checkout = z.object({
  itemId: z.string().uuid(), assetTag: label, borrower: label, department: label, dueDate: z.iso.date(),
});
export const condition = z.enum(["GOOD", "DAMAGED", "CALIBRATION_REQUIRED"]);
export const labLoans = Router();
labLoans.get("/", async (req, res) => {
  const rows = await AppDataSource.query(`SELECT l.*, i.name, (returned_at IS NULL AND due_date < CURRENT_DATE) AS overdue
    FROM lab_loans l JOIN inventory_items i ON i.id=l.item_id AND i.organization_id=l.organization_id
    WHERE l.organization_id=$1 ORDER BY checked_out_at DESC`, [getTenantOrgId(req)]);
  res.json(rows);
});
labLoans.post("/", requireRole("staff","manager","admin"), async (req, res) => {
  const input = checkout.safeParse(req.body);
  if (!input.success) return res.status(400).json({error:"Valid catalog item, borrower, asset tag, department and due date required"});
  const { itemId, assetTag, borrower, department, dueDate } = input.data;
  try {
    const rows = await AppDataSource.query(`INSERT INTO lab_loans(organization_id,item_id,asset_tag,borrower,department,due_date,issued_by)
      SELECT organization_id,id,$3,$4,$5,$6,$7 FROM inventory_items WHERE organization_id=$1 AND id=$2 AND $6::date >= CURRENT_DATE
      RETURNING id`, [getTenantOrgId(req),itemId,assetTag,borrower,department,dueDate,req.user!.id]);
    if (!rows.length) return res.status(400).json({error:"Unknown item or due date in the past"});
    res.status(201).json(rows[0]);
  } catch (e) {
    if ((e as {code?:string}).code !== "23505") throw e;
    res.status(409).json({error:"Asset already on loan or awaiting inspection clearance"});
  }
});
labLoans.post("/:id/return", requireRole("staff","manager","admin"), async (req,res) => {
  const value = condition.safeParse(req.body.condition);
  if (!value.success) return res.status(400).json({error:"Select a return condition"});
  const [rows] = await AppDataSource.query(`UPDATE lab_loans SET returned_at=now(), inspected_by=$3, return_condition=$4
    WHERE id=$1 AND organization_id=$2 AND returned_at IS NULL RETURNING id`,
    [req.params.id,getTenantOrgId(req),req.user!.id,value.data]);
  res.status(rows.length ? 200 : 409).json(rows[0] || {error:"No active loan"});
});
labLoans.post("/:id/clear", requireRole("manager","admin"), async (req,res) => {
  const [rows] = await AppDataSource.query(`UPDATE lab_loans SET cleared_at=now(), cleared_by=$3 WHERE id=$1
    AND organization_id=$2 AND return_condition <> 'GOOD' AND cleared_at IS NULL RETURNING id`,
    [req.params.id,getTenantOrgId(req),req.user!.id]);
  res.status(rows.length ? 200 : 409).json(rows[0] || {error:"No outstanding inspection"});
});
