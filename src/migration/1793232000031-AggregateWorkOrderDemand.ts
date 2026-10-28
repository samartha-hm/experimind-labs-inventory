import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Preserve every approved source line when one SKU occurs in several crates. */
export class AggregateWorkOrderDemand1793232000031 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    // PostgreSQL FM omits a leading zero unless its final integer digit is 0.
    // Keep sub-unit allowances identical to the exact decimal service witness.
    for (const name of ['commitment_entitlement_insert', 'commitment_work_order_check']) {
      const signature = name === 'commitment_work_order_check' ? '(uuid)' : '()';
      const [{ definition: allowance }] = await q.query('SELECT pg_get_functiondef($1::regprocedure) definition', [name + signature]);
      await q.query(allowance.replaceAll('FM99999999.0000', 'FM99999990.0000'));
    }
    const [{ definition }] = await q.query("SELECT pg_get_functiondef('commitment_work_order_check(uuid)'::regprocedure) definition");
    const original = 'l=c.demand_line AND';
    if (!definition.includes(original)) throw new Error('Expected work-order authority validator required');
    const aggregate = `(l=c.demand_line OR c.demand_line=(
      SELECT jsonb_build_object('inventory_item_id',w.output_item_id::text,'unit',w.unit,
        'quantity',to_char(sum((dl->>'quantity')::numeric),'FM999999999999990.0000'),
        'lines',jsonb_agg(dl ORDER BY dl::text))
      FROM jsonb_array_elements(ap.snapshot->'lines') dl
      WHERE dl->>'site_id'=w.site_id::text AND dl->>'inventory_item_id'=w.output_item_id::text
        AND dl->>'unit'=w.unit AND dl ? 'material_id' HAVING count(*)>1)) AND`;
    await q.query(definition.replace(original, aggregate));
    const [{ definition: packing }] = await q.query("SELECT pg_get_functiondef('commitment_packing_guard()'::regprocedure) definition");
    const assignment = /IF material->>'item_id' IS DISTINCT FROM c\.demand_line->>'inventory_item_id'[\s\S]*?THEN\s+RAISE EXCEPTION 'Exact frozen material assignment required'/;
    if (!assignment.test(packing)) throw new Error('Expected frozen packing assignment validator required');
    await q.query(packing.replace(assignment, `IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(CASE WHEN c.demand_line ? 'lines'
        THEN c.demand_line->'lines' ELSE jsonb_build_array(c.demand_line) END) dl
      WHERE material->>'item_id'=dl->>'inventory_item_id' AND material->>'unit'=o.unit
        AND material->>'line_id'=dl->>'material_id' AND pack->>'selection_id'=dl->>'selection_id'
        AND pack->>'version_id'=dl->>'version_id') THEN
      RAISE EXCEPTION 'Exact frozen material assignment required'`));
  }
  async down(): Promise<void> {
    throw new Error('Restore a paired backup to preserve aggregate work-order evidence');
  }
}
