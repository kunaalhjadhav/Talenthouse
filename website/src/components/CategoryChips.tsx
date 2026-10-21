'use client';
type Props = { categories: string[]; active: string; onChange: (c: string) => void };
export default function CategoryChips({ categories, active, onChange }: Props) {
  return (<div className="flex gap-2 flex-wrap mb-8">{categories.map((c) => (<button key={c} onClick={() => onChange(c)} className={`px-4 py-2 rounded-full text-sm font-bold border ${active === c ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-800 border-gray-300 hover:border-brand-600'}`}>{c}</button>))}</div>);
}
