export const metadata = { title: 'Terms & Conditions — Talent Platform' };

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 prose prose-gray">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Terms & Conditions</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: [DATE]</p>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-8">
        <strong>Placeholder legal text.</strong> This page must be replaced with
        Terms drafted or reviewed by a qualified Indian legal professional
        before launch (see PRD §77 / DEPLOYMENT.md). It is not valid, binding
        legal copy as written.
      </div>

      <h2 className="font-semibold text-gray-900 mt-8">1. Acceptance of Terms</h2>
      <p className="text-gray-700">By registering for or using Talent Platform, you agree to these Terms.</p>

      <h2 className="font-semibold text-gray-900 mt-8">2. Eligibility</h2>
      <p className="text-gray-700">Users must meet the minimum age and eligibility requirements stated for each contest, audition, or booking.</p>

      <h2 className="font-semibold text-gray-900 mt-8">3. Contest & Audition Participation</h2>
      <p className="text-gray-700">Entry fees, prize distribution, and platform commission are disclosed at the time of registration for each contest. Platform commission defaults to 25% of gross contest revenue unless otherwise configured.</p>

      <h2 className="font-semibold text-gray-900 mt-8">4. Payments</h2>
      <p className="text-gray-700">All payments are processed via Razorpay. Refunds are subject to the Refund Policy.</p>

      <h2 className="font-semibold text-gray-900 mt-8">5. User Conduct</h2>
      <p className="text-gray-700">Users may not upload content that infringes intellectual property, violates community guidelines, or is otherwise unlawful.</p>

      <h2 className="font-semibold text-gray-900 mt-8">6. Limitation of Liability</h2>
      <p className="text-gray-700">Talent Platform is not liable for disputes between users regarding bookings, contest outcomes, or auditions beyond the dispute resolution process described in-app.</p>
    </div>
  );
}
