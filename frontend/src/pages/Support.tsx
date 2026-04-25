import React from 'react';
import { Mail, Phone, MessageCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Support() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-block mb-4 text-blue-100 hover:text-white transition">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-4">Support Center</h1>
          <p className="text-blue-100">We're here to help you succeed on DevLink</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-8">
          {/* Technical Support */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="flex items-start gap-4 mb-4">
              <Mail className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Technical Support</h2>
                <p className="text-gray-600 mb-4">
                  For issues with the platform, account problems, or technical questions.
                </p>
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  📧 support@devlink.com
                </p>
                <p className="text-gray-600">Response time: 24-48 hours</p>
              </div>
            </div>
          </div>

          {/* Platform Issues */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="flex items-start gap-4 mb-4">
              <AlertCircle className="w-8 h-8 text-purple-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Platform Issues</h2>
                <p className="text-gray-600 mb-4">
                  Check our Help Center for common solutions and troubleshooting guides.
                </p>
                <Link
                  to="/help-center"
                  className="inline-block px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition"
                >
                  Visit Help Center
                </Link>
              </div>
            </div>
          </div>

          {/* Live Coding Support */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <div className="flex items-start gap-4 mb-4">
              <MessageCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Live Support</h2>
                <p className="text-gray-600 mb-4">
                  For urgent issues during active coding sessions, chat support is available.
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Priority support available for:</span>
                  <ul className="list-disc list-inside mt-2 text-gray-600">
                    <li>Active mentorship sessions</li>
                    <li>Live coding collaboration issues</li>
                    <li>Emergency technical problems</li>
                  </ul>
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Quick Support Form</h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Subject</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Issue subject"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Message</label>
                <textarea
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Describe your issue..."
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
