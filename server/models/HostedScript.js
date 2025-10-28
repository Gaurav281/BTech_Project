//server/models/HostedScript.js
import mongoose from 'mongoose';

const hostedScriptSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  script: { type: String, required: true },
  language: { type: String, required: true, enum: ['python', 'javascript', 'html'] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  endpoint: { type: String, unique: true }, // Unique URL path
  isActive: { type: Boolean, default: true },
  executionCount: { type: Number, default: 0 },
  lastExecution: { type: Date },
  parameters: { type: Object, default: {} },
  environment: { type: Object, default: {} }, // Environment variables
  rateLimit: {
    enabled: { type: Boolean, default: false },
    requestsPerMinute: { type: Number, default: 60 }
  },
  schedule: {
    enabled: { type: Boolean, default: false },
    cronExpression: { type: String } // "*/5 * * * *" for every 5 minutes
  }
}, {
  timestamps: true
});

hostedScriptSchema.index({ createdBy: 1, endpoint: 1 });
hostedScriptSchema.index({ isActive: 1 });

export default mongoose.model('HostedScript', hostedScriptSchema);