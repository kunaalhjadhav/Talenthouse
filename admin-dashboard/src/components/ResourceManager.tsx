'use client';
import useSWR from 'swr';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

const fetcher = (url: string) => api.get(url).then((r) => r.data);
const GOOD = ['ACTIVE', 'LIVE', 'APPROVED', 'PUBLISHED', 'SUCCESSFUL', 'PAID', 'COMPLETED', 'REGISTERED', 'CONFIRMED', 'ADVANCE_PAID', 'RESOLVED_REFUND', 'RESOLVED_PAYOUT', 'RESOLVED_NO_ACTION'];
const BAD = ['REJECTED', 'CANCELLED', 'BLOCKED', 'FAILED', 'REMOVED', 'DISQUALIFIED', 'DELETED', 'SUSPENDED', 'EXPIRED', 'ENDED', 'CLOSED'];
const dig = (row: any, path: string) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), row);
const inr = (n: any) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const errText = (e: any) => { const m = e?.response?.data?.message; return Array.isArray(m) ? m.join(', ') : m || e?.message || 'Something went wrong'; };
const toLocalInput = (v: any) => { if (!v) return ''; const d = new Date(v); if (isNaN(d.getTime())) return ''; const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

function Badge({ value }: { value: any }) {
  const v = String(value ?? '');
  const cls = GOOD.includes(v) ? 'bg-green-100 text-green-800' : BAD.includes(v) ? 'bg-red-100 text-red-800' : v ? 'bg-amber-100 text-amber-800' : '';
  return v ? <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>{v.replace(/_/g, ' ')}</span> : <span className="text-gray-400">-</span>;
}
function Cell({ col, row }: { col: any; row: any }) {
  const v = dig(row, col.path);
  if (col.kind === 'badge') return <Badge value={v} />;
  if (col.kind === 'bool') return <span className={v ? 'text-green-700' : 'text-gray-400'}>{v ? 'Yes' : 'No'}</span>;
  if (col.kind === 'money') return <>{v == null ? '-' : inr(v)}</>;
  if (col.kind === 'date') return <>{v ? new Date(v).toLocaleDateString('en-IN') : '-'}</>;
  if (v == null || v === '') return <span className="text-gray-400">-</span>;
  const s = String(v);
  return <span title={s}>{s.length > 48 ? `${s.slice(0, 48)}…` : s}</span>;
}

const inputCls = 'mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 disabled:bg-gray-100 disabled:text-gray-600';

function RelationSelect({ field, value, onChange, disabled }: any) {
  const { data } = useSWR(`/admin/resources/${field.resource}?pageSize=200`, fetcher);
  const { data: meta } = useSWR(`/admin/resources/${field.resource}/meta`, fetcher);
  const label = (r: any) => { const base = (meta?.optionLabel && r[meta.optionLabel]) || r.name || r.title || r.caption || r.id.slice(0, 8); return r.mobile ? `${base} (${r.mobile})` : String(base).slice(0, 60); };
  return (
    <select className={inputCls} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select…</option>{data?.items?.map((r: any) => <option key={r.id} value={r.id}>{label(r)}</option>)}
    </select>
  );
}
function CategoryInput({ field, value, onChange, disabled }: any) {
  const { data } = useSWR(`/admin/resources/categories?pageSize=200&f_type=${field.categoryType}`, fetcher);
  const id = `cats-${field.key}`;
  return (<><input className={inputCls} list={id} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} placeholder="Pick or type a category" /><datalist id={id}>{data?.items?.filter((c: any) => c.active).map((c: any) => <option key={c.id} value={c.name} />)}</datalist></>);
}

