import { ResourcesController } from '../admin/resources.controller';
import { RESOURCES } from '../admin/resources.config';

function makeController() {
  const calls: any[] = [];
  const delegate = (name: string) => ({
    findMany: async (a: any) => { calls.push([name, 'findMany', a]); return []; }, count: async () => 0,
    findUnique: async () => ({ id: 'x', status: 'DRAFT', role: 'PARTICIPANT', mobile: '1' }),
    create: async (a: any) => { calls.push([name, 'create', a]); return { id: 'new', ...a.data }; },
    update: async (a: any) => { calls.push([name, 'update', a]); return { id: a.where.id, ...a.data }; },
    delete: async (a: any) => { calls.push([name, 'delete', a]); return {}; }, deleteMany: async () => ({}),
  });
  const prisma: any = new Proxy({ auditLog: { create: async () => ({}) }, category: { ...delegate('category'), count: async () => 5 }, $transaction: async (x: any) => x }, { get: (t: any, k: string) => t[k] ?? delegate(k) });
  const contests: any = { adminSetStatus: async (id: string, status: string) => ({ id, status }) };
  return { c: new ResourcesController(prisma, contests, {} as any), calls };
}
const admin = { id: 'a1', role: 'ADMIN' };
const root = { id: 's1', role: 'SUPER_ADMIN' };

describe('generic admin resources', () => {
  it('every resource has valid columns, fields and actions', () => {
    for (const [name, r] of Object.entries(RESOURCES)) {
      expect(r.columns.length).toBeGreaterThan(0);
      for (const f of r.fields) { if (f.type === 'enum') expect(f.options?.length).toBeGreaterThan(0); if (f.type === 'relation') expect(RESOURCES[f.resource!]).toBeDefined(); }
      for (const a of r.actions ?? []) { if (a.kind === 'set') expect(a.data).toBeDefined(); else expect(a.url).toBeDefined(); }
      expect(name).toBeTruthy();
    }
  });
  it('creates a category with a generated slug and converted values', async () => {
    const { c, calls } = makeController();
    await c.create(admin, 'categories', { type: 'CONTEST', name: 'Street Art!', sortOrder: '3', active: 'true', evil: 'x' });
    const data = calls.find((x) => x[1] === 'create')[2].data;
    expect(data).toMatchObject({ type: 'CONTEST', name: 'Street Art!', slug: 'street-art', sortOrder: 3, active: true });
    expect(data.evil).toBeUndefined();
  });
  it('rejects missing required fields, bad enums and bad numbers', async () => {
    const { c } = makeController();
    await expect(c.create(admin, 'categories', { type: 'CONTEST' })).rejects.toThrow();
    await expect(c.create(admin, 'categories', { type: 'NOPE', name: 'A' })).rejects.toThrow(/one of/);
    await expect(c.create(admin, 'ads', { title: 'x', startDate: 'zzz', endDate: '2026-01-01' })).rejects.toThrow(/valid date/);
  });
  it('blocks creating things that must go through the app flows, and read-only deletes', async () => {
    const { c } = makeController();
    await expect(c.create(admin, 'payments', {})).rejects.toThrow(/cannot be created/);
    await expect(c.remove(admin, 'payments', 'x')).rejects.toThrow(/cannot be deleted/);
  });
  it('only super admins assign staff roles; users are soft deleted', async () => {
    const { c, calls } = makeController();
    await expect(c.create(admin, 'users', { mobile: '9000000001', role: 'ADMIN' })).rejects.toThrow(/super admin/);
    await c.create(root, 'users', { mobile: '9000000001 ', role: 'HOST' });
    expect(calls.find((x) => x[1] === 'create')[2].data.mobile).toBe('9000000001');
    await c.remove(admin, 'users', 'x');
    expect(calls.find((x) => x[1] === 'update')[2].data).toEqual({ status: 'DELETED' });
    await expect(c.remove({ id: 'm', role: 'CONTENT_MODERATOR' }, 'ads', 'x')).rejects.toThrow(/Only an admin/);
  });
  it('rejects global commission rules and bad contest weights; routes contest approval through the service', async () => {
    const { c } = makeController();
    await expect(c.create(admin, 'commission-rules', { scope: 'GLOBAL', key: 'x', percentage: 5 })).rejects.toThrow(/enum|one of|Config Engine/);
    await expect(c.update(admin, 'contests', 'x', { judgeWeightPct: 60, voteWeightPct: 60 })).rejects.toThrow(/add up to 100/);
    const row: any = await c.update(admin, 'contests', 'x', { status: 'APPROVED' });
    expect(row.status).toBe('APPROVED');
  });
  it('builds list filters and search', async () => {
    const { c, calls } = makeController();
    await c.list('users', { q: 'ravi', f_role: 'HOST', page: '2', pageSize: '10' });
    const a = calls.find((x) => x[1] === 'findMany')[2];
    expect(a.where.role).toBe('HOST'); expect(a.where.OR.length).toBe(3); expect(a.skip).toBe(10); expect(a.take).toBe(10);
  });
});
