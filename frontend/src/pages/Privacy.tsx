import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, Trash2 } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-block mb-4 text-blue-100 hover:text-white transition">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-blue-100">Last Updated: April 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-8">
          {/* Information We Collect */}
          <section className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="flex items-start gap-4 mb-4">
              <Lock className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Information We Collect</h2>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span><strong>Account Information:</strong> Name, email address, phone number, and password</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span><strong>Profile Data:</strong> Skills, experience level, expertise areas, profile photo, and bio</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span><strong>Session Information:</strong> Recordings of live coding sessions (with consent from all parties)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span><strong>Payment Information:</strong> Processed securely through Stripe (we don't store full card details)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span><strong>Usage Data:</strong> Login times, pages visited, and interaction metrics</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Your Data */}
          <section className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="flex items-start gap-4 mb-4">
              <Eye className="w-8 h-8 text-purple-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">How We Use Your Data</h2>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex gap-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span>Provide and improve mentorship platform services</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span>Process payments and manage billing</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span>Send communication about platform updates and features</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span>Analyze usage patterns to improve user experience</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-600 font-bold">•</span>
                    <span>Enforce platform policies and prevent fraud</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Security */}
          <section className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="flex items-start gap-4 mb-4">
              <Shield className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Security</h2>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span>All data transmitted over encrypted HTTPS connections</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span>Passwords hashed using industry-standard algorithms</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span>Database encrypted at rest with AES-256 encryption</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span>Regular security audits and vulnerability assessments</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-green-600 font-bold">•</span>
                    <span>No sharing of personal data with third parties without consent</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Your Rights */}
          <section className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="flex items-start gap-4 mb-4">
              <Trash2 className="w-8 h-8 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Privacy Rights</h2>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span><strong>Access:</strong> Request and review all personal data we hold about you</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span><strong>Correction:</strong> Update or correct inaccurate information</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span><strong>Deletion:</strong> Request deletion of your account and personal data</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span><strong>Export:</strong> Download your data in machine-readable format</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-orange-600 font-bold">•</span>
                    <span><strong>Opt-out:</strong> Unsubscribe from marketing communications anytime</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Third-Party Services */}
          <section className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Third-Party Services</h2>
            <p className="text-gray-700 mb-4">
              We use the following third-party services:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span><strong>Stripe:</strong> Secure payment processing</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span><strong>OAuth Providers:</strong> Google and GitHub for authentication</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span><strong>Email Service:</strong> SendGrid for transactional emails</span>
              </li>
            </ul>
          </section>

          {/* Policy Changes */}
          <section className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Policy Changes</h2>
            <p className="text-gray-700">
              We may update this Privacy Policy from time to time. We'll notify you of any material changes by email or through the platform. Your continued use of DevLink constitutes acceptance of any updated Privacy Policy.
            </p>
          </section>

          {/* Contact for Privacy */}
          <section className="text-center bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Privacy Concerns?</h2>
            <p className="text-gray-700 mb-6">
              If you have questions about our privacy practices or want to exercise your rights:
            </p>
            <a
              href="mailto:privacy@devlink.com"
              className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition"
            >
              Contact Privacy Team
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
