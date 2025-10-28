//server/models/ScriptExecutionLog.js
import mongoose from 'mongoose';

const scriptExecutionLogSchema = new mongoose.Schema({
  script: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Script', 
    required: true 
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['success', 'error', 'running', 'stopped'], 
    required: true,
    default: 'running'
  },
  startedAt: { 
    type: Date, 
    default: Date.now 
  },
  completedAt: { 
    type: Date 
  },
  duration: { 
    type: Number 
  }, // in milliseconds
  language: {
    type: String,
    required: true
  },
  parameters: {
    type: Object,
    default: {}
  },
  error: { 
    type: String 
  },
  logs: [{
    timestamp: { type: Date, default: Date.now },
    level: { type: String, enum: ['info', 'warning', 'error'], required: true },
    message: { type: String, required: true }
  }]
}, {
  timestamps: true
});

scriptExecutionLogSchema.index({ script: 1, startedAt: -1 });
scriptExecutionLogSchema.index({ user: 1, startedAt: -1 });

export default mongoose.model('ScriptExecutionLog', scriptExecutionLogSchema);