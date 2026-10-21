'use client';
import useSWR from 'swr';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
const fetcher = (url: string) => api.get(url).then((r) => r.data);

const GROUPS: { title: string; hint: string; fields: { key: string; label: string; suffix?: string }[] }[] = [
  { title: 'Commissions', hint: 'Global defaults. Per-contest and per-category overrides live under Contests and Commission Settings.', fields: [
    { key: 'contestCommission', label: 'Contest platform commission', suffix: '%' }, { key: 'bookingCommission', label: 'Talent booking commission', suffix: '%' }, { key: 'votingCommission', label: 'Paid voting commission', suffix: '%' } ] },
  { title: 'Bookings', hint: 'The advance is charged when the talent accepts. The rest is charged after the event.', fields: [ { key: 'advancePct', label: 'Booking advance', suffix: '%' } ] },
  { title: 'Scoring', hint: 'Applies to new contests. Judge weight plus public weight must equal 100.', fields: [
    { key: 'judgeWeight', label: 'Judge score weight', suffix: '%' }, { key: 'publicWeight', label: 'Public vote weight', suffix: '%' } ] },
  { title: 'Voting', hint: '', fields: [ { key: 'votePrice', label: 'Price per paid vote', suffix: '₹' }, { key: 'dailyFreeVotes', label: 'Free votes per day per contest' } ] },
  { title: 'Wallet and referrals', hint: '', fields: [ { key: 'minWithdraw', label: 'Minimum withdrawal', suffix: '₹' }, { key: 'referralBonus', label: 'Referral bonus', suffix: '₹' } ] },
  { title: 'Subscription plans', hint: 'Premium and Pro talents are listed first and pay lower booking commission. Their apps stop showing ads.', fields: [
    { key: 'premiumPrice', label: 'Premium price per month', suffix: '₹' }, { key: 'proPrice', label: 'Pro price per month', suffix: '₹' },
    { key: 'premiumCommissionDiscount', label: 'Premium commission discount', suffix: 'pts' }, { key: 'proCommissionDiscount', label: 'Pro commission discount', suffix: 'pts' } ] },
  { title: 'XP rewards', hint: 'Points awarded for each action. Levels unlock at 250, 500 and 1000 XP.', fields: [
    { key: 'xpRegister', label: 'Contest registration' }, { key: 'xpVote', label: 'Vote' }, { key: 'xpTip', label: 'Tip' }, { key: 'xpBooking', label: 'Completed booking' }, { key: 'xpCheckIn', label: 'Daily check-in' }, { key: 'xpBattleVote', label: 'Battle vote' } ] },
];

export default function SettingsPage() {
  const { data, mutate, isLoading } = useSWR('/admin/settings', fetcher);
  const [form, setForm] = useState<Record<string, string>>({});
  const [tips, setTips] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data) { const f: Record<string, string> = {}; for (const [k, v] of Object.entries(data)) if (k !== 'tipPresets') f[k] = String(v); setForm(f); setTips((data.tipPresets || []).join(', ')); } }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      const body: Record<string, any> = {};
      for (const [k, v] of Object.entries(form)) body[k] = Number(v);
      body.tipPresets = tips.split(',').map((x) => Number(x.trim())).filter((n) => n > 0);
      await api.patch('/admin/settings', body); await mutate(); setMsg({ ok: true, text: 'Saved. The apps and website use the new values straight away.' });
    } catch (err: any) { setMsg({ ok: false, text: err.response?.data?.message || 'Could not save settings' }); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <h1 className="text-lg font-bold text-gray-900 mb-1">Config Engine</h1>
      <p className="text-sm text-gray-600 font-bold mb-6">Business rules that are never hard-coded. Change a value and it applies everywhere.</p>
      {isLoading && <p className="text-sm font-bold text-gray-600">Loading...</p>}
      <form onSubmit={save} className="space-y-6 max-w-3xl">
        {GROUPS.map((g) => (
          <section key={g.title} className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-bold text-gray-900">{g.title}</h2>{g.hint && <p className="text-xs font-bold text-gray-600 mt-1">{g.hint}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {g.fields.map((f) => (
                <label key={f.key} className="block"><span className="text-xs font-bold text-gray-600">{f.label}{f.suffix ? ` (${f.suffix})` : ''}</span>
                  <input type="number" min="0" step="any" value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900" /></label>
              ))}
            </div>
          </section>
        ))}
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-bold text-gray-900">Tip amounts</h2><p className="text-xs font-bold text-gray-600 mt-1">Quick-pick amounts shown in the app, comma separated (up to 6).</p>
          <input value={tips} onChange={(e) => setTips(e.target.value)} className="mt-3 block w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900" />
        </section>
        {msg && <p className={`text-sm font-bold ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
        <button disabled={saving} className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save settings'}</button>
      </form>
    </div>
  );
}
