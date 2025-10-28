import mongoose from 'mongoose';

const parameterSchema = new mongoose.Schema({
  key: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, required: true, enum: ['text', 'password', 'number', 'url', 'email'] },
  required: { type: Boolean, default: false },
  defaultValue: { type: String, default: '' },
  description: { type: String, default: '' }
});

const integrationSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  service: { 
    type: String, 
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['software', 'hardware', 'custom']
  },
  category: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  authType: { 
    type: String, 
    required: true,
    enum: ['OAuth2', 'API Key', 'Database', 'Serial', 'SSH', 'MQTT', 'Custom'] 
  },
  parameters: [parameterSchema],
  config: { 
    type: Object, 
    default: {} 
  },
  customCode: {
    type: String,
    default: ''
  },
  setupGuide: {
    type: String,
    default: ''
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  isValid: { 
    type: Boolean, 
    default: false 
  },
  lastTested: { 
    type: Date 
  },
  lastError: { 
    type: String 
  },
  version: {
    type: String,
    default: '1.0'
  }
}, {
  timestamps: true
});

// Allow multiple integrations with same service but different configs
integrationSchema.index({ user: 1, service: 1, name: 1 }, { unique: true });

const Integration = mongoose.model('Integration', integrationSchema);
export default Integration;