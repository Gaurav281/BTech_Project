//server/models/Workflow.js
import mongoose from 'mongoose';

const nodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true }
  },
  data: {
    label: { type: String, required: true },
    service: { type: String, required: true },
    parameters: { type: Object, default: {} },
    description: { type: String }
  }
});

const edgeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  type: { type: String, default: 'smoothstep' }
});

const executionLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['success', 'error', 'running'], required: true },
  message: { type: String, required: true },
  duration: { type: Number }, // in milliseconds
  error: { type: String }
});

const workflowSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  nodes: [nodeSchema],
  edges: [edgeSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: false },
  tags: [{ type: String }],
  executionCount: { type: Number, default: 0 },
  downloadCount: { type: Number, default: 0 }, // Add download count
   hostedAt: { type: Date },
  stoppedAt: { type: Date },
  lastExecuted: { type: Date },
  executionLogs: [executionLogSchema],
  version: { type: Number, default: 1 }
}, {
  timestamps: true
});

workflowSchema.index({ name: 1, createdBy: 1 });
workflowSchema.index({ isPublic: 1, createdAt: -1 });
workflowSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.model('Workflow', workflowSchema);