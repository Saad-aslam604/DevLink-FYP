import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Eye, Lock, Database, Bell, Trash2 } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="text-xl font-bold text-gray-900">DevLink</Link>
            <div className="flex gap-4">
              <Link to="/" className="text-gray-600 hover:text-gray-900">Back to Home</Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Title */}
          <div className="mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-gray-600">Last updated: March 2024</p>
          </div>

          {/* Quick Links */}
          <div className="grid md:grid-cols-2 gap-4 mb-12">
            {[
              { icon: Shield, title: 'Data Security', href: '#security' },
              { icon: Eye, title: 'What We Collect', href: '#collection' },
              { icon: Lock, title: 'Your Privacy Rights', href: '#rights' },
              { icon: Database, title: 'Data Retention', href: '#retention' }
            ].map((item, index) => (
              <a
                key={index}
                href={item.href}
                className="bg-white p-6 rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-lg transition flex items-center gap-4 group"
              >
                <item.icon className="w-8 h-8 text-blue-600 group-hover:scale-110 transition" />
                <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition">{item.title}</span>
              </a>
            ))}
          </div>

          {/* Content */}
          <div className="space-y-12">
            {/* Introduction */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Privacy at DevLink</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                At DevLink, we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, 
                and safeguard your information when you use our platform.
              </p>
              <p className="text-gray-600 leading-relaxed">
                By accessing DevLink, you acknowledge that you have read, understood, and agree to be bound by all the terms of this Privacy Policy.
              </p>
            </section>

            {/* What We Collect */}
            <section id="collection">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Information We Collect</h2>
              <div className="space-y-4">
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Account Information</h3>
                  <p className="text-gray-600">
                    We collect your name, email address, password, profile picture, bio, skills, and experience level when you create an account.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Usage Data</h3>
                  <p className="text-gray-600">
                    We collect information about how you interact with our platform, including session duration, features used, and pages visited.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Communication Data</h3>
                  <p className="text-gray-600">
                    Messages between mentors and mentees are stored to facilitate communication and improve our services.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Technical Data</h3>
                  <p className="text-gray-600">
                    IP address, browser type, device information, and cookies help us understand how our platform is used.
                  </p>
                </div>
              </div>
            </section>

            {/* How We Use Your Data */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">How We Use Your Information</h2>
              <ul className="space-y-3">
                {[
                  'To provide and maintain our platform',
                  'To match mentors with appropriate mentees',
                  'To facilitate communication between users',
                  'To process payments and handle transactions',
                  'To send you service-related announcements',
                  'To improve and personalize your experience',
                  'To prevent fraud and ensure security',
                  'To comply with legal obligations'
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
                    <span className="text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Data Security */}
            <section id="security">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Data Security</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                DevLink implements comprehensive security measures to protect your personal data from unauthorized access, alteration, disclosure, or destruction.
              </p>
              <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                <p className="text-gray-700">
                  <strong>Our security practices include:</strong>
                </p>
                <ul className="mt-4 space-y-2 text-gray-700">
                  <li>• SSL/TLS encryption for data in transit</li>
                  <li>• AES-256 encryption for data at rest</li>
                  <li>• Regular security audits and penetration testing</li>
                  <li>• Secure password hashing with bcrypt</li>
                  <li>• Two-factor authentication options</li>
                  <li>• Restricted access to personal data</li>
                </ul>
              </div>
            </section>

            {/* Your Privacy Rights */}
            <section id="rights">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Your Privacy Rights</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                You have the following rights regarding your personal data:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    title: 'Right to Access',
                    description: 'You can request a copy of the personal data we hold about you'
                  },
                  {
                    title: 'Right to Rectification',
                    description: 'You can request correction of inaccurate or incomplete data'
                  },
                  {
                    title: 'Right to Erasure',
                    description: 'You can request deletion of your personal data under certain circumstances'
                  },
                  {
                    title: 'Right to Portability',
                    description: 'You can request your data in a machine-readable format'
                  },
                  {
                    title: 'Right to Object',
                    description: 'You can object to certain types of data processing'
                  },
                  {
                    title: 'Right to Withdraw Consent',
                    description: 'You can withdraw consent for data processing at any time'
                  }
                ].map((right, index) => (
                  <div key={index} className="bg-white p-6 rounded-lg border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">{right.title}</h4>
                    <p className="text-sm text-gray-600">{right.description}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Data Retention */}
            <section id="retention">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Data Retention</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We retain your personal data for as long as necessary to provide our services and fulfill the purposes outlined in this Privacy Policy. 
                Specific retention periods include:
              </p>
              <div className="space-y-3">
                {[
                  { label: 'Account Data', period: 'Until account deletion + 30 days' },
                  { label: 'Messages', period: 'Until manually deleted or 2 years after last activity' },
                  { label: 'Transaction Records', period: '7 years for compliance purposes' },
                  { label: 'Usage Analytics', period: '12 months' }
                ].map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="font-medium text-gray-900">{item.label}</span>
                    <span className="text-gray-600">{item.period}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Third-Party Services */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Third-Party Services</h2>
              <p className="text-gray-600 leading-relaxed">
                We use third-party services for payment processing, analytics, and customer support. These services are bound by confidentiality agreements 
                and are not permitted to use your information for their own purposes. We only share the minimum necessary information.
              </p>
            </section>

            {/* Changes to Privacy Policy */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Policy Updates</h2>
              <p className="text-gray-600 leading-relaxed">
                We may update this Privacy Policy periodically. Significant changes will be communicated via email or prominent notice on our platform. 
                Your continued use of DevLink following the publication of updated Privacy Policy terms means that you accept and agree to the changes.
              </p>
            </section>

            {/* Contact */}
            <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
              <h2 className="text-3xl font-bold mb-4">Questions About Our Privacy Policy?</h2>
              <p className="mb-6">
                If you have any questions or concerns about our privacy practices, please contact us.
              </p>
              <div className="space-y-2">
                <p><strong>Email:</strong> privacy@devlink.com</p>
                <p><strong>Mail:</strong> DevLink Privacy Team, San Francisco, CA 94102</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
