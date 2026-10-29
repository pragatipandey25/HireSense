import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Job description is required']
  },
  responsibilities: [{ type: String, trim: true }],
  requirements: [{ type: String, trim: true }],
  preferredSkills: [{ type: String, trim: true }],
  requiredSkills: [{
    type: String,
    trim: true
  }],
  experience: {
    type: String,
    required: [true, 'Experience requirement is required']
  },
  minimumExperience: {
    type: String,
    default: ''
  },
  education: {
    type: String,
    required: [true, 'Education requirement is required']
  },
  requiredEducation: {
    type: String,
    default: ''
  },
  employmentType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance'],
    default: 'full-time'
  },
  salary: {
    type: String,
    default: 'Not specified'
  },
  location: {
    type: String,
    required: [true, 'Location is required']
  },
  company: {
    type: String,
    required: [true, 'Company name is required']
  },
  deadline: {
    type: Date,
    required: [true, 'Application deadline is required']
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'draft'],
    default: 'active'
  }
}, { timestamps: true });

// Query performance indexes
jobSchema.index({ employerId: 1, createdAt: -1 });
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ requiredSkills: 1, status: 1 });

export default mongoose.model('Job', jobSchema);
