import type { Metadata } from "next";
import SubpageHeader from "@/components/layout/SubpageHeader";

export const metadata: Metadata = {
  title: "Privacy Policy — PetrolSaver",
  description: "How PetrolSaver handles your data. We don't store your location or personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <SubpageHeader />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-white mb-6">Privacy Policy</h1>
        <p className="text-xs text-[#5f6368] mb-8">Last updated: 16 March 2026</p>

        <div className="space-y-6 text-sm text-[#9aa0a6] leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-white mb-2">Summary</h2>
            <p>
              PetrolSaver is designed with privacy in mind. We don&apos;t store your location,
              we don&apos;t track your movements, and we don&apos;t sell your data.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">Location Data</h2>
            <p>
              When you use PetrolSaver, we request your browser&apos;s geolocation to find fuel stations
              near you. This location data is:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Used only in your browser to calculate distances</li>
              <li><strong className="text-white">Never sent to our servers</strong></li>
              <li>Never stored in any database</li>
              <li>Never shared with third parties</li>
              <li>Discarded when you close the page</li>
            </ul>
            <p className="mt-2">
              If you deny location access, PetrolSaver defaults to Melbourne CBD and remains fully functional.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">Email Alerts</h2>
            <p>
              If you sign up for price alerts, we collect your email address, preferred fuel type,
              and optionally your suburb. This data is stored securely with Resend (our email provider)
              and is used solely to send you fuel price notifications. You can unsubscribe at any time.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">Station Flags</h2>
            <p>
              When you flag a station as potentially incorrect, we send an email notification to our
              team containing the station name and ID. No personal information is attached to flags.
              Flagged stations are stored locally in your browser (localStorage) and are not sent to our servers.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">Cookies &amp; Local Storage</h2>
            <p>We use browser localStorage to remember:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Your preferred fuel type</li>
              <li>Stations you&apos;ve flagged</li>
              <li>Whether you&apos;ve signed up for alerts</li>
            </ul>
            <p className="mt-2">
              This data stays on your device and is never transmitted to our servers.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">Analytics</h2>
            <p>
              We use Vercel Analytics to understand how PetrolSaver is used (page views, visitor counts).
              Vercel Analytics is privacy-focused and does not use cookies or collect personal data.
              No individual users are tracked or identified.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">Advertising</h2>
            <p>
              PetrolSaver displays ads via Google AdSense. Google may use cookies to serve ads based on
              your browsing history. You can manage your ad preferences at{" "}
              <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-[#8ab4f8] hover:text-[#aecbfa]">
                Google Ad Settings
              </a>.
              PetrolSaver does not share any data with Google beyond what AdSense collects automatically.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">Third-Party Services</h2>
            <p>PetrolSaver uses the following third-party services:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong className="text-white">Service Victoria</strong> — Victorian fuel price data (public API)</li>
              <li><strong className="text-white">Transport for NSW</strong> — NSW fuel price data (FuelCheck API)</li>
              <li><strong className="text-white">OpenStreetMap / CartoDB</strong> — map tiles</li>
              <li><strong className="text-white">Nominatim</strong> — suburb/location search</li>
              <li><strong className="text-white">Vercel</strong> — hosting and analytics</li>
              <li><strong className="text-white">Google AdSense</strong> — advertising</li>
              <li><strong className="text-white">Resend</strong> — email notifications</li>
              <li><strong className="text-white">Supabase</strong> — price history storage</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">Children&apos;s Privacy</h2>
            <p>
              PetrolSaver is not directed at children under 13. We do not knowingly collect personal
              information from children.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. Changes will be posted on this page
              with an updated date.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-white mb-2">Contact</h2>
            <p>
              For privacy concerns, contact us at{" "}
              <a href="mailto:petrolsaver.live@gmail.com" className="text-[#8ab4f8] hover:text-[#aecbfa]">
                petrolsaver.live@gmail.com
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-white/5 text-center text-[10px] text-[#5f6368]">
          <a href="/terms" className="text-[#8ab4f8] hover:text-[#aecbfa]">Terms of Use</a>
          {" "}&middot;{" "}
          <a href="/how-it-works" className="text-[#8ab4f8] hover:text-[#aecbfa]">How It Works</a>
        </div>
      </div>
    </div>
  );
}
