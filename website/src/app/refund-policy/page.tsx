export const metadata = { title: 'Refund Policy — Talent Platform' };

export default function RefundPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 prose prose-gray">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Refund & Cancellation Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: [DATE]</p>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-8">
        <strong>Placeholder legal text.</strong> Replace with policy figures
        (windows, percentages, penalties) your business has actually decided
        on, reviewed by a qualified legal professional, before launch.
      </div>

      <h2 className="font-semibold text-gray-900 mt-8">Contest registration fees</h2>
      <p className="text-gray-700">Registration fees are refundable if a contest is cancelled by the host or platform. Fees are non-refundable after the registration window closes, except where required by law.</p>

      <h2 className="font-semibold text-gray-900 mt-8">Talent bookings</h2>
      <p className="text-gray-700">Cancellations made more than [X] days before the event receive a full refund of the advance payment. Cancellations within [X] days are subject to a cancellation penalty, disclosed at time of booking.</p>

      <h2 className="font-semibold text-gray-900 mt-8">Disputed transactions</h2>
      <p className="text-gray-700">Disputes are reviewed through the in-app dispute resolution process. Approved refunds are processed to your original payment method within 5–7 business days.</p>
    </div>
  );
}
