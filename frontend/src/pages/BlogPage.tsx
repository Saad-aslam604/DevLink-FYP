import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, User, ArrowRight, Search } from 'lucide-react';

export default function BlogPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const blogPosts = [
    {
      id: 1,
      title: 'Getting Started with React Hooks: A Complete Guide',
      excerpt: 'Learn how to use React Hooks to manage state and side effects in your functional components.',
      author: 'Sarah Chen',
      date: 'Mar 15, 2024',
      category: 'React',
      readTime: '8 min read',
      image: 'bg-gradient-to-br from-blue-400 to-blue-600'
    },
    {
      id: 2,
      title: 'The Art of Code Review: Best Practices for Teams',
      excerpt: 'Discover how to conduct effective code reviews that improve code quality and team communication.',
      author: 'Michael Rodriguez',
      date: 'Mar 12, 2024',
      category: 'Best Practices',
      readTime: '6 min read',
      image: 'bg-gradient-to-br from-purple-400 to-purple-600'
    },
    {
      id: 3,
      title: 'Mastering TypeScript: Advanced Types and Patterns',
      excerpt: 'Explore advanced TypeScript features that will make your code more robust and maintainable.',
      author: 'Emily Johnson',
      date: 'Mar 10, 2024',
      category: 'TypeScript',
      readTime: '10 min read',
      image: 'bg-gradient-to-br from-indigo-400 to-indigo-600'
    },
    {
      id: 4,
      title: 'Building Scalable APIs with Node.js and Express',
      excerpt: 'Learn architecture patterns and best practices for building production-ready REST APIs.',
      author: 'James Wilson',
      date: 'Mar 8, 2024',
      category: 'Backend',
      readTime: '12 min read',
      image: 'bg-gradient-to-br from-green-400 to-green-600'
    },
    {
      id: 5,
      title: 'The Importance of Mentorship in Tech Careers',
      excerpt: 'Understand how mentorship can accelerate your career growth and help you navigate challenges.',
      author: 'Lisa Park',
      date: 'Mar 5, 2024',
      category: 'Career',
      readTime: '7 min read',
      image: 'bg-gradient-to-br from-orange-400 to-orange-600'
    },
    {
      id: 6,
      title: 'Web Performance Optimization: Tips and Tricks',
      excerpt: 'Discover techniques to make your websites faster and improve user experience significantly.',
      author: 'David Smith',
      date: 'Mar 1, 2024',
      category: 'Performance',
      readTime: '9 min read',
      image: 'bg-gradient-to-br from-pink-400 to-pink-600'
    }
  ];

  const filteredPosts = blogPosts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = ['All', 'React', 'TypeScript', 'Backend', 'Career', 'Best Practices'];

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
            <h1 className="text-5xl font-bold text-gray-900 mb-4">DevLink Blog</h1>
            <p className="text-xl text-gray-600 mb-8">
              Tips, tricks, and insights from the DevLink community and industry experts
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="flex flex-wrap justify-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className="px-4 py-2 rounded-full bg-white border border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600 transition"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Featured Post */}
          {filteredPosts.length > 0 && (
            <div className="mb-16 bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-200">
              <div className="grid md:grid-cols-2 gap-8 p-8">
                <div className={`h-64 md:h-full rounded-lg ${filteredPosts[0].image}`}></div>
                <div className="flex flex-col justify-center">
                  <span className="text-blue-600 font-semibold text-sm mb-2">{filteredPosts[0].category}</span>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">{filteredPosts[0].title}</h2>
                  <p className="text-gray-600 mb-6">{filteredPosts[0].excerpt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" /> {filteredPosts[0].author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" /> {filteredPosts[0].date}
                      </span>
                    </div>
                    <button className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold">
                      Read More <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Blog Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.slice(1).map((post) => (
              <div key={post.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition border border-gray-200 overflow-hidden group">
                <div className={`h-48 ${post.image}`}></div>
                <div className="p-6">
                  <span className="text-blue-600 font-semibold text-sm">{post.category}</span>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">{post.excerpt}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex gap-3 text-xs text-gray-500">
                      <span>{post.readTime}</span>
                      <span>{post.date}</span>
                    </div>
                    <button className="text-blue-600 hover:text-blue-700 font-semibold">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-gray-600">No articles found. Try a different search term.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
