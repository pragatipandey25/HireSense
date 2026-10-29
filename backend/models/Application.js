import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: true
  },
  status: {
    type: String,
    enum: ['applied', 'shortlisted', 'rejected', 'withdrawn'],
    default: 'applied'
  },
  aiScore: {
    overallScore: { type: Number, default: 0 },
    resumeScore: { type: Number, default: 0 },
    skillMatch: { type: Number, default: 0 },
    experienceMatch: { type: Number, default: 0 },
    educationMatch: { type: Number, default: 0 },
    certificationScore: { type: Number, default: 0 },
    communicationScore: { type: Number, default: 0 },
    leadershipScore: { type: Number, default: 0 },
    atsScore: { type: Number, default: 0 },
    ranking: { type: String, default: 'Not Rated' },
    recommendation: { type: String, default: '' },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    missingSkills: [{ type: String }],
    recommendations: [{ type: String }]
  },
  aiMetadata: {
    model: { type: String, default: '' },
    analyzedAt: { type: Date, default: null },
    promptVersion: { type: String, default: '' }
  }
}, { timestamps: true });

// Compound indexes for query performance and data integrity
applicationSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });
applicationSchema.index({ candidateId: 1, createdAt: -1 });
applicationSchema.index({ jobId: 1, status: 1 });
applicationSchema.index({ jobId: 1, createdAt: -1 });

export default mongoose.model('Application', applicationSchema);
