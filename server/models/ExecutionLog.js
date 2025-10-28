// server/models/ExecutionLog.js 
import mongoose from 'mongoose';

const executionLogSchema = new mongoose.Schema({
  workflow: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Workflow', 
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
    required: true 
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
  input: { 
    type: Object 
  },
  output: { 
    type: Object 
  },
  error: { 
    type: String 
  },
  logs: [{
    timestamp: { type: Date, default: Date.now },
    level: { type: String, enum: ['info', 'warning', 'error'], required: true },
    message: { type: String, required: true },
    nodeId: { type: String }
  }]
}, {
  timestamps: true
});

executionLogSchema.index({ workflow: 1, startedAt: -1 });
executionLogSchema.index({ user: 1, startedAt: -1 });

export default mongoose.model('ExecutionLog', executionLogSchema);