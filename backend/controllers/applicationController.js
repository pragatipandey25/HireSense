import Application from '../models/Application.js';
import Job from '../models/Job.js';
import Resume from '../models/Resume.js';
import {
  calculateOverallScore,
  getRanking,
  calculateSkillMatch,
  calculateExperienceMatch,
  calculateEducationMatch,
  calculateCertificationScore
} from '../utils/rankingEngine.js';
import { analyzeWithGemini } from '../services/aiService.js';

// @desc    Apply for a job
// @route   POST /api/applications
export const applyForJob = async (req, res) => {
  try {
    const { jobId, resumeId } = req.body;

    const job = await Job.findById(jobId).lean();
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.status !== 'active') {
      return res.status(400).json({ success: false, message: 'This job is no longer accepting applications' });
    }

    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    if (resume.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'This resume does not belong to you' });
    }

    // Check if already applied
    const existing = await Application.findOne({
      jobId,
      candidateId: req.user._id
    }).lean();

    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already applied for this job' });
    }

    // Prepare resume data
    const resumeData = resume.parsedData || { rawText: resume.rawText };

    // Build enhanced job description
    const jobDescription = `
Job Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Experience Required: ${job.experience}
Education Required: ${job.education}
Salary: ${job.salary || 'Not specified'}
Required Skills: ${(job.requiredSkills || []).join(', ')}
Description: ${job.description}
`;

    let aiScorePayload;
    let aiMetaPayload;

    try {
      const analysis = await analyzeWithGemini(
        resumeData,
        jobDescription,
        {
          title: job.title,
          company: job.company,
          location: job.location,
          requiredSkills: job.requiredSkills,
          experience: job.experience,
          education: job.education
        }
      );

      const resumeScore = analysis.resumeScore ?? 70;
      const skillMatch = analysis.skillMatch ?? 60;
      const experienceMatch = analysis.experienceMatch ?? 60;
      const educationMatch = analysis.educationMatch ?? 70;
      const certificationScore = analysis.certificationScore ?? 50;

      const overallScore = calculateOverallScore({
        resumeScore,
        skillMatch,
        experienceMatch,
        educationMatch,
        certificationScore,
        projectQuality: analysis.projectQuality ?? 60,
        leadershipScore: analysis.leadershipScore ?? 50,
        communicationScore: analysis.communicationScore ?? 70,
        atsScore: analysis.atsScore ?? 70,
        softSkillsMatch: analysis.softSkillsMatch ?? 65,
        confidenceScore: analysis.confidenceScore ?? 80
      });

      aiScorePayload = {
        overallScore,
        resumeScore,
        skillMatch,
        experienceMatch,
        educationMatch,
        certificationScore,
        communicationScore: analysis.communicationScore ?? 70,
        leadershipScore: analysis.leadershipScore ?? 50,
        atsScore: analysis.atsScore ?? 70,
        ranking: getRanking(overallScore),
        recommendation: analysis.recommendation || 'Recommended',
        strengths: analysis.strengths || [],
        weaknesses: analysis.weaknesses || [],
        missingSkills: analysis.missingSkills || [],
        recommendations: analysis.recommendations || []
      };

      aiMetaPayload = {
        model: analysis._metadata?.model || 'gemini-2.0-flash',
        analyzedAt: new Date(),
        promptVersion: analysis._metadata?.promptVersion || 'v3.0'
      };
    } catch (aiErr) {
      console.warn('AI evaluation fallback to algorithmic scoring:', aiErr.message);

      // Algorithmic rule-based scoring fallback
      const candSkills = resume.parsedData?.skills || [];
      const candExp = resume.parsedData?.experience || [];
      const candEdu = resume.parsedData?.education || [];
      const candCerts = resume.parsedData?.certifications || [];

      const skillMatch = calculateSkillMatch(candSkills, job.requiredSkills || []);
      const experienceMatch = calculateExperienceMatch(candExp, job.experience);
      const educationMatch = calculateEducationMatch(candEdu, job.education);
      const certificationScore = calculateCertificationScore(candCerts);
      const resumeScore = Math.round((skillMatch + experienceMatch + educationMatch) / 3);

      const overallScore = calculateOverallScore({
        resumeScore,
        skillMatch,
        experienceMatch,
        educationMatch,
        certifications: certificationScore,
        confidenceScore: 50
      });

      aiScorePayload = {
        overallScore,
        resumeScore,
        skillMatch,
        experienceMatch,
        educationMatch,
        certificationScore,
        communicationScore: 70,
        leadershipScore: 50,
        atsScore: 75,
        ranking: getRanking(overallScore),
        recommendation: 'Moderate',
        strengths: ['Application submitted successfully.'],
        weaknesses: [],
        missingSkills: (job.requiredSkills || []).filter(rs => !candSkills.some(cs => cs.toLowerCase().includes(rs.toLowerCase()))),
        recommendations: ['AI deep screening will update momentarily.']
      };

      aiMetaPayload = {
        model: 'algorithmic-fallback',
        analyzedAt: new Date(),
        promptVersion: 'v3.0'
      };
    }

    const application = await Application.create({
      jobId,
      candidateId: req.user._id,
      resumeId,
      status: 'applied',
      aiScore: aiScorePayload,
      aiMetadata: aiMetaPayload
    });

    const populatedApp = await Application.findById(application._id)
      .populate('jobId', 'title company location salary status')
      .populate('candidateId', 'name email')
      .populate('resumeId', 'originalName fileUrl parsedData aiScore')
      .lean();

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      application: populatedApp
    });
  } catch (error) {
    console.error('Apply for job error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error submitting application.' });
  }
};

