import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';

const router = express.Router();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google OAuth endpoint
router.post('/', async (req, res) => {
  try {
    const { access_token } = req.body; // Change from 'token' to 'access_token'

    console.log('Google auth request received');

    if (!access_token) {
      return res.status(400).json({ error: 'Google access token is required' });
    }

    // Get user info using access token
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info from Google');
    }

    const userInfo = await userInfoResponse.json();
    console.log('Google user info:', userInfo);

    const { email, name, picture } = userInfo;

    if (!email) {
      return res.status(400).json({ error: 'Email not provided by Google' });
    }

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user with Google auth
      user = new User({
        name: name || email.split('@')[0],
        email,
        authProvider: 'google',
        profile: {
          picture
        }
      });
      await user.save();
      console.log('New Google user created:', user.email);
    } else if (user.authProvider !== 'google') {
      return res.status(400).json({ 
        error: 'Email already registered with password. Please use email/password login.' 
      });
    } else {
      console.log('Existing Google user found:', user.email);
    }

    // Generate JWT token
    const jwtToken = generateToken(user._id);

    res.json({
      message: 'Google authentication successful',
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        authProvider: user.authProvider,
        profile: user.profile
      }
    });

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ 
      error: 'Google authentication failed',
      details: error.message 
    });
  }
});

export default router;