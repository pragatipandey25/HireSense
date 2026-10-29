import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['pdf', 'docx'],
    required: true
  },
  parsedData: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    skills: [{ type: String }],
    experience: [{
      company: String,
      role: String,
      duration: String,
      description: String
    }],
    education: [{
      degree: String,
      institution: String,
      year: String
    }],
    projects: [{
      name: String,
      description: String,
      technologies: [String]
    }],
    certifications: [{
      name: String,
      issuer: String,
      year: String
    }],
    languages: [{ type: String }]
  },
  aiScore: {
    resumeScore: { type: Number, default: 0 },
    atsScore: { type: Number, default: 0 },
    skillMatch: { type: Number, default: 0 },
    communicationScore: { type: Number, default: 0 },
    experienceMatch: { type: Number, default: 0 },
    educationMatch: { type: Number, default: 0 },
    certificationScore: { type: Number, default: 0 },
    leadershipScore: { type: Number, default: 0 },
    missingSkills: [{ type: String }],
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    recommendations: [{ type: String }],
    recommendation: { type: String, default: '' }
  },
  aiMetadata: {
    model: { type: String, default: '' },
    analyzedAt: { type: Date, default: null },
    promptVersion: { type: String, default: '' }
  },
  status: {
    type: String,
    enum: ['uploaded', 'parsed', 'analyzed', 'failed'],
    default: 'uploaded'
  },
  rawText: { type: String, default: '' }
}, { timestamps: true });

// Query performance indexes
resumeSchema.index({ userId: 1, createdAt: -1 });
resumeSchema.index({ status: 1 });

export default mongoose.model('Resume', resumeSchema);