function FieldInput({ field, value, onChange, disabled }: any) {
  switch (field.type) {
    case 'textarea': return <textarea rows={3} className={inputCls} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
    case 'number': return <input type="number" step="any" className={inputCls} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
    case 'bool': return <label className="mt-2 flex items-center gap-2 text-sm font-bold text-gray-900"><input type="checkbox" checked={!!value} disabled={disabled} onChange={(e) => onChange(e.target.checked)} /> {value ? 'Yes' : 'No'}</label>;
    case 'datetime': return <input type="datetime-local" className={inputCls} value={toLocalInput(value)} disabled={disabled} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')} />;
    case 'enum': return <select className={inputCls} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)}><option value="">Select…</option>{field.options.map((o: string) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}</select>;
    case 'relation': return <RelationSelect field={field} value={value} onChange={onChange} disabled={disabled} />;
    case 'category': return <CategoryInput field={field} value={value} onChange={onChange} disabled={disabled} />;
    case 'tags': return <input className={inputCls} value={Array.isArray(value) ? value.join(', ') : value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} placeholder="comma, separated" />;
    default: return <input className={inputCls} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
  }
}

export default function ResourceManager({ resource, hideHeader, title: titleOverride }: { resource: string; hideHeader?: boolean; title?: string }) {
  const { data: meta } = useSWR(`/admin/resources/${resource}/meta`, fetcher);
  const [page, setPage] = useState(1); const [q, setQ] = useState(''); const [search, setSearch] = useState(''); const [filters, setFilters] = useState<Record<string, string>>({});
  const query = useMemo(() => { const p = new URLSearchParams({ page: String(page), pageSize: '20' }); if (search) p.set('q', search); Object.entries(filters).forEach(([k, v]) => v && p.set(`f_${k}`, v)); return p.toString(); }, [page, search, filters]);
  const { data, mutate, isLoading, error } = useSWR(meta ? `/admin/resources/${resource}?${query}` : null, fetcher);
  const [editing, setEditing] = useState<any | null>(null); // null closed, {} new, row = edit
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false); const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); const [modalErr, setModalErr] = useState('');
  useEffect(() => { setPage(1); }, [search, filters]);
  useEffect(() => { const t = setTimeout(() => setSearch(q), 350); return () => clearTimeout(t); }, [q]);

  if (!meta) return <p className="text-sm font-bold text-gray-600">Loading…</p>;
  const isNew = editing && !editing.id;
  const formFields = meta.fields.filter((f: any) => !(f.createOnly && !isNew));
  const filterFields = meta.fields.filter((f: any) => f.filter && (f.type === 'enum' || f.type === 'bool'));
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const flash = (ok: boolean, text: string) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 5000); };

  function openNew() { const init: Record<string, any> = {}; meta.fields.forEach((f: any) => { if (f.default !== undefined) init[f.key] = f.default; if (f.type === 'bool' && init[f.key] === undefined) init[f.key] = false; }); setForm(init); setModalErr(''); setEditing({}); }
  function openEdit(row: any) { const init: Record<string, any> = {}; meta.fields.forEach((f: any) => { init[f.key] = row[f.key]; }); setForm(init); setModalErr(''); setEditing(row); }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setModalErr('');
    try {
      const body: Record<string, any> = {};
      for (const f of formFields) if (!f.readonly) body[f.key] = form[f.key];
      if (isNew) await api.post(`/admin/resources/${resource}`, body); else await api.patch(`/admin/resources/${resource}/${editing.id}`, body);
      setEditing(null); await mutate(); flash(true, isNew ? 'Created.' : 'Saved.');
    } catch (err) { setModalErr(errText(err)); } finally { setSaving(false); }
  }
  async function remove(row: any) {
    if (!confirm(meta.softDelete ? 'Mark this record as deleted?' : 'Delete this record permanently? This cannot be undone.')) return;
    try { await api.delete(`/admin/resources/${resource}/${row.id}`); await mutate(); flash(true, 'Deleted.'); } catch (err) { flash(false, errText(err)); }
  }
  async function runAction(a: any, row: any) {
    if (a.confirm && !confirm(a.confirm)) return;
    try {
      if (a.kind === 'set') await api.patch(`/admin/resources/${resource}/${row.id}`, a.data);
      else {
        const body: Record<string, any> = { ...(a.body || {}) };
        if (a.prompt) { const v = window.prompt(a.prompt.label); if (v === null) return; body[a.prompt.field] = v || 'Not specified'; }
        await api.request({ method: a.method, url: a.url.replace(':id', row.id), data: body });
      }
      await mutate(); flash(true, `${a.label}: done.`);
    } catch (err) { flash(false, errText(err)); }
  }
  const visible = (a: any, row: any) => !a.when || a.when.in.includes(String(row[a.when.field]));
  const tone = (t?: string) => (t === 'good' ? 'text-green-700' : t === 'bad' ? 'text-red-600' : 'text-gray-700');

  return (
    <div>
      {!hideHeader && (<><h1 className="text-lg font-bold text-gray-900 mb-1">{titleOverride || meta.title}</h1><p className="text-sm text-gray-600 font-bold mb-5">{meta.description}</p></>)}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {meta.searchable && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 w-56" />}
        {filterFields.map((f: any) => (
          <select key={f.key} value={filters[f.key] || ''} onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })} className="border border-gray-300 rounded-lg px-2 py-2 text-sm font-bold text-gray-900">
            <option value="">{f.label}: all</option>{f.type === 'bool' ? <><option value="true">Yes</option><option value="false">No</option></> : f.options.map((o: string) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
          </select>))}
        <div className="flex-1" />
        {meta.canCreate && <button onClick={openNew} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700">+ Add new</button>}
      </div>
      {msg && <p className={`mb-3 text-sm font-bold ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-bold"><tr>{meta.columns.map((c: any) => <th key={c.path} className="text-left px-4 py-3 whitespace-nowrap">{c.label}</th>)}<th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={meta.columns.length + 1} className="px-4 py-4 font-bold text-gray-600">Loading…</td></tr>}
            {error && <tr><td colSpan={meta.columns.length + 1} className="px-4 py-4 font-bold text-red-600">{errText(error)}</td></tr>}
            {data && data.items.length === 0 && <tr><td colSpan={meta.columns.length + 1} className="px-4 py-6 font-bold text-gray-600 text-center">Nothing here yet.</td></tr>}
            {data?.items.map((row: any) => (
              <tr key={row.id} className="border-t border-gray-100 font-bold text-gray-900 align-top">
                {meta.columns.map((c: any) => <td key={c.path} className="px-4 py-3"><Cell col={c} row={row} /></td>)}
                <td className="px-4 py-3 text-right whitespace-nowrap space-x-3">
                  {meta.actions.filter((a: any) => visible(a, row)).map((a: any) => <button key={a.label} onClick={() => runAction(a, row)} className={`${tone(a.tone)} hover:underline`}>{a.label}</button>)}
                  <button onClick={() => openEdit(row)} className="text-indigo-600 hover:underline">{meta.fields.some((f: any) => !f.readonly) ? 'Edit' : 'View'}</button>
                  {meta.canDelete && <button onClick={() => remove(row)} className="text-red-600 hover:underline">Delete</button>}
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>
      {data && <div className="flex items-center justify-between mt-3 text-sm font-bold text-gray-700"><span>{data.total} record{data.total === 1 ? '' : 's'}</span><div className="space-x-2"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-40">Prev</button><span>Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-40">Next</button></div></div>}

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-y-auto p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditing(null); }}>
          <form onSubmit={save} className="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center"><h2 className="font-bold text-gray-900">{isNew ? `New ${meta.title.toLowerCase()}` : `Edit ${meta.title.toLowerCase()}`}</h2><button type="button" onClick={() => setEditing(null)} className="text-gray-600 font-bold">✕</button></div>
            <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {formFields.map((f: any) => (
                <label key={f.key} className={`block ${f.type === 'textarea' ? 'sm:col-span-2' : ''}`}>
                  <span className="text-xs font-bold text-gray-600">{f.label}{f.required && !f.readonly ? ' *' : ''}</span>
                  <FieldInput field={f} value={form[f.key]} disabled={f.readonly || saving} onChange={(v: any) => setForm({ ...form, [f.key]: v })} />
                  {f.help && <span className="text-[11px] font-bold text-gray-500">{f.help}</span>}
                </label>))}
            </div>
            {modalErr && <p className="px-6 text-sm font-bold text-red-600">{modalErr}</p>}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-bold text-gray-800">Close</button>
              {meta.fields.some((f: any) => !f.readonly) && <button disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold disabled:opacity-50">{saving ? 'Saving…' : isNew ? 'Create' : 'Save changes'}</button>}
            </div>
          </form>
        </div>)}
    </div>
  );
}
