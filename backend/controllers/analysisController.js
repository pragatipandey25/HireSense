import Job from '../models/Job.js';
import Resume from '../models/Resume.js';
import Ranking from '../models/Ranking.js';
import User from '../models/User.js';
import { analyzeAndRankCandidates, getRankings, updateRankingStatus } from '../services/rankingService.js';
import { getEmployerAnalytics } from '../utils/analyticsEngine.js';

// Helper to sanitize CSV fields against spreadsheet formula injection
const sanitizeCSVCell = (val) => {
  if (val === null || val === undefined) return '""';
  let str = String(val).replace(/"/g, '""');
  // If the cell begins with formula trigger chars (=, +, -, @, \t, \r), escape with leading single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str}"`;
};

// @desc    Analyze all candidates for a job
// @route   POST /api/analysis/:jobId/analyze
export const analyzeJobCandidates = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.employerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to analyze candidates for this job' });
    }

    const result = await analyzeAndRankCandidates(jobId);

    return res.status(200).json({
      success: true,
      message: result.rankings.length
        ? `Analysis complete! ${result.rankings.length} candidates evaluated and ranked.`
        : result.message || 'No candidate resumes available for screening.',
      job: {
        _id: job._id,
        title: job.title,
        company: job.company
      },
      rankings: result.rankings || [],
      totalRanked: result.rankings?.length || 0
    });
  } catch (error) {
    console.error('Analyze job candidates error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error during AI candidate analysis.' });
  }
};

// @desc    Get rankings for a job
// @route   GET /api/analysis/:jobId/rankings
export const getJobRankings = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId).lean();
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.employerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view rankings for this job' });
    }

    const { minScore, skills, experience, education, recommendation, search, sortBy, sortOrder } = req.query;

    const rankings = await getRankings(jobId, {
      minScore,
      skills,
      experience,
      education,
      recommendation,
      search,
      sortBy,
      sortOrder
    });

    return res.status(200).json({
      success: true,
      job: {
        _id: job._id,
        title: job.title,
        company: job.company
      },
      rankings,
      total: rankings.length
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving candidate rankings.' });
  }
};

// @desc    Export candidate rankings as CSV report (with formula injection mitigation)
// @route   GET /api/analysis/:jobId/export/csv
export const exportJobRankingsCSV = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId).lean();
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.employerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to export candidates for this job' });
    }

    const rankings = await Ranking.find({ job: jobId })
      .populate('candidate', 'name email')
      .sort({ rank: 1, overallScore: -1 })
      .lean();

    const headers = [
      'Rank',
      'Candidate Name',
      'Candidate Email',
      'Overall Match Score',
      'ATS Score',
      'Skill Match Score',
      'Experience Match Score',
      'Education Match Score',
      'Communication Score',
      'Status',
      'Recommendation',
      'Missing Skills',
      'Key Strengths'
    ];

    const rows = rankings.map((r) => [
      sanitizeCSVCell(r.rank || 'N/A'),
      sanitizeCSVCell(r.candidate?.name || 'Candidate'),
      sanitizeCSVCell(r.candidate?.email || ''),
      sanitizeCSVCell(r.overallScore !== null ? `${r.overallScore}%` : 'N/A'),
      sanitizeCSVCell(r.atsScore !== null ? `${r.atsScore}%` : 'N/A'),
      sanitizeCSVCell(r.skillMatch !== null ? `${r.skillMatch}%` : 'N/A'),
      sanitizeCSVCell(r.experienceMatch !== null ? `${r.experienceMatch}%` : 'N/A'),
      sanitizeCSVCell(r.educationMatch !== null ? `${r.educationMatch}%` : 'N/A'),
      sanitizeCSVCell(r.communicationScore !== null ? `${r.communicationScore}%` : 'N/A'),
      sanitizeCSVCell(r.status || 'analyzed'),
      sanitizeCSVCell(r.recommendation || 'Moderate'),
      sanitizeCSVCell((r.missingSkills || []).join('; ')),
      sanitizeCSVCell((r.strengths || []).join('; '))
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');

    const filename = `HireSense_${job.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Candidates.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export CSV error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to export candidate CSV report.' });
  }
};

// @desc    Get single ranking analysis detail with authorization
// @route   GET /api/analysis/ranking/:id
export const getRankingDetail = async (req, res) => {
  try {
    const ranking = await Ranking.findById(req.params.id)
      .populate('candidate', 'name email')
      .populate('resume', 'originalName fileUrl parsedData')
      .populate('job', 'title company description requiredSkills experience education employerId')
      .lean();

    if (!ranking) {
      return res.status(404).json({ success: false, message: 'Ranking not found' });
    }

    const isEmployerOwner = ranking.job?.employerId?.toString() === req.user._id.toString();
    const isCandidateSubject = ranking.candidate?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isEmployerOwner && !isCandidateSubject && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this candidate analysis' });
    }

    return res.status(200).json({ success: true, ranking });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving ranking detail.' });
  }
};

// @desc    Update ranking status (shortlist/reject) with ownership check
// @route   PATCH /api/analysis/ranking/:id/status
export const updateRanking = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['shortlisted', 'rejected', 'analyzed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Use: shortlisted, rejected, or analyzed' });
    }

    const ranking = await updateRankingStatus(req.params.id, status, req.user.role === 'admin' ? null : req.user._id);

    return res.status(200).json({
      success: true,
      message: `Candidate ${status} successfully`,
      ranking
    });
  } catch (error) {
    return res.status(403).json({ success: false, message: error.message || 'Server error updating candidate status.' });
  }
};

// @desc    Get candidates list for employer screening
// @route   GET /api/analysis/candidates
export const getAvailableCandidates = async (req, res) => {
  try {
    const candidates = await User.find({ role: 'candidate' }).select('name email').lean();
    const candidateIds = candidates.map(c => c._id);

    const resumes = await Resume.aggregate([
      {
        $match: {
          userId: { $in: candidateIds },
          status: { $in: ['parsed', 'analyzed'] }
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$userId',
          resumeId: { $first: '$_id' },
          originalName: { $first: '$originalName' },
          fileUrl: { $first: '$fileUrl' },
          status: { $first: '$status' },
          parsedData: { $first: '$parsedData' },
          aiScore: { $first: '$aiScore' }
        }
      }
    ]);

    const result = candidates.map(candidate => {
      const resume = resumes.find(r => r._id.toString() === candidate._id.toString());
      return {
        _id: candidate._id,
        name: candidate.name,
        email: candidate.email,
        resume: resume ? {
          _id: resume.resumeId,
          originalName: resume.originalName,
          fileUrl: resume.fileUrl,
          status: resume.status,
          parsedData: resume.parsedData,
          aiScore: resume.aiScore
        } : null
      };
    });

    return res.status(200).json({ success: true, candidates: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving candidates.' });
  }
};

// @desc    Get employer analytics
// @route   GET /api/analysis/analytics
export const getEmployerAnalysisAnalytics = async (req, res) => {
  try {
    const analytics = await getEmployerAnalytics(req.user._id);
    return res.status(200).json(analytics);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error calculating employer analytics.' });
  }
};
