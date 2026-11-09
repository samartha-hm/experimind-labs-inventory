import React, { type ReactElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProductLibrary, { type DraftKit } from './ProductLibrary';
import { setApiAuthToken } from '../../utils/api';

// Exercise editor event handlers and rerenders in the node environment without a DOM.
const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0, role: 'staff', effects: [] as (() => void | (() => void))[] }));
vi.mock('react', async importOriginal => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, useEffect: (effect: () => void | (() => void)) => { hooks.effects.push(effect); }, useRef: () => ({ current: null }),
    useState: <T,>(initial: T | (() => T)) => {
      const index = hooks.cursor++;
      if (!(index in hooks.values)) hooks.values[index] = typeof initial === 'function' ? (initial as () => T)() : initial;
      return [hooks.values[index], (next: T | ((previous: T) => T)) => {
        hooks.values[index] = typeof next === 'function' ? (next as (previous: T) => T)(hooks.values[index] as T) : next;
      }];
    },
  };
});
vi.mock('../../AuthContext', () => ({ useAuth: () => ({ role: hooks.role }) }));

const draft: DraftKit = { id: 'version', template_id: 'template', name: 'Saved kit', description: '', category: '', version_number: 1, revision: 2, updated_at: '', subjects: [] };
type Control = ReactElement<{ children?: ReactNode; type?: string; value?: string; disabled?: boolean; onClick?: () => void | Promise<void>; onChange?: (event: { target: { value: string } }) => void; onSubmit?: (event: { preventDefault: () => void }) => Promise<void> }>;
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

beforeEach(() => { hooks.values = []; hooks.cursor = 0; hooks.effects = []; hooks.role = 'staff'; setApiAuthToken('synthetic'); });
afterEach(() => { vi.unstubAllGlobals(); setApiAuthToken(null); });

const button = (tree: Control[], label: string) => control(tree, element => element.type === 'button' && text(element.props.children) === label);
function archiveConfirmation(): Control[] {
  render(true);
  button(render(false), 'Archive kit').props.onClick!();
  return render(false);
}

describe('Library loading recovery', () => {
  it('distinguishes a failed read from an empty library and retries without mutations', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError('Connection lost'))
      .mockResolvedValueOnce(new Response(JSON.stringify([draft])));
    vi.stubGlobal('fetch', fetch);
    render(false);
    hooks.effects.at(-1)!();
    await vi.waitFor(() => expect(text(render(false))).toContain('Product Library could not load'));
    expect(text(render(false))).not.toContain('Your Product Library is empty');
    button(render(false), 'Retry loading kits').props.onClick!();
    expect(text(render(false))).toContain('Loading draft kits');
    hooks.effects.at(-1)!();
    await vi.waitFor(() => expect(text(render(false))).toContain('Saved kit'));
    expect(text(render(false))).not.toContain('Connection lost');
    expect(fetch).toHaveBeenCalledTimes(2);
    for (const [url, options] of fetch.mock.calls) {
      expect(url).toBe('/api/v1/product-templates');
      expect(options.method ?? 'GET').toBe('GET');
    }
  });

  it('ignores a failed response after leaving the library', async () => {
    let reject!: (reason: Error) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise((_resolve, fail) => { reject = fail; })));
    render(false);
    const cleanup = hooks.effects.at(-1)!();
    if (typeof cleanup === 'function') cleanup();
    reject(new TypeError('Late failure'));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(text(render(false))).not.toContain('Product Library could not load');
  });
});

