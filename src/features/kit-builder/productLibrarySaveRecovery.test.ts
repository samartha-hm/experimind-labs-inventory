import React, { type ReactElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProductLibrary, { type DraftKit } from './ProductLibrary';
import { setApiAuthToken } from '../../utils/api';

// Exercise editor event handlers and rerenders in the node environment without a DOM.
const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }));
vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, useEffect: () => {}, useRef: () => ({ current: null }),
    useState: <T,>(initial: T | (() => T)) => {
      const index = hooks.cursor++;
      if (!(index in hooks.values)) hooks.values[index] = typeof initial === 'function' ? (initial as () => T)() : initial;
      return [hooks.values[index], (next: T | ((previous: T) => T)) => {
        hooks.values[index] = typeof next === 'function' ? (next as (previous: T) => T)(hooks.values[index] as T) : next;
      }];
    },
  };
});
vi.mock('../../AuthContext', () => ({ useAuth: () => ({ role: 'staff' }) }));

const draft: DraftKit = { id: 'version', template_id: 'template', name: 'Saved kit', description: '', category: '', version_number: 1, revision: 2, updated_at: '', subjects: [] };
type Control = ReactElement<{ children?: ReactNode; type?: string; value?: string; disabled?: boolean; onClick?: () => void; onChange?: (event: { target: { value: string } }) => void; onSubmit?: (event: { preventDefault: () => void }) => Promise<void> }>;
function elements(node: ReactNode): Control[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!React.isValidElement(node)) return [];
  const element = node as Control;
  return [element, ...elements(element.props.children)];
}
function text(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(text).join('');
  if (React.isValidElement(node)) return text((node as Control).props.children);
  return typeof node === 'string' || typeof node === 'number' ? String(node) : '';
}
function render(studio: boolean): Control[] {
  hooks.cursor = 0;
  return elements(ProductLibrary(studio ? { studio: { draft, onClose: () => {} } } : {}));
}
function control(tree: Control[], predicate: (element: Control) => boolean): Control {
  const found = tree.find(predicate);
  if (!found) throw new Error('Expected editor control');
  return found;
}
const submit = (tree: Control[]) => control(tree, element => element.type === 'form').props.onSubmit!({ preventDefault() {} });
const saveButton = (tree: Control[]) => control(tree, element => element.type === 'button' && element.props.type === 'submit');

beforeEach(() => { hooks.values = []; hooks.cursor = 0; setApiAuthToken('synthetic'); });
afterEach(() => { vi.unstubAllGlobals(); setApiAuthToken(null); });

describe('Draft save recovery', () => {
  it.each([
    [true, 'connection'], [false, 'connection'],
    [true, 'server'], [false, 'server'],
    [true, 'invalid-json'], [false, 'invalid-json'],
  ] as const)('blocks repeated save and approval after uncertain update (Studio=%s, response=%s)', async (studio, failure) => {
    // Start both entry points with the same opened draft; effects are intentionally excluded.
    render(true);
    let tree = render(studio);
    control(tree, element => element.type === 'input' && element.props.value === draft.name).props.onChange!({ target: { value: 'Local changes' } });
    tree = render(studio);
    const fetch = failure === 'connection' ? vi.fn().mockRejectedValue(new TypeError('Connection lost'))
      : vi.fn().mockResolvedValue(new Response(failure === 'server' ? JSON.stringify({ error: 'Server unavailable' }) : '{', {
        status: failure === 'server' ? 500 : 200, headers: { 'Content-Type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetch);
    await submit(tree);
    tree = render(studio);
    expect(saveButton(tree).props.disabled).toBe(true);
    expect(tree.some(element => element.type === 'input' && element.props.value === 'Local changes')).toBe(true);
    // Returning values to the baseline must not enable approval of a possibly stale revision.
    control(tree, element => element.type === 'input' && element.props.value === 'Local changes').props.onChange!({ target: { value: draft.name } });
    tree = render(studio);
    const approval = tree.find(element => element.type === 'button' && text(element).includes('Approve immutable'));
    if (approval) {
      expect(approval.props.disabled).toBe(true);
      await approval.props.onClick!();
    }
    await submit(tree);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('blocks duplicate create after a lost response and explains reconciliation', async () => {
    let tree = render(false);
    control(tree, element => element.type === 'button' && text(element).includes('Create Kit')).props.onClick!();
    tree = render(false);
    control(tree, element => element.type === 'input' && element.props.value === '').props.onChange!({ target: { value: 'New kit' } });
    const fetch = vi.fn().mockRejectedValue(new TypeError('Connection lost'));
    vi.stubGlobal('fetch', fetch);
    await submit(render(false));
    tree = render(false);
    expect(saveButton(tree).props.disabled).toBe(true);
    expect(text(tree)).toMatch(/refresh.*library|reload.*library/i);
    await submit(tree);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])('retains edits and blocks stale revision retries (Studio=%s)', async studio => {
    render(true);
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Revision conflict' }), { status: 409, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetch);
    await submit(render(studio));
    const tree = render(studio);
    expect(saveButton(tree).props.disabled).toBe(true);
    await submit(tree);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])('allows correcting a rejected validation without losing edits (Studio=%s)', async studio => {
    render(true);
    let tree = render(studio);
    control(tree, element => element.type === 'input' && element.props.value === draft.name).props.onChange!({ target: { value: 'Local changes' } });
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Invalid content' }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetch);
    await submit(render(studio));
    tree = render(studio);
    expect(saveButton(tree).props.disabled).toBe(false);
    expect(text(tree)).toContain('Invalid content');
    expect(tree.some(element => element.type === 'input' && element.props.value === 'Local changes')).toBe(true);
  });
});
