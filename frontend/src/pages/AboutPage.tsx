import React from 'react';
import { Link } from 'react-router-dom';
import { Code, Users, Zap, Globe, Award, Heart } from 'lucide-react';

export default function AboutPage() {
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
          <div className="text-center mb-20">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">About DevLink</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're on a mission to empower developers worldwide by connecting junior developers with experienced mentors, 
              fostering a community where knowledge is shared freely and careers are built together.
            </p>
          </div>

          {/* Mission & Vision */}
          <div className="grid md:grid-cols-2 gap-12 mb-20">
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                To democratize access to quality mentorship and accelerate the growth of the next generation of developers. 
                We believe everyone deserves a chance to learn from the best, regardless of their background or location.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Vision</h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                A world where every developer has access to world-class mentorship, where knowledge flows freely across borders, 
                and where success is measured by the impact we have on each other's careers and lives.
              </p>
            </div>
          </div>

          {/* Values */}
          <div className="mb-20">
            <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">Our Values</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Code className="w-12 h-12 text-blue-600" />,
                  title: 'Excellence',
                  description: 'We are committed to providing the highest quality mentorship and learning experiences.'
                },
                {
                  icon: <Users className="w-12 h-12 text-purple-600" />,
                  title: 'Community',
                  description: 'We believe in the power of community and collaboration to drive growth and innovation.'
                },
                {
                  icon: <Heart className="w-12 h-12 text-red-600" />,
                  title: 'Passion',
                  description: 'We are passionate about helping developers succeed and reach their full potential.'
                },
                {
                  icon: <Globe className="w-12 h-12 text-green-600" />,
                  title: 'Accessibility',
                  description: 'We make quality mentorship accessible to everyone, everywhere, at affordable prices.'
                },
                {
                  icon: <Award className="w-12 h-12 text-yellow-600" />,
                  title: 'Growth',
                  description: 'We are dedicated to continuous learning and helping others grow in their careers.'
                },
                {
                  icon: <Zap className="w-12 h-12 text-indigo-600" />,
                  title: 'Innovation',
                  description: 'We leverage cutting-edge technology to create innovative learning experiences.'
                }
              ].map((value, index) => (
                <div key={index} className="text-center">
                  <div className="mb-4 flex justify-center">{value.icon}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Team Highlights */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white text-center">
            <h2 className="text-3xl font-bold mb-4">Built by Developers, for Developers</h2>
            <p className="text-lg text-blue-100 max-w-3xl mx-auto">
              DevLink was founded by a team of passionate developers who experienced the challenges of breaking into tech 
              and understood the value of quality mentorship. We created DevLink to solve the problem we faced ourselves.
            </p>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-8 mt-20">
            {[
              { number: '5000+', label: 'Active Users' },
              { number: '500+', label: 'Expert Mentors' },
              { number: '50K+', label: 'Sessions Completed' },
              { number: '90%', label: 'Satisfaction Rate' }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
                  {stat.number}
                </div>
                <p className="text-gray-600 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
