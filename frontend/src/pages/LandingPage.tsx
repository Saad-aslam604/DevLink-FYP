import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Users, Code, Video, MessageCircle, Star, CheckCircle, Zap, Shield, Globe, Menu, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Common/Logo';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Handle Browse Mentors - redirect to login if not authenticated
  const handleBrowseMentors = () => {
    if (!user) {
      navigate('/login');
    } else {
      navigate('/app/mentors');
    }
  };

  // Handle Become Mentor - redirect to login first if not authenticated
  const handleBecomeMentor = () => {
    if (!user) {
      navigate('/login');
    } else {
      navigate('/app/become-mentor');
    }
  };

  // Handle Get Started - redirect to signup or dashboard
  const handleGetStarted = () => {
    if (user) {
      navigate('/app/dashboard');
    } else {
      navigate('/signup');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo variant="light" />
            
            <div className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => window.scrollTo({ top: document.getElementById('features')?.offsetTop || 0, behavior: 'smooth' })}
                className="text-gray-600 hover:text-gray-900 transition cursor-pointer"
              >
                Features
              </button>
              <button 
                onClick={() => window.scrollTo({ top: document.getElementById('how-it-works')?.offsetTop || 0, behavior: 'smooth' })}
                className="text-gray-600 hover:text-gray-900 transition cursor-pointer"
              >
                How It Works
              </button>
              <button 
                onClick={() => window.scrollTo({ top: document.getElementById('testimonials')?.offsetTop || 0, behavior: 'smooth' })}
                className="text-gray-600 hover:text-gray-900 transition cursor-pointer"
              >
                Testimonials
              </button>
              <Link to="/login" className="text-gray-600 hover:text-gray-900 transition">Sign In</Link>
              <Link 
                to="/signup" 
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                Get Started
              </Link>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-4 space-y-3">
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  window.scrollTo({ top: document.getElementById('features')?.offsetTop || 0, behavior: 'smooth' });
                }}
                className="block text-gray-600 hover:text-gray-900 transition w-full text-left"
              >
                Features
              </button>
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  window.scrollTo({ top: document.getElementById('how-it-works')?.offsetTop || 0, behavior: 'smooth' });
                }}
                className="block text-gray-600 hover:text-gray-900 transition w-full text-left"
              >
                How It Works
              </button>
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  window.scrollTo({ top: document.getElementById('testimonials')?.offsetTop || 0, behavior: 'smooth' });
                }}
                className="block text-gray-600 hover:text-gray-900 transition w-full text-left"
              >
                Testimonials
              </button>
              <Link to="/login" className="block text-gray-600 hover:text-gray-900 transition">Sign In</Link>
              <Link 
                to="/signup" 
                className="block px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg text-center"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
              <Zap className="w-4 h-4 mr-2" />
              Real-time collaboration for developers
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6">
              Connect, Code, and
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"> Grow Together</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              DevLink connects junior developers with senior mentors through live coding sessions, 
              real-time video calls, and collaborative project work.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleGetStarted}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg cursor-pointer"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </button>
              <button
                onClick={handleBrowseMentors}
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-900 font-semibold rounded-lg border border-gray-300 hover:bg-gray-50 transition-all shadow-md hover:shadow-lg cursor-pointer"
              >
                Browse Mentors
                <Users className="ml-2 w-5 h-5" />
              </button>
            </div>
            
            {/* Floating elements for visual interest */}
            <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-32 h-32 bg-purple-200 rounded-full opacity-20 animate-pulse delay-1000"></div>
            <div className="absolute top-40 right-20 w-16 h-16 bg-indigo-200 rounded-full opacity-20 animate-pulse delay-500"></div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything you need to grow</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed to make learning and mentoring seamless
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Video className="w-8 h-8 text-blue-600" />}
              title="Live Video Sessions"
              description="HD video calls with screen sharing for personalized mentoring sessions"
            />
            <FeatureCard
              icon={<Code className="w-8 h-8 text-purple-600" />}
              title="Real-time Code Collaboration"
              description="Live coding environments with Monaco Editor for hands-on learning"
            />
            <FeatureCard
              icon={<MessageCircle className="w-8 h-8 text-green-600" />}
              title="Instant Messaging"
              description="Chat with mentors and peers for quick questions and discussions"
            />
            <FeatureCard
              icon={<Users className="w-8 h-8 text-orange-600" />}
              title="Expert Mentors"
              description="Connect with experienced developers from top tech companies"
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-red-600" />}
              title="Secure Payments"
              description="Safe and transparent payment system for mentoring services"
            />
            <FeatureCard
              icon={<Globe className="w-8 h-8 text-indigo-600" />}
              title="Global Community"
              description="Join a worldwide network of developers learning together"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How DevLink Works</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get started in minutes and accelerate your development journey
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Sign Up & Create Profile"
              description="Create your account and tell us about your skills and learning goals"
            />
            <StepCard
              number="2"
              title="Find Your Mentor"
              description="Browse through our curated list of experienced mentors"
            />
            <StepCard
              number="3"
              title="Start Learning"
              description="Book sessions, join live coding, and begin your growth journey"
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What Developers Say</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join thousands of developers already growing with DevLink
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard
              name="Junior Developer"
              role=""
              content="The platform helped me grow!"
              rating={5}
            />
            <TestimonialCard
              name="Senior Developer"
              role=""
              content="Great experience mentoring!"
              rating={5}
            />
            <TestimonialCard
              name="Frontend Developer"
              role=""
              content="Love the live coding feature!"
              rating={5}
            />
          </div>
        </div>
      </section>

      {/* Careers Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Join Our Team</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're building the future of developer mentorship. Help us transform how developers learn and grow together.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="p-8 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Software Developer</h3>
              <p className="text-gray-600 mb-4">Full Stack • Remote • Competitive Salary</p>
              <p className="text-gray-700 mb-6">Help build scalable features for our mentorship platform. Work with modern tech stack and passionate developers.</p>
              <div className="flex items-center text-blue-600 font-semibold group cursor-pointer hover:text-blue-700">
                Learn More <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition" />
              </div>
            </div>

            <div className="p-8 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Product Manager</h3>
              <p className="text-gray-600 mb-4">Product Strategy • Remote • Competitive Salary</p>
              <p className="text-gray-700 mb-6">Shape the future of DevLink. Drive product strategy and lead initiatives that impact thousands of developers.</p>
              <div className="flex items-center text-blue-600 font-semibold group cursor-pointer hover:text-blue-700">
                Learn More <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition" />
              </div>
            </div>

            <div className="p-8 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Community Manager</h3>
              <p className="text-gray-600 mb-4">Community • Remote • Competitive Salary</p>
              <p className="text-gray-700 mb-6">Build and nurture our developer community. Connect mentors and mentees, organize events, and foster engagement.</p>
              <div className="flex items-center text-blue-600 font-semibold group cursor-pointer hover:text-blue-700">
                Learn More <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-12 border border-blue-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">What We Offer</h3>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900">Competitive Compensation</p>
                  <p className="text-gray-600">Market-competitive salary and benefits package</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900">Remote Work</p>
                  <p className="text-gray-600">100% flexible remote work opportunities</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900">Professional Development</p>
                  <p className="text-gray-600">Learning budget and growth opportunities</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900">Health & Wellness</p>
                  <p className="text-gray-600">Comprehensive health and wellness benefits</p>
                </div>
              </div>
            </div>
            <p className="text-center text-gray-700">
              Interested in joining our team? <a href="mailto:careers@devlink.com" className="font-semibold text-blue-600 hover:text-blue-700 transition">Contact us at careers@devlink.com</a>
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Level Up Your Skills?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of developers already growing with DevLink
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg cursor-pointer"
            >
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
            <button
              onClick={handleBecomeMentor}
              className="inline-flex items-center justify-center px-8 py-4 bg-transparent text-white font-semibold rounded-lg border-2 border-white hover:bg-white hover:text-blue-600 transition-all cursor-pointer"
            >
              Become a Mentor
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Logo variant="dark" className="mb-4 !text-base" showText={true} />
              <p className="text-sm">Empowering developers to learn, grow, and succeed together.</p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => {
                  setMobileMenuOpen(false);
                  window.scrollTo({ top: document.getElementById('features')?.offsetTop || 0, behavior: 'smooth' });
                }} className="hover:text-white transition cursor-pointer">Features</button></li>
                <li><Link to="/pricing" className="hover:text-white transition">Pricing</Link></li>
                <li><button onClick={handleBrowseMentors} className="hover:text-white transition cursor-pointer">Find Mentors</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="hover:text-white transition">About</Link></li>
                <li><Link to="/blog" className="hover:text-white transition">Blog</Link></li>
                <li><Link to="/careers" className="hover:text-white transition">Careers</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/support" className="hover:text-white transition">Support Center</Link></li>
                <li><Link to="/help-center" className="hover:text-white transition">Help Center</Link></li>
                <li><Link to="/contact" className="hover:text-white transition">Contact</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition">Privacy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2024 DevLink. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
}) {
  return (
    <div className="group p-6 bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200 transform hover:-translate-y-1">
      <div className="mb-4 group-hover:scale-110 transition-transform duration-300">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description }: { 
  number: number; 
  title: string; 
  description: string; 
}) {
  return (
    <div className="text-center group">
      <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
        {number}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function TestimonialCard({ name, role, content, rating }: { 
  name: string; 
  role: string; 
  content: string; 
  rating: number; 
}) {
  return (
    <div className="group p-6 bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200 transform hover:-translate-y-1">
      <div className="flex mb-4">
        {[...Array(rating)].map((_, i) => (
          <Star key={i} className="w-5 h-5 text-yellow-400 fill-current group-hover:scale-110 transition-transform duration-300" style={{ animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
      <p className="text-gray-700 mb-4 group-hover:text-gray-900 transition-colors">"{content}"</p>
      <div>
        <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{name}</div>
        <div className="text-sm text-gray-600">{role}</div>
      </div>
    </div>
  );
}