describe('Archive response recovery', () => {
  it('clears reconciliation only after a successful authoritative reopen', async () => {
    archiveConfirmation();
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(draft)))
      .mockRejectedValueOnce(new TypeError('Connection lost'))
      .mockRejectedValueOnce(new TypeError('Reload failed'))
      .mockResolvedValueOnce(new Response(JSON.stringify(draft)));
    vi.stubGlobal('fetch', fetch);
    await submit(render(false));
    await button(render(false), 'Confirm archive').props.onClick!();
    button(render(false), 'Back to Product Library').props.onClick!();
    const open = () => control(render(false), element => element.type === 'button' && text(element.props.children).includes('Saved kit')).props.onClick!();
    await open();
    expect(text(render(false))).toContain('Archive outcome needs reconciliation.');
    await open();
    const tree = render(false);
    expect(text(tree)).not.toContain('Archive outcome needs reconciliation.');
    expect(saveButton(tree).props.disabled).toBe(false);
    expect(button(tree, 'Archive kit').props.disabled).toBe(false);
    expect(tree.some(element => element.type === 'button' && text(element.props.children) === 'Confirm archive')).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(fetch.mock.calls[2][0]).toBe('/api/v1/product-templates/template');
    expect(fetch.mock.calls[3][0]).toBe('/api/v1/product-templates/template');
  });

  it.each(['connection', 'server', 'invalid-json', 'stale', 'missing'] as const)('blocks mutations after %s archive response', async failure => {
    const tree = archiveConfirmation();
    const fetch = failure === 'connection' ? vi.fn().mockRejectedValue(new TypeError('Connection lost'))
      : vi.fn().mockResolvedValue(new Response(failure === 'invalid-json' ? '{' : JSON.stringify({ error: 'Archive unavailable' }), {
        status: failure === 'server' ? 500 : failure === 'stale' ? 409 : failure === 'missing' ? 404 : 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetch);
    await button(tree, 'Confirm archive').props.onClick!();
    const recovered = render(false);
    expect(text(recovered)).toContain('Archive outcome needs reconciliation.');
    expect(button(recovered, 'Confirm archive').props.disabled).toBe(true);
    expect(saveButton(recovered).props.disabled).toBe(true);
    expect(button(recovered, 'Approve immutable version for planning').props.disabled).toBe(true);
    expect(recovered.some(element => element.type === 'input' && element.props.value === draft.name)).toBe(true);
    await button(recovered, 'Confirm archive').props.onClick!();
    await submit(recovered);
    await button(recovered, 'Approve immutable version for planning').props.onClick!();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects confirmation after write permission is lost', async () => {
    archiveConfirmation();
    hooks.role = 'viewer';
    const tree = render(false);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const confirm = tree.find(element => element.type === 'button' && text(element.props.children) === 'Confirm archive');
    if (confirm) {
      expect(confirm.props.disabled).toBe(true);
      await confirm.props.onClick!();
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects confirmation while another mutation is pending', async () => {
    const tree = archiveConfirmation();
    let finish!: (response: Response) => void;
    const fetch = vi.fn().mockImplementation(() => new Promise<Response>(resolve => { finish = resolve; }));
    vi.stubGlobal('fetch', fetch);
    const saving = submit(tree);
    await button(render(false), 'Confirm archive').props.onClick!();
    expect(fetch).toHaveBeenCalledTimes(1);
    finish(new Response(JSON.stringify(draft)));
    await saving;
  });

  it('removes an archived draft only after confirmed success', async () => {
    const tree = archiveConfirmation();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await button(tree, 'Confirm archive').props.onClick!();
    const next = render(false);
    expect(text(next)).toContain('Kit archived.');
    expect(next.some(element => element.type === 'form')).toBe(false);
  });
});

describe('Approval response recovery', () => {
  it('does not approve when review is opened and cancelled', async () => {
    render(true);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    button(render(false), 'Approve immutable version for planning').props.onClick!();
    expect(text(render(false))).toContain('Saved revision 2 becomes an immutable version');
    expect(fetch).not.toHaveBeenCalled();
    button(render(false), 'Cancel approval').props.onClick!();
    expect(render(false).some(element => element.type === 'dialog')).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rechecks write permission after approval review opens', async () => {
    render(true);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    button(render(false), 'Approve immutable version for planning').props.onClick!();
    hooks.role = 'viewer';
    const confirm = button(render(false), 'Confirm immutable approval');
    expect(confirm.props.disabled).toBe(true);
    await confirm.props.onClick!();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('allows a deliberate retry after reopening an authoritative draft', async () => {
    render(true);
    vi.stubGlobal('window', { confirm: vi.fn(() => true) });
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(draft)))
      .mockRejectedValueOnce(new TypeError('Connection lost'))
      .mockResolvedValueOnce(new Response(JSON.stringify(draft)))
      .mockResolvedValueOnce(new Response(JSON.stringify({ version_number: 3 })));
    vi.stubGlobal('fetch', fetch);
    await submit(render(false));
    const approval = (tree: Control[]) => control(tree, element => element.type === 'button' && text(element.props.children) === 'Approve immutable version for planning');
    await approval(render(false)).props.onClick!();
    await button(render(false), 'Confirm immutable approval').props.onClick!();
    control(render(false), element => element.type === 'button' && text(element.props.children) === 'Back to Product Library').props.onClick!();
    await control(render(false), element => element.type === 'button' && text(element.props.children).includes('Saved kit')).props.onClick!();
    const tree = render(false);
    expect(approval(tree).props.disabled).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[2][0]).toBe('/api/v1/product-templates/template');
    await approval(tree).props.onClick!();
    await button(render(false), 'Confirm immutable approval').props.onClick!();
    expect(text(render(false))).toContain('Approved immutable version 3');
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it.each(['connection', 'server', 'invalid-json', 'stale'] as const)('requires reconciliation after %s response', async failure => {
    render(true);
    vi.stubGlobal('window', { confirm: vi.fn(() => true) });
    const fetch = failure === 'connection' ? vi.fn().mockRejectedValue(new TypeError('Connection lost'))
      : vi.fn().mockResolvedValue(new Response(failure === 'invalid-json' ? '{' : JSON.stringify({ error: 'Approval unavailable' }), {
        status: failure === 'server' ? 500 : failure === 'stale' ? 409 : 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetch);
    const approval = (tree: Control[]) => control(tree, element => element.type === 'button' && text(element.props.children) === 'Approve immutable version for planning');
    await approval(render(false)).props.onClick!();
    await button(render(false), 'Confirm immutable approval').props.onClick!();
    await vi.waitFor(() => expect(text(render(false))).toContain('Reopen the draft to check approval status before trying again.'));
    const tree = render(false);
    expect(approval(tree).props.disabled).toBe(true);
    expect(tree.some(element => element.type === 'input' && element.props.value === draft.name)).toBe(true);
    await approval(tree).props.onClick!();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

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
