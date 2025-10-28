//src/pages/ProfileTab.jsx
import React, { useState, useEffect } from 'react';
import { FaUser, FaEnvelope, FaSave, FaEdit, FaPlay, FaChartLine, FaProjectDiagram } from 'react-icons/fa';

import { useAuth } from '../context/AuthContext';
import { workflowAPI } from '../api/api';

const ProfileTab = () => {
  const [isEditing, setIsEditing] = useState(false);
  const { user, updateProfile } = useAuth();
  const [stats, setStats] = useState({
    workflows: 0,
    executions: 0,
    successRate: 0,
    activeIntegrations: 0
  });
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    company: user?.profile?.company || '',
    role: user?.profile?.role || '',
    bio: user?.profile?.bio || '',
  });

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        company: user.profile?.company || '',
        role: user.profile?.role || '',
        bio: user.profile?.bio || '',
      });
      loadUserStats();
    }
  }, [user]);

  const loadUserStats = async () => {
    try {
      const workflowsResponse = await workflowAPI.getWorkflows();
      const workflows = workflowsResponse.data.workflows;
      
      const totalExecutions = workflows.reduce((sum, wf) => sum + (wf.executionCount || 0), 0);
      const activeIntegrations = Object.values(user?.integrations || {}).filter(Boolean).length;

      setStats({
        workflows: workflows.length,
        executions: totalExecutions,
        successRate: 94, // This would come from actual execution logs
        activeIntegrations
      });
    } catch (error) {
      console.error('Failed to load user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const result = await updateProfile({
      name: profile.name,
      company: profile.company,
      role: profile.role,
      bio: profile.bio
    });

    if (result.success) {
      setIsEditing(false);
    } else {
      alert(result.error);
    }
  };

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-2">Manage your account information and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaEdit size={14} />
                <span>{isEditing ? 'Cancel' : 'Edit'}</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="flex items-center space-x-2 text-gray-900">
                    <FaUser className="text-gray-400" />
                    <span>{profile.name}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="flex items-center space-x-2 text-gray-900">
                  <FaEnvelope className="text-gray-400" />
                  <span>{profile.email}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-gray-900">{profile.company || 'Not specified'}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.role}
                    onChange={(e) => handleChange('role', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-gray-900">{profile.role || 'Not specified'}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                {isEditing ? (
                  <textarea
                    value={profile.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-gray-900">{profile.bio || 'No bio provided'}</div>
                )}
              </div>

              {isEditing && (
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <FaSave size={14} />
                  <span>Save Changes</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 flex items-center space-x-2">
                  <FaProjectDiagram size={14} />
                  <span>Workflows</span>
                </span>
                <span className="font-semibold text-gray-900">{stats.workflows}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 flex items-center space-x-2">
                  <FaPlay size={14} />
                  <span>Executions</span>
                </span>
                <span className="font-semibold text-gray-900">{stats.executions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 flex items-center space-x-2">
                  <FaChartLine size={14} />
                  <span>Success Rate</span>
                </span>
                <span className="font-semibold text-green-600">{stats.successRate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Integrations</span>
                <span className="font-semibold text-gray-900">{stats.activeIntegrations}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Member since</span>
                <span className="text-gray-900">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Auth Provider</span>
                <span className="text-blue-600 font-semibold capitalize">
                  {user?.authProvider || 'email'}
                </span>
              </div>
              <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors mt-4">
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;