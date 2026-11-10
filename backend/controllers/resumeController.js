import Resume from '../models/Resume.js';
import Application from '../models/Application.js';
import Job from '../models/Job.js';
import Ranking from '../models/Ranking.js';
import { parseResume, parseResumeText } from '../services/resumeParser.js';
import { analyzeWithGemini, evaluateWithHeuristics } from '../services/aiService.js';
import { uploadsDir } from '../middleware/uploadMiddleware.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Robust helper to locate resume file on disk across local dev, containers, and Vercel serverless /tmp
 */
export const resolveResumeFilePath = (fileUrl) => {
  if (!fileUrl) return null;
  const filename = path.basename(fileUrl);
  const candidates = [
    path.join(uploadsDir, filename),
    path.join(os.tmpdir(), 'hiresense-uploads', filename),
    path.join(__dirname, '..', 'uploads', filename),
    path.join(__dirname, '..', '..', 'uploads', filename),
    path.join(process.cwd(), 'uploads', filename),
    path.join(process.cwd(), 'backend', 'uploads', filename),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {}
  }
  return null;
};

// @desc    Upload resume (Single file)
// @route   POST /api/resumes/upload
export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a resume file (.pdf or .docx) to upload.' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    const fileType = ext === 'pdf' ? 'pdf' : 'docx';
    const filePath = req.file.path;

    // Resolve memory buffer directly from Multer memoryStorage or disk fallback
    let fileBuffer = req.file.buffer || null;
    if (!fileBuffer && filePath && fs.existsSync(filePath)) {
      try {
        fileBuffer = fs.readFileSync(filePath);
      } catch (readErr) {
        console.warn('Could not read uploaded file to buffer:', readErr.message);
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ success: false, message: 'Uploaded file has no readable content. Please select a valid document.' });
    }

    // Immediately parse document content on upload so serverless execution never loses it
    let rawText = '';
    let parsedData = {};
    let status = 'uploaded';

    try {
      const parseResult = await parseResume(fileBuffer, fileType);
      rawText = parseResult.rawText || '';
      parsedData = parseResult.parsedData || {};
      status = 'parsed';
    } catch (parseErr) {
      console.error('Initial resume parse notice on upload:', parseErr.message);
    }

    // Immediately compute instant baseline heuristic evaluation on upload (never blocks or times out)
    let aiScore = undefined;
    let aiMetadata = undefined;
    if (status === 'parsed') {
      try {
        const defaultJob = 'Full Stack Software Engineer: Proficient in JavaScript, Python, React, Node.js, databases, REST APIs, and application architecture.';
        const baseline = evaluateWithHeuristics({ ...parsedData, rawText }, defaultJob);
        aiScore = {
          resumeScore: baseline.resumeScore ?? 0,
          atsScore: baseline.atsScore ?? 0,
          skillMatch: baseline.skillMatch ?? 0,
          technicalSkills: baseline.skillMatch ?? 0,
          communicationScore: baseline.communicationScore ?? 0,
          communication: baseline.communicationScore ?? 0,
          experienceMatch: baseline.experienceMatch ?? 0,
          educationMatch: baseline.educationMatch ?? 0,
          certificationScore: baseline.certificationScore ?? 0,
          leadershipScore: baseline.leadershipScore ?? 0,
          missingSkills: baseline.missingSkills || [],
          strengths: baseline.strengths || [],
          weaknesses: baseline.weaknesses || [],
          recommendations: baseline.recommendations || [],
          recommendation: baseline.recommendation || '',
          ranking: baseline.recommendation || '',
          summary: baseline.rankingReason || ''
        };
        aiMetadata = {
          model: 'hiresense-ai-v3.2',
          analyzedAt: new Date(),
          promptVersion: 'v3.2'
        };
        status = 'analyzed';
      } catch (scoreErr) {
        console.warn('Initial baseline scoring notice on upload:', scoreErr.message);
      }
    }

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const resume = await Resume.create({
      userId: req.user._id,
      originalName: req.file.originalname,
      fileUrl: `/uploads/resume-${uniqueSuffix}.${fileType}`,
      fileType,
      fileData: fileBuffer,
      status,
      rawText,
      parsedData,
      aiScore,
      aiMetadata
    });

    const responseResume = resume.toObject();
    delete responseResume.fileData;
    delete responseResume.rawText;

    return res.status(201).json({
      success: true,
      message: status === 'analyzed' ? 'Resume uploaded, parsed, and analyzed successfully' : (status === 'parsed' ? 'Resume uploaded and parsed successfully' : 'Resume uploaded successfully'),
      resume: responseResume
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
      const fileBuffer = file.buffer || (file.path && fs.existsSync(file.path) ? fs.readFileSync(file.path) : null);

      try {
        // Parse document immediately
        const { rawText, parsedData } = await parseResume(fileBuffer, fileType);
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

        // Create resume record with persistent fileBuffer
        const resume = await Resume.create({
          userId: req.user._id,
          originalName: file.originalname,
          fileUrl: `/uploads/resume-${uniqueSuffix}.${fileType}`,
          fileType,
          fileData: fileBuffer,
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
    const resume = await Resume.findById(req.params.id).select('+fileData +rawText');

    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    if (resume.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to parse this resume' });
    }

    // 1. If already parsed and has verified structured data (including name), return immediately
    if (resume.parsedData && 
        resume.parsedData.name && 
        resume.parsedData.name !== 'Candidate' && 
        resume.parsedData.skills && 
        resume.parsedData.skills.length > 0 && 
        resume.rawText && 
        resume.rawText.trim().length > 20) {
      if (resume.status !== 'parsed' && resume.status !== 'analyzed') {
        resume.status = 'parsed';
        await resume.save();
      }
      return res.status(200).json({
        success: true,
        message: 'Resume parsed successfully',
        parsedData: resume.parsedData
      });
    }

    // 2. Resolve parse input: binary buffer from DB first, then disk fallback
    let parseInput = resume.fileData;
    if (!parseInput) {
      const diskPath = resolveResumeFilePath(resume.fileUrl);
      if (diskPath) {
        parseInput = diskPath;
      }
    }

    // 3. Fallback: if rawText is stored, extract structured entities from rawText
    if (!parseInput) {
      if (resume.rawText && resume.rawText.trim().length > 20) {
        const parsedData = await parseResumeText(resume.rawText);
        resume.parsedData = parsedData;
        resume.status = 'parsed';
        await resume.save();
        return res.status(200).json({
          success: true,
          message: 'Resume parsed successfully from stored text',
          parsedData
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Resume document content is not available. Please upload your resume file again.'
      });
    }

    const { rawText, parsedData } = await parseResume(parseInput, resume.fileType);

    resume.rawText = rawText || resume.rawText || '';
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
    let { jobDescription } = req.body;

    if (!jobDescription || typeof jobDescription !== 'string' || !jobDescription.trim()) {
      jobDescription = 'Full Stack Software Engineer: Proficient in JavaScript, Python, React, Node.js, databases, REST APIs, and application architecture.';
    }

    const resume = await Resume.findById(req.params.id).select('+rawText +fileData');
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    if (resume.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to analyze this resume' });
    }

    // Auto-parse on the fly if resume lacks parsedData, candidate name, or rawText
    const needsReparse = !resume.rawText || 
                         resume.rawText.trim().length < 20 || 
                         !resume.parsedData || 
                         !resume.parsedData.name || 
                         resume.parsedData.name === 'Candidate' || 
                         !resume.parsedData.skills || 
                         resume.parsedData.skills.length === 0;

    if (needsReparse) {
      let parseInput = resume.fileData;
      if (!parseInput) {
        parseInput = resolveResumeFilePath(resume.fileUrl);
      }
      if (parseInput) {
        try {
          const { rawText, parsedData } = await parseResume(parseInput, resume.fileType);
          if (rawText && rawText.trim().length > 20) {
            resume.rawText = rawText;
            resume.parsedData = parsedData;
            resume.status = 'parsed';
            await resume.save();
          }
        } catch (pErr) {
          console.warn('Auto-parse before analyze notice:', pErr.message);
        }
      }
    }

    // If document has no readable text, stop early with a descriptive error instead of producing 0s
    if (!resume.rawText || resume.rawText.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Resume document content could not be read. Please re-upload your resume (.pdf or .docx) to enable AI diagnostic evaluation.'
      });
    }

    // Build comprehensive resume data object for Gemini
    const parsedObj = resume.parsedData?.toObject ? resume.parsedData.toObject() : (resume.parsedData || {});
    const resumeData = {
      ...parsedObj,
      rawText: resume.rawText || ''
    };

    const analysis = await analyzeWithGemini(
      resumeData,
      jobDescription
    );

    resume.aiScore = {
      resumeScore: analysis.resumeScore ?? 0,
      atsScore: analysis.atsScore ?? 0,
      skillMatch: analysis.skillMatch ?? 0,
      technicalSkills: analysis.skillMatch ?? 0,
      communicationScore: analysis.communicationScore ?? 0,
      communication: analysis.communicationScore ?? 0,
      experienceMatch: analysis.experienceMatch ?? 0,
      educationMatch: analysis.educationMatch ?? 0,
      certificationScore: analysis.certificationScore ?? 0,
      leadershipScore: analysis.leadershipScore ?? 0,
      missingSkills: analysis.missingSkills || [],
      strengths: analysis.strengths || [],
      weaknesses: analysis.weaknesses || [],
      recommendations: analysis.recommendations || [],
      recommendation: analysis.recommendation || '',
      ranking: analysis.recommendation || '',
      summary: analysis.rankingReason || ''
    };

    resume.aiMetadata = {
      model: analysis._metadata?.model || 'hiresense-ai-v3.2',
      analyzedAt: analysis._metadata?.analyzedAt || new Date(),
      promptVersion: analysis._metadata?.promptVersion || 'v3.2'
    };
    resume.status = 'analyzed';
    await resume.save();

    return res.status(200).json({
      success: true,
      message: 'Resume analyzed successfully',
      analysis: resume.aiScore,
      parsedData: resume.parsedData
    });
  } catch (error) {
    console.error('Analyze resume error:', error.message);
    return res.status(500).json({ success: false, message: error.message || 'AI evaluation failed. Please try again later.' });
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
    const resume = await Resume.findById(req.params.id).select('+fileData');
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume document not found' });
    }

    // Authorization check: User must be resume owner, admin, or an employer who received an application
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
      return res.status(403).json({ success: false, message: 'Not authorized to download this candidate resume.' });
    }

    // 1. If binary fileData is in DB, stream it directly
    if (resume.fileData && resume.fileData.length > 0) {
      const contentType = resume.fileType === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(resume.originalName)}"`);
      return res.send(resume.fileData);
    }

    // 2. Fallback: Check on disk
    const diskPath = resolveResumeFilePath(resume.fileUrl);
    if (diskPath) {
      return res.download(diskPath, resume.originalName);
    }

    return res.status(404).json({ success: false, message: 'Resume file is not available on the server. Please re-upload.' });
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

    const diskPath = resolveResumeFilePath(resume.fileUrl);
    if (diskPath) {
      try { fs.unlinkSync(diskPath); } catch {}
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
