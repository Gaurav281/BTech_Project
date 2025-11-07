//server/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return this.authProvider === 'email';
    }
  },
  authProvider: {
    type: String,
    enum: ['email', 'google'],
    default: 'email'
  },
  profile: {
    company: String,
    role: String,
    bio: String,
    picture: String
  },
  integrations: {
    gmail: { type: Object, default: null },
    telegram: { type: Object, default: null },
    slack: { type: Object, default: null },
    googleSheets: { type: Object, default: null }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || this.authProvider !== 'email') return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (this.authProvider !== 'email' || !this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);