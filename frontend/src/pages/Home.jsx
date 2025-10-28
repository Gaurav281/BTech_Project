import React from 'react';
import { Link } from 'react-router-dom';
import { FaRocket, FaMagic, FaShare, FaPlug, FaUsers } from 'react-icons/fa';

const Home = () => {
  const features = [
    {
      icon: FaMagic,
      title: 'AI-Powered Workflows',
      description: 'Describe what you want to automate and let AI build the workflow for you'
    },
    {
      icon: FaPlug,
      title: 'Multiple Integrations',
      description: 'Connect with Gmail, Telegram, Slack, Google Sheets, and many more services'
    },
    {
      icon: FaShare,
      title: 'Share & Collaborate',
      description: 'Publish your workflows and discover automation from the community'
    },
    {
      icon: FaUsers,
      title: 'Team Ready',
      description: 'Work together with your team on complex automation projects'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <FaRocket className="text-white text-3xl" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Automate Everything with{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Describe your workflow in plain English and watch as AI builds complete automation 
            with drag-and-drop editing, real-time execution, and seamless integrations.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/workflow"
              className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
            >
              <FaMagic className="mr-2" />
              Build Your First Workflow
            </Link>
            <Link
              to="/marketplace"
              className="inline-flex items-center justify-center px-8 py-4 border border-gray-300 text-lg font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200"
            >
              <FaUsers className="mr-2" />
              Explore Marketplace
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose WorkflowAI?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The most intuitive way to build powerful automations without writing code
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="text-center p-6 group hover:transform hover:-translate-y-2 transition-all duration-300"
                >
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:shadow-lg transition-shadow">
                    <Icon className="text-white text-2xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-500 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Workflow?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of users automating their tasks with AI-powered workflows
          </p>
          <Link
            to="/workflow"
            className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-lg font-medium rounded-lg text-white bg-transparent hover:bg-white hover:text-blue-600 transition-all duration-200 transform hover:-translate-y-0.5"
          >
            <FaRocket className="mr-2" />
            Start Building Now
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;