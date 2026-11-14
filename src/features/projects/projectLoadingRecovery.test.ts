import React, { type ReactNode, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectPlanningTab from './ProjectPlanningTab';

const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0, effects: [] as (() => void | (() => void))[], request: vi.fn() }));
vi.mock('react', async original => ({ ...await original<typeof import('react')>(),
  useEffect: (effect: () => void | (() => void)) => { hooks.effects.push(effect); },
  useRef: () => ({ current: 0 }),
  useState: <T,>(initial: T) => {
    const index = hooks.cursor++;
    if (!(index in hooks.values)) hooks.values[index] = initial;
    return [hooks.values[index], (next: T | ((previous: T) => T)) => {
      hooks.values[index] = typeof next === 'function' ? (next as (previous: T) => T)(hooks.values[index] as T) : next;
    }];
  },
}));
vi.mock('../../AuthContext', () => ({ useAuth: () => ({ currentUser: { role: 'admin' } }) }));
vi.mock('../../utils/api', () => ({ apiFetch: (...args: unknown[]) => hooks.request(...args) }));
type Element = ReactElement<{ children?: ReactNode; disabled?: boolean; onClick?: () => void }>;
function elements(node: ReactNode): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!React.isValidElement(node)) return [];
  return [node as Element, ...elements((node as Element).props.children)];
}
function text(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(text).join('');
  if (React.isValidElement(node)) return text((node as Element).props.children);
  return typeof node === 'string' || typeof node === 'number' ? String(node) : '';
}
function render() { hooks.cursor = 0; return elements(ProjectPlanningTab()); }
function button(label: string) { return render().find(e => e.type === 'button' && text(e.props.children) === label)!; }
beforeEach(() => { hooks.values = []; hooks.effects = []; hooks.cursor = 0; hooks.request.mockReset(); });

describe('Project planning initial read recovery', () => {
  it('retries both reads and prevents creation with a missing approved catalog', async () => {
    hooks.request.mockImplementation((url: string) => url.endsWith('/approved') ? Promise.reject(new Error('Catalog unavailable')) : Promise.resolve([]));
    render();
    expect(button('Create project').props.disabled).toBe(true);
    hooks.effects.at(-1)!();
    await vi.waitFor(() => expect(text(render())).toContain('Project planning could not load'));
    expect(text(render())).not.toContain('No projects yet.');
    expect(button('Create project').props.disabled).toBe(true);
    hooks.request.mockResolvedValue([]);
    button('Retry loading projects').props.onClick!();
    render(); hooks.effects.at(-1)!();
    await vi.waitFor(() => expect(text(render())).toContain('No projects yet.'));
    expect(button('Create project').props.disabled).toBe(false);
    expect(text(render())).not.toContain('Catalog unavailable');
    expect(hooks.request.mock.calls.map(args => args[0])).toEqual([
      '/api/v1/planning-projects', '/api/v1/product-templates/approved',
      '/api/v1/planning-projects', '/api/v1/product-templates/approved',
    ]);
    expect(hooks.request.mock.calls.every(args => args.length === 1)).toBe(true);
  });

  it.each(['success', 'failure'])('ignores late %s after unmount', async outcome => {
    let resolve!: (value: unknown) => void;
    let reject!: (error: Error) => void;
    const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
    hooks.request.mockReturnValue(pending);
    render();
    const cleanup = hooks.effects.at(-1)!();
    if (typeof cleanup === 'function') cleanup();
    const before = [...hooks.values];
    if (outcome === 'success') resolve([]); else reject(new Error('Late error'));
    await new Promise(done => setTimeout(done, 0));
    expect(hooks.values).toEqual(before);
  });
});
