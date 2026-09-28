export const metadata = { title: 'Privacy Policy — Talent Platform' };

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 prose prose-gray">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: [DATE]</p>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-8">
        <strong>Placeholder legal text.</strong> Replace with a policy reviewed
        by a qualified legal professional, accurately reflecting what this
        codebase actually collects (see the data types listed below as a
        starting inventory) before launch.
      </div>

      <h2 className="font-semibold text-gray-900 mt-8">Data we collect</h2>
      <ul className="text-gray-700 list-disc pl-5 space-y-1">
        <li>Mobile number (for OTP authentication)</li>
        <li>Profile information you provide (name, bio, photos, category, skills)</li>
        <li>Location, when you enable it, to show nearby contests/talents/auditions</li>
        <li>KYC details (PAN, bank account) — only if you request a withdrawal</li>
        <li>Payment metadata via Razorpay (we do not store card numbers)</li>
        <li>Usage data (views, likes, contest participation) to operate the platform</li>
      </ul>

      <h2 className="font-semibold text-gray-900 mt-8">How we use it</h2>
      <p className="text-gray-700">To operate contests, auditions, bookings, payments, and to personalize your feed and recommendations.</p>

      <h2 className="font-semibold text-gray-900 mt-8">Third parties</h2>
      <p className="text-gray-700">We share data with Razorpay (payments), Firebase (notifications), Google Maps (location), and our SMS provider (OTP delivery) strictly to provide the service.</p>

      <h2 className="font-semibold text-gray-900 mt-8">Your rights</h2>
      <p className="text-gray-700">You may request access to, correction of, or deletion of your data by contacting support.</p>
    </div>
  );
}