// @desc    Get candidate's applications
// @route   GET /api/applications/candidate
export const getCandidateApplications = async (req, res) => {
  try {
    const applications = await Application.find({ candidateId: req.user._id })
      .populate({
        path: 'jobId',
        select: 'title company location salary status deadline'
      })
      .populate({
        path: 'resumeId',
        select: 'originalName fileUrl aiScore parsedData'
      })
      .sort('-createdAt')
      .lean();

    return res.status(200).json({ success: true, applications });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving applications.' });
  }
};

// @desc    Get all applications for a job (employer)
// @route   GET /api/applications/job/:jobId
export const getJobApplications = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId).lean();

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.employerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view applicants for this job' });
    }

    const applications = await Application.find({ jobId: req.params.jobId })
      .populate({
        path: 'candidateId',
        select: 'name email'
      })
      .populate({
        path: 'resumeId',
        select: 'originalName fileUrl parsedData aiScore'
      })
      .sort('-createdAt')
      .lean();

    return res.status(200).json({ success: true, applications });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving job applications.' });
  }
};

// @desc    Get single application with BOLA protection
// @route   GET /api/applications/:id
export const getApplicationById = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate({
        path: 'jobId',
        select: 'title description requiredSkills experience education salary location company deadline status employerId'
      })
      .populate({
        path: 'candidateId',
        select: 'name email'
      })
      .populate({
        path: 'resumeId',
        select: 'originalName fileUrl parsedData aiScore'
      })
      .lean();

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // SEC-04 Authorization check
    const isApplicant = application.candidateId?._id?.toString() === req.user._id.toString();
    const isJobEmployer = application.jobId?.employerId?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isApplicant && !isJobEmployer && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this application.' });
    }

    return res.status(200).json({ success: true, application });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving application.' });
  }
};

// @desc    Update application status (employer)
// @route   PATCH /api/applications/:id/status
export const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['shortlisted', 'rejected', 'applied'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Use: shortlisted, rejected, or applied' });
    }

    const application = await Application.findById(req.params.id).populate('jobId', 'employerId');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (application.jobId.employerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this application status' });
    }

    application.status = status;
    await application.save();

    return res.status(200).json({
      success: true,
      message: `Application ${status} successfully`,
      application
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error updating application status.' });
  }
};

// @desc    Withdraw application (candidate)
// @route   PATCH /api/applications/:id/withdraw
export const withdrawApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (application.candidateId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to withdraw this application' });
    }

    application.status = 'withdrawn';
    await application.save();

    return res.status(200).json({
      success: true,
      message: 'Application withdrawn successfully',
      application
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error withdrawing application.' });
  }
};

// @desc    Rank candidates for a job with deterministic secondary tie-breaking
// @route   GET /api/applications/job/:jobId/rankings
export const getCandidateRankings = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId).lean();

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.employerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const applications = await Application.find({ jobId: req.params.jobId })
      .populate({
        path: 'candidateId',
        select: 'name email'
      })
      .populate({
        path: 'resumeId',
        select: 'parsedData aiScore originalName fileUrl'
      })
      .sort('-createdAt')
      .lean();

    const rankedApplications = applications.map((app) => {
      const aiScore = app.aiScore || {};
      const resumeScore = aiScore.resumeScore || 0;
      const skillMatch = aiScore.skillMatch || 0;
      const experienceMatch = aiScore.experienceMatch || 0;
      const educationMatch = aiScore.educationMatch || 0;
      const certificationScore = aiScore.certificationScore || 0;

      const overallScore = aiScore.overallScore || calculateOverallScore({
        resumeScore,
        skillMatch,
        experienceMatch,
        educationMatch,
        certifications: certificationScore
      });

      return {
        rank: 0,
        applicationId: app._id,
        candidate: app.candidateId,
        resumeId: app.resumeId,
        scores: {
          overallScore,
          resumeScore,
          skillMatch,
          experienceMatch,
          educationMatch,
          certificationScore,
          communicationScore: aiScore.communicationScore || 0,
          leadershipScore: aiScore.leadershipScore || 0,
          atsScore: aiScore.atsScore || 0
        },
        ranking: getRanking(overallScore),
        recommendation: aiScore.recommendation || '',
        strengths: aiScore.strengths || [],
        weaknesses: aiScore.weaknesses || [],
        missingSkills: aiScore.missingSkills || [],
        recommendations: aiScore.recommendations || [],
        status: app.status,
        appliedDate: app.createdAt
      };
    });

    // Deterministic sorting: overallScore DESC -> skillMatch DESC -> experienceMatch DESC -> appliedDate ASC
    rankedApplications.sort((a, b) => {
      if (b.scores.overallScore !== a.scores.overallScore) {
        return b.scores.overallScore - a.scores.overallScore;
      }
      if (b.scores.skillMatch !== a.scores.skillMatch) {
        return b.scores.skillMatch - a.scores.skillMatch;
      }
      if (b.scores.experienceMatch !== a.scores.experienceMatch) {
        return b.scores.experienceMatch - a.scores.experienceMatch;
      }
      return new Date(a.appliedDate) - new Date(b.appliedDate);
    });

    rankedApplications.forEach((app, index) => {
      app.rank = index + 1;
    });

    return res.status(200).json({
      success: true,
      job: {
        _id: job._id,
        title: job.title,
        company: job.company,
        totalApplicants: rankedApplications.length
      },
      rankings: rankedApplications
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error ranking candidates.' });
  }
};
