import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, MapPin, ArrowRight } from 'lucide-react';

export default function CareersPage() {
  const positions = [
    {
      id: 1,
      title: 'Senior Full Stack Developer',
      department: 'Engineering',
      location: 'Remote',
      type: 'Full-time',
      description: 'We\'re looking for an experienced full stack developer to help build the next generation of DevLink.'
    },
    {
      id: 2,
      title: 'Product Manager',
      department: 'Product',
      location: 'San Francisco, CA',
      type: 'Full-time',
      description: 'Lead product strategy and vision for our mentorship platform. Drive feature development and user experience.'
    },
    {
      id: 3,
      title: 'Community Manager',
      department: 'Community',
      location: 'Remote',
      type: 'Full-time',
      description: 'Build and nurture our developer community. Create content, organize events, and foster connections.'
    },
    {
      id: 4,
      title: 'Frontend Developer',
      department: 'Engineering',
      location: 'Remote',
      type: 'Full-time',
      description: 'Create beautiful and responsive user interfaces using React, TypeScript, and modern web technologies.'
    },
    {
      id: 5,
      title: 'DevOps Engineer',
      department: 'Engineering',
      location: 'Remote',
      type: 'Full-time',
      description: 'Manage our infrastructure, CI/CD pipelines, and ensure platform reliability and scalability.'
    },
    {
      id: 6,
      title: 'Marketing Specialist',
      department: 'Marketing',
      location: 'New York, NY',
      type: 'Full-time',
      description: 'Develop and execute marketing strategies to grow our user base and mentor community.'
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
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">Join Our Team</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're building the future of developer mentorship. If you're passionate about helping others grow and creating amazing products, 
              we'd love to hear from you.
            </p>
          </div>

          {/* Culture Section */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              {
                title: 'Remote First',
                description: 'Work from anywhere in the world. We believe in flexibility and trust.'
              },
              {
                title: 'Growth Focused',
                description: 'We invest in your development with courses, conferences, and mentorship.'
              },
              {
                title: 'Impact Driven',
                description: 'Your work directly impacts thousands of developers worldwide.'
              }
            ].map((item, index) => (
              <div key={index} className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>

          {/* Open Positions */}
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-12">Open Positions</h2>
            
            <div className="grid gap-6">
              {positions.map((position) => (
                <div
                  key={position.id}
                  className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition group"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition">
                        {position.title}
                      </h3>
                      <p className="text-gray-600 mb-4">{position.description}</p>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4" /> {position.department}
                        </span>
                        <span className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" /> {position.location}
                        </span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                          {position.type}
                        </span>
                      </div>
                    </div>

                    <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition transform hover:scale-105 whitespace-nowrap">
                      Apply Now <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div className="mt-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
            <h2 className="text-3xl font-bold mb-8 text-center">What We Offer</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { title: 'Competitive Salary', description: 'Top-tier compensation package' },
                { title: 'Health Insurance', description: 'Medical, dental, and vision' },
                { title: 'Unlimited PTO', description: 'Flexible time off policy' },
                { title: 'Professional Development', description: 'Courses and conference budgets' },
                { title: '401(k)', description: 'Employer matching program' },
                { title: 'Equity', description: 'Share in our success' },
                { title: 'Home Office Setup', description: '$1,500 equipment budget' },
                { title: 'Team Events', description: 'Annual retreats and socials' }
              ].map((benefit, index) => (
                <div key={index}>
                  <h4 className="font-semibold mb-2">{benefit.title}</h4>
                  <p className="text-sm text-blue-100">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-20">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Don't see your fit?</h2>
            <p className="text-gray-600 mb-6">
              Send us your resume and tell us how you'd like to contribute to DevLink.
            </p>
            <button className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition transform hover:scale-105">
              Send Your Profile <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
