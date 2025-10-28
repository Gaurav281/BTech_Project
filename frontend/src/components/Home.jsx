import React from 'react'
import { useAuth } from '../context/AuthContext'

const Home = () => {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 animate-fade-in">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AuthApp
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            A modern, secure authentication system built with React, Python, and MongoDB. 
            Experience seamless login with email/password or Google authentication.
          </p>

          {user ? (
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto animate-slide-up">
              <div className="flex items-center justify-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Hello, {user.name}! 👋
              </h2>
              
              <p className="text-gray-600 mb-6">
                You're successfully signed in to your account. Your authentication was handled 
                securely using {user.auth_provider === 'google' ? 'Google OAuth' : 'email/password'}.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Account Details</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><span className="font-medium">Name:</span> {user.name}</p>
                  <p><span className="font-medium">Email:</span> {user.email}</p>
                  <p><span className="font-medium">Auth Provider:</span> {user.auth_provider}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto animate-slide-up">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Get Started Today
              </h2>
              
              <p className="text-gray-600 mb-6">
                Join thousands of users who trust our secure authentication system. 
                Sign up now to experience the future of user authentication.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/signup"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
                >
                  Create Account
                </a>
                <a
                  href="/login"
                  className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200"
                >
                  Sign In
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Our Auth System?
            </h2>
            <p className="text-xl text-gray-600">
              Built with the latest technologies for maximum security and user experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Secure & Reliable',
                description: 'Industry-standard encryption and secure token-based authentication',
                icon: '🔒'
              },
              {
                title: 'Google Integration',
                description: 'Seamless login with Google OAuth 2.0 for convenience',
                icon: '⚡'
              },
              {
                title: 'Modern UI/UX',
                description: 'Beautiful, responsive design built with Tailwind CSS',
                icon: '🎨'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home