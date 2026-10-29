import Resume from '../models/Resume.js';
import Application from '../models/Application.js';
import Job from '../models/Job.js';
import Ranking from '../models/Ranking.js';
import { parseResume } from '../services/resumeParser.js';
import { analyzeWithGemini } from '../services/aiService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Upload resume (Single file)
// @route   POST /api/resumes/upload
export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a resume file (.pdf or .docx) to upload.' });
    }

    const fileType = req.file.originalname.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx';

    const resume = await Resume.create({
      userId: req.user._id,
      originalName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      fileType,
      status: 'uploaded'
    });

    return res.status(201).json({
      success: true,
      message: 'Resume uploaded successfully',
      resume
    });
  } catch (error) {
    console.error('Upload resume error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to upload resume. Please try again.' });
  }
};

// @desc    Bulk Upload resumes (Employer/Admin)
// @route   POST /api/resumes/bulk-upload
export const uploadBulkResumes = async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one resume file to upload.'
      });
    }

    const results = [];
    let succeeded = 0;
    let failed = 0;

    // Process each document sequentially with safe error boundary per file
    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
      const fileType = ext === 'pdf' ? 'pdf' : 'docx';
      const filePath = file.path;

      try {
        // Parse document
        const { rawText, parsedData } = await parseResume(filePath, fileType);

        // Create resume record
        const resume = await Resume.create({
          userId: req.user._id,
          originalName: file.originalname,
          fileUrl: `/uploads/${file.filename}`,
          fileType,
          status: 'parsed',
          rawText,
          parsedData
        });

        results.push({
          filename: file.originalname,
          resumeId: resume._id,
          candidateName: parsedData.name || 'Unknown Candidate',
          skillsCount: parsedData.skills?.length || 0,
          status: 'parsed',
          success: true
        });
        succeeded++;
      } catch (err) {
        console.error(`Failed parsing bulk file ${file.originalname}:`, err.message);
        try { fs.unlinkSync(filePath); } catch {}
        results.push({
          filename: file.originalname,
          status: 'failed',
          success: false,
          error: err.message || 'Failed to parse resume content.'
        });
        failed++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Bulk processing completed: ${succeeded} succeeded, ${failed} failed.`,
      summary: {
        total: files.length,
        succeeded,
        failed
      },
      results
    });
  } catch (error) {
    console.error('Bulk upload error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error processing bulk uploads.' });
  }
};

// @desc    Parse uploaded resume
// @route   POST /api/resumes/parse/:id
export const parseResumeById = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);

    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    if (resume.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to parse this resume' });
    }

    const filePath = path.join(__dirname, '..', resume.fileUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Resume file not found on server' });
    }

    const { rawText, parsedData } = await parseResume(filePath, resume.fileType);

    resume.rawText = rawText;
    resume.parsedData = parsedData;
    resume.status = 'parsed';
    await resume.save();

    return res.status(200).json({
      success: true,
      message: 'Resume parsed successfully',
      parsedData
    });
  } catch (error) {
    console.error('Failed to parse resume:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to parse resume. Ensure the file contains readable text.' });
  }
};

// @desc    Analyze resume with AI against job description
// @route   POST /api/resumes/analyze/:id
export const analyzeResume = async (req, res) => {
  try {
    const { jobDescription } = req.body;

    if (!jobDescription) {
      return res.status(400).json({ success: false, message: 'Job description is required for AI evaluation.' });
    }

    const resume = await Resume.findById(req.params.id);
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    if (resume.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to analyze this resume' });
    }

    const analysis = await analyzeWithGemini(
      resume.parsedData || { rawText: resume.rawText },
      jobDescription
    );

    resume.aiScore = {
      resumeScore: analysis.resumeScore ?? 0,
      atsScore: analysis.atsScore ?? 0,
      skillMatch: analysis.skillMatch ?? 0,
      communicationScore: analysis.communicationScore ?? 0,
      experienceMatch: analysis.experienceMatch ?? 0,
      educationMatch: analysis.educationMatch ?? 0,
      certificationScore: analysis.certificationScore ?? 0,
      leadershipScore: analysis.leadershipScore ?? 0,
      missingSkills: analysis.missingSkills || [],
      strengths: analysis.strengths || [],
      weaknesses: analysis.weaknesses || [],
      recommendations: analysis.recommendations || [],
      recommendation: analysis.recommendation || ''
    };

    resume.aiMetadata = {
      model: analysis._metadata?.model || 'gemini-2.0-flash',
      analyzedAt: analysis._metadata?.analyzedAt || new Date(),
      promptVersion: analysis._metadata?.promptVersion || 'v3.0'
    };
    resume.status = 'analyzed';
    await resume.save();

    return res.status(200).json({
      success: true,
      message: 'Resume analyzed successfully',
      analysis: resume.aiScore
    });
  } catch (error) {
    console.error('Analyze resume error:', error.message);
    return res.status(500).json({ success: false, message: 'AI evaluation failed. Please try again later.' });
  }
};

// @desc    Get candidate's resumes (with rawText excluded for performance)
// @route   GET /api/resumes
export const getResumes = async (req, res) => {
  try {
    const resumes = await Resume.find({ userId: req.user._id })
      .select('-rawText')
      .sort('-createdAt')
      .lean();

    return res.status(200).json({ success: true, resumes });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving resumes.' });
  }
};

// @desc    Get resume by ID
// @route   GET /api/resumes/:id
export const getResumeById = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id).select('-rawText').lean();

    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    if (resume.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    return res.status(200).json({ success: true, resume });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving resume.' });
  }
};

// @desc    Download resume file securely with authorization check
// @route   GET /api/resumes/download/:id
export const downloadResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume document not found' });
    }

    // Authorization check: User must be resume owner, admin, or an employer who received an application
    let isAuthorized = false;

    if (req.user.role === 'admin' || resume.userId.toString() === req.user._id.toString()) {
      isAuthorized = true;
    } else if (req.user.role === 'employer') {
      // Check if candidate applied to an active job owned by this employer
      const employerJobs = await Job.find({ employerId: req.user._id }).select('_id').lean();
      const jobIds = employerJobs.map(j => j._id);

      const hasApplication = await Application.exists({
        resumeId: resume._id,
        jobId: { $in: jobIds }
      });

      const hasRanking = await Ranking.exists({
        resume: resume._id,
        job: { $in: jobIds }
      });

      if (hasApplication || hasRanking) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to download this candidate resume.' });
    }

    const filePath = path.join(__dirname, '..', resume.fileUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Resume file does not exist on disk.' });
    }

    return res.download(filePath, resume.originalName);
  } catch (error) {
    console.error('Download resume error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error downloading resume.' });
  }
};

// @desc    Delete resume
// @route   DELETE /api/resumes/:id
export const deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);

    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    if (resume.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const filePath = path.join(__dirname, '..', resume.fileUrl);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }

    await resume.deleteOne();

    return res.status(200).json({ success: true, message: 'Resume deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error deleting resume.' });
  }
};

// @desc    Get candidate resume analysis for employer (with relationship authorization)
// @route   GET /api/resumes/candidate/:id
export const getCandidateResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id).select('-rawText').lean();

    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    // Verify authorized access
    let isAuthorized = false;
    if (req.user.role === 'admin' || resume.userId.toString() === req.user._id.toString()) {
      isAuthorized = true;
    } else if (req.user.role === 'employer') {
      const employerJobs = await Job.find({ employerId: req.user._id }).select('_id').lean();
      const jobIds = employerJobs.map(j => j._id);

      const hasApplication = await Application.exists({
        resumeId: resume._id,
        jobId: { $in: jobIds }
      });
      const hasRanking = await Ranking.exists({
        resume: resume._id,
        job: { $in: jobIds }
      });

      if (hasApplication || hasRanking) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Not authorized to view candidate resume details.' });
    }

    return res.status(200).json({ success: true, resume });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving candidate resume.' });
  }
};
