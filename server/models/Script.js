//server/models/Script.js 
import mongoose from 'mongoose';

const scriptSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  language: { type: String, required: true },
  script: { type: String, required: true },
  parameters: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPublic: { type: Boolean, default: false },
  publishedAt: { type: Date },
  executionCount: { type: Number, default: 0 },
  downloadCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

scriptSchema.index({ createdBy: 1, createdAt: -1 });
scriptSchema.index({ isPublic: 1, publishedAt: -1 });

export default mongoose.model('Script', scriptSchema);