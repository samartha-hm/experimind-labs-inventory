import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Fail closed without settling or rewriting any retained ownership evidence. */
export class BlockResidualProjectHolds1793232000032 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    const [scope] = await q.query('SELECT current_database() db,current_schema() schema');
    if (scope.db !== 'experimind_kitbuilder_test' || !/^requirement_test_[a-f0-9]{32}$/.test(scope.schema))
      throw new Error('Residual ownership protection requires isolated synthetic schema');
    const [{ definition }] = await q.query("SELECT pg_get_functiondef('requirement_d4_project_blocked(uuid,uuid)'::regprocedure) definition");
    const residual = /OR EXISTS\(SELECT 1 FROM commitment_balances b JOIN commitment_accounts a ON a.id=b.account_id[\s\S]*?(?=OR EXISTS\(SELECT 1 FROM project_stock_reservations)/;
    if (!residual.test(definition)) throw new Error('Expected D4 closure authority required');
    await q.query(definition.replace(residual, `OR EXISTS(SELECT 1 FROM commitment_accounts a
      LEFT JOIN commitment_balances b ON b.account_id=a.id
      WHERE a.organization_id=org AND a.project_id=project AND (
        coalesce(b.held,0)<>0
        OR EXISTS(SELECT 1 FROM commitment_claims c WHERE c.account_id=a.id AND c.held<>0)
        OR (a.dimension='slot' AND coalesce(b.approved,0)<>coalesce(b.fulfilled,0))))
      `));
  }
  async down(): Promise<void> {
    throw new Error('Residual ownership protection cannot be removed; restore a paired backup under an approved rollback plan');
  }
}
