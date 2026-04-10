import React from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';

export default function PricingPage() {
  const plans = [
    {
      name: 'Learner',
      description: 'Perfect for getting started',
      price: 'Free',
      period: 'Forever free',
      features: [
        'Access to public mentors',
        'Basic messaging',
        'Join community forums',
        'Limited to 1 live session/month',
        'Profile creation'
      ],
      color: 'blue'
    },
    {
      name: 'Professional',
      description: 'Most popular for active learners',
      price: '$49',
      period: 'per month',
      features: [
        'Unlimited messaging',
        'Unlimited live sessions',
        'Priority mentor matching',
        'Code review sessions',
        'Project collaboration tools',
        'Certificate of completion',
        '24/7 support'
      ],
      color: 'purple',
      popular: true
    },
    {
      name: 'Enterprise',
      description: 'For teams and organizations',
      price: 'Custom',
      period: 'Contact us',
      features: [
        'Everything in Professional',
        'Team management dashboard',
        'Custom training programs',
        'Dedicated account manager',
        'API access',
        'Custom integrations',
        'SSO authentication'
      ],
      color: 'indigo'
    }
  ];

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
            <p className="text-xl text-gray-600 mb-8">Choose the perfect plan for your learning journey</p>
            
            {/* Billing Toggle */}
            <div className="inline-flex bg-gray-200 rounded-lg p-1">
              <button className="px-6 py-2 bg-white text-gray-900 font-medium rounded-md shadow-sm">
                Monthly
              </button>
              <button className="px-6 py-2 text-gray-600 font-medium">
                Annual (Save 20%)
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative rounded-2xl transition-all duration-300 ${
                  plan.popular
                    ? 'md:scale-105 bg-white shadow-2xl border-2 border-purple-500'
                    : 'bg-white shadow-lg border border-gray-200 hover:shadow-xl'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>

                  <div className="mb-6">
                    <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600 ml-2">{plan.period}</span>
                  </div>

                  <button
                    className={`w-full py-3 px-6 rounded-lg font-semibold mb-8 transition-all transform hover:scale-105 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    Get Started
                  </button>

                  <div className="space-y-4">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                          plan.popular ? 'text-purple-600' : 'text-blue-600'
                        }`} />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Frequently Asked Questions</h2>
            
            <div className="space-y-6">
              {[
                {
                  q: 'Can I cancel anytime?',
                  a: 'Yes, you can cancel your subscription anytime with no penalties. Your access continues until the end of your billing cycle.'
                },
                {
                  q: 'Do you offer refunds?',
                  a: 'We offer a 7-day money-back guarantee. If you\'re not satisfied, we\'ll refund your payment in full.'
                },
                {
                  q: 'Can I change plans later?',
                  a: 'Absolutely! You can upgrade or downgrade your plan anytime. Changes take effect on your next billing cycle.'
                },
                {
                  q: 'Is there a free trial?',
                  a: 'Yes, the Learner plan is completely free and has no time limit. Try all our features risk-free!'
                }
              ].map((item, idx) => (
                <div key={idx} className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.q}</h3>
                  <p className="text-gray-600">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
