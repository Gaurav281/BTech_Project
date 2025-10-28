//src/pages/OAuthCallback.jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { integrationsAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Prevent multiple executions
      if (processed) return;
      
      if (!isAuthenticated || !user) {
        navigate('/login');
        return;
      }

      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error from provider:', error);
        navigate('/integrations?oauth=error&message=' + encodeURIComponent(error));
        return;
      }

      if (!code || !state) {
        console.error('Missing code or state parameter');
        navigate('/integrations?oauth=error&message=missing_parameters');
        return;
      }

      try {
        setProcessed(true);
        
        // Exchange code for tokens using POST request
        await integrationsAPI.oauthCallback(code, state);
        
        // Show success message and redirect
        const popup = document.createElement('div');
        popup.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-out font-semibold';
        popup.textContent = '✅ OAuth authentication successful!';
        document.body.appendChild(popup);
        
        setTimeout(() => {
          if (document.body.contains(popup)) {
            document.body.removeChild(popup);
          }
          navigate('/integrations?oauth=success');
        }, 2000);

      } catch (error) {
        console.error('OAuth callback error:', error);
        setProcessed(false); // Allow retry on error
        navigate('/integrations?oauth=error&message=' + encodeURIComponent(error.response?.data?.error || error.message));
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, isAuthenticated, user, processed]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">Completing OAuth Authentication...</h2>
        <p className="text-gray-600 mt-2">Please wait while we set up your integration.</p>
      </div>
    </div>
  );
};

export default OAuthCallback;