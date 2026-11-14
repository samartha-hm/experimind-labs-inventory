import { describe, expect, it, vi } from 'vitest';
import type { QueryRunner } from 'typeorm';
import { BlockResidualProjectHolds1793232000032 } from './1793232000032-BlockResidualProjectHolds';

describe('residual ownership migration safety', () => {
  it.each([
    { db: 'operational_erp', schema: `requirement_test_${'a'.repeat(32)}` },
    { db: 'experimind_kitbuilder_test', schema: 'public' },
  ])('refuses non-synthetic scope before reading or replacing authority: $db/$schema', async scope => {
    const query = vi.fn().mockResolvedValue([scope]);
    await expect(new BlockResidualProjectHolds1793232000032().up({ query } as unknown as QueryRunner))
      .rejects.toThrow('isolated synthetic schema');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('refuses an unexpected predecessor without replacing it', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([{ db: 'experimind_kitbuilder_test', schema: `requirement_test_${'b'.repeat(32)}` }])
      .mockResolvedValueOnce([{ definition: 'unrecognized authority' }]);
    await expect(new BlockResidualProjectHolds1793232000032().up({ query } as unknown as QueryRunner))
      .rejects.toThrow('Expected D4 closure authority');
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('refuses rollback that would remove closure protection', async () => {
    await expect(new BlockResidualProjectHolds1793232000032().down()).rejects.toThrow('cannot be removed');
  });
});
