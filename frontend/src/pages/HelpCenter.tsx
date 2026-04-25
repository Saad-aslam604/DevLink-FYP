import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'How do payments work?',
    answer: 'DevLink takes a 15% platform commission on mentorship bookings. The remaining 85% goes directly to the mentor. Payments are processed securely through Stripe and transferred weekly.',
  },
  {
    question: 'Can I switch roles?',
    answer: 'Yes! You can upgrade from a Student to a Junior Developer, and later to a Senior Developer/Mentor role. Each role unlock has specific requirements and criteria to meet.',
  },
  {
    question: 'How do I join an organization?',
    answer: 'Organization admins can invite you directly. Once invited, you\'ll receive a notification and can accept or decline the invitation. After accepting, you\'ll have full access to organization features.',
  },
  {
    question: 'How long are mentorship sessions?',
    answer: 'Session duration is flexible and can be negotiated between mentor and student. Most sessions range from 30 minutes to 2 hours. You can book recurring sessions for ongoing mentorship.',
  },
  {
    question: 'Can I record live coding sessions?',
    answer: 'Yes, with consent from both parties. Recordings are securely stored and can be reviewed later. Always ensure both mentor and student agree to recording before starting.',
  },
  {
    question: 'What if I need to cancel a session?',
    answer: 'You can cancel up to 24 hours before the session with no penalties. Cancellations within 24 hours may incur a cancellation fee. Both parties receive notifications of cancellations.',
  },
];

export default function HelpCenter() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-block mb-4 text-blue-100 hover:text-white transition">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-4">Help Center</h1>
          <p className="text-blue-100">Find answers and learn how to use DevLink</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Getting Started */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Getting Started</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-2">Creating Your Account</h3>
              <p className="text-gray-600 text-sm">Sign up with email or OAuth providers. Verify your email to activate your account.</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-2">Setting Up Your Profile</h3>
              <p className="text-gray-600 text-sm">Add your profile photo, bio, skills, and experience. A complete profile attracts more mentors.</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-2">Choosing Your Role</h3>
              <p className="text-gray-600 text-sm">Select your role as Student, Junior Developer, or Mentor based on your experience level.</p>
            </div>
          </div>
        </section>

        {/* Platform Features */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Platform Features</h2>
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-2">📅 Booking Mentorship Sessions</h3>
              <p className="text-gray-600">Browse mentors, check their availability, and book sessions. You can schedule recurring sessions for ongoing mentorship.</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-2">💻 Live Coding Collaboration</h3>
              <p className="text-gray-600">Use our integrated live coding editor during sessions. Real-time collaboration allows simultaneous coding and video conferencing.</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-2">📋 Project Management</h3>
              <p className="text-gray-600">Create and manage projects. Track progress, assign tasks, and collaborate with team members on project goals.</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-2">🏢 Organization Dashboard</h3>
              <p className="text-gray-600">Organizations can manage team members, projects, resources, and track performance analytics in one place.</p>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === idx ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <span className="font-semibold text-gray-900">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-600 transition-transform ${
                      expandedFAQ === idx ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expandedFAQ === idx && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <p className="text-gray-700">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-100 text-center">
          <p className="text-gray-700 mb-4">Still have questions?</p>
          <Link
            to="/contact"
            className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition"
          >
            Contact Our Support Team
          </Link>
        </div>
      </div>
    </div>
  );
}
