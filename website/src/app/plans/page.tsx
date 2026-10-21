import { apiGet } from '@/lib/api';
export const metadata = { title: 'Plans' };
export default async function Plans() {
  const s = await apiGet<any>('/settings/public', 30);
  const plans: any[] = s?.plans || [];
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900 text-center">Plans for every talent</h1>
      <p className="mt-2 font-bold text-gray-700 text-center">Prices are shown in rupees per month. Subscribe from the app.</p>
      {plans.length === 0 ? <p className="mt-10 text-center font-bold text-gray-700">Plans are unavailable right now.</p> : (
        <div className="grid md:grid-cols-3 gap-6 mt-10">{plans.map((p) => (
          <div key={p.id} className={`border rounded-2xl p-6 ${p.id === 'PREMIUM' ? 'border-brand-600 shadow-sm' : 'border-gray-200'}`}>
            <h2 className="text-lg font-bold text-gray-900">{p.name}</h2>
            <p className="mt-2 text-3xl font-bold text-gray-900">{p.price === 0 ? 'Free' : `₹${p.price}`}{p.price > 0 && <span className="text-sm text-gray-600">/mo</span>}</p>
            <ul className="mt-4 space-y-2">{p.benefits.map((b: string) => <li key={b} className="text-sm font-bold text-gray-800">✓ {b}</li>)}</ul>
          </div>))}</div>)}
    </div>
  );
}
