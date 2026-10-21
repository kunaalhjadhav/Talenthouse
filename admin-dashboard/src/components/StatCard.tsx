export default function StatCard({ label, value }: { label: string; value: string | number }) {
  return (<div className="bg-white rounded-xl border border-gray-200 p-5"><p className="text-xs font-bold text-gray-600 uppercase tracking-wide">{label}</p><p className="mt-2 text-2xl font-bold text-gray-900">{value}</p></div>);
}
