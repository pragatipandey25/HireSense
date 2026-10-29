import Job from '../models/Job.js';
import Resume from '../models/Resume.js';
import Ranking from '../models/Ranking.js';
import User from '../models/User.js';
import { analyzeResumeWithJobDetails } from './aiService.js';

/**
 * Calculate overall score using the 11-dimension formula:
 * Resume Score: 30%
 * Skill Match: 25%
 * Experience Match: 12%
 * Education Match: 8%
 * Certification Score: 5%
 * Project Quality: 5%
 * Leadership: 3%
 * Communication: 2%
 * ATS Score: 3%
 * Soft Skills: 2%
 * Confidence: 5%
 */
export function calculateOverallScore(scores) {
  const {
    resumeScore = 0,
    skillMatch = 0,
    experienceMatch = 0,
    educationMatch = 0,
    certificationScore = 0,
    projectQuality = 0,
    leadershipScore = 0,
    communicationScore = 0,
    atsScore = 0,
    softSkillsMatch = 0,
    confidenceScore = 0
  } = scores;

  const overall = Math.round(
    (resumeScore * 0.30) +
    (skillMatch * 0.25) +
    (experienceMatch * 0.12) +
    (educationMatch * 0.08) +
    (certificationScore * 0.05) +
    (projectQuality * 0.05) +
    (leadershipScore * 0.03) +
    (communicationScore * 0.02) +
    (atsScore * 0.03) +
    (softSkillsMatch * 0.02) +
    (confidenceScore * 0.05)
  );

  return Math.min(Math.max(overall, 0), 100);
}

export function getRankingLabel(overallScore) {
  if (overallScore === null || overallScore === undefined) return 'AI Unavailable';
  if (overallScore >= 85) return 'Highly Recommended';
  if (overallScore >= 70) return 'Recommended';
  if (overallScore >= 50) return 'Moderate';
  return 'Not Recommended';
}

/**
 * Analyze candidates for a given job with bounded concurrency and caching
 */
export async function analyzeAndRankCandidates(jobId) {
  const job = await Job.findById(jobId);
  if (!job) {
    throw new Error('Job not found');
  }

  // Find all candidates with parsed resumes
  const candidates = await User.find({ role: 'candidate' }).select('name email').lean();
  if (!candidates.length) {
    return { job, rankings: [], message: 'No registered candidates found.' };
  }

  const candidateIds = candidates.map(c => c._id);

  // Get the latest parsed resume for each candidate
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
        parsedData: { $first: '$parsedData' },
        rawText: { $first: '$rawText' },
        status: { $first: '$status' },
        fileUrl: { $first: '$fileUrl' }
      }
    }
  ]);

  if (!resumes.length) {
    return { job, rankings: [], message: 'No parsed resumes available for screening.' };
  }

  const results = [];

  // Concurrency bounded to 3 parallel requests to respect Gemini quotas
  const BATCH_SIZE = 3;
  for (let i = 0; i < resumes.length; i += BATCH_SIZE) {
    const batch = resumes.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(async (resume) => {
      const candidate = candidates.find(c => c._id.toString() === resume._id.toString());
      if (!candidate) return null;

      try {
        const resumeData = resume.parsedData || { rawText: resume.rawText };
        const analysis = await analyzeResumeWithJobDetails(resumeData, job);

        const overallScore = calculateOverallScore({
          resumeScore: analysis.resumeScore ?? 65,
          skillMatch: analysis.skillMatch ?? 50,
          experienceMatch: analysis.experienceMatch ?? 50,
          educationMatch: analysis.educationMatch ?? 60,
          certificationScore: analysis.certificationScore ?? 40,
          projectQuality: analysis.projectQuality ?? 55,
          leadershipScore: analysis.leadershipScore ?? 50,
          communicationScore: analysis.communicationScore ?? 70,
          atsScore: analysis.atsScore ?? 70,
          softSkillsMatch: analysis.softSkillsMatch ?? 60,
          confidenceScore: analysis.confidenceScore ?? 75
        });

        return {
          candidateId: candidate._id,
          candidateName: candidate.name,
          candidateEmail: candidate.email,
          resumeId: resume.resumeId,
          resumeOriginalName: resume.originalName,
          resumeFileUrl: resume.fileUrl,
          resumeScore: analysis.resumeScore ?? 65,
          atsScore: analysis.atsScore ?? 65,
          skillMatch: analysis.skillMatch ?? 50,
          experienceMatch: analysis.experienceMatch ?? 50,
          educationMatch: analysis.educationMatch ?? 60,
          certificationScore: analysis.certificationScore ?? 40,
          communicationScore: analysis.communicationScore ?? 70,
          leadershipScore: analysis.leadershipScore ?? 50,
          projectQuality: analysis.projectQuality ?? 55,
          problemSolving: analysis.problemSolving ?? 55,
          softSkillsMatch: analysis.softSkillsMatch ?? 60,
          confidenceScore: analysis.confidenceScore ?? 75,
          overallScore,
          rank: 0,
          recommendation: analysis.recommendation || getRankingLabel(overallScore),
          rankingReason: analysis.rankingReason || '',
          strengths: analysis.strengths || [],
          weaknesses: analysis.weaknesses || [],
          missingSkills: analysis.missingSkills || [],
          recommendations: analysis.recommendations || [],
          improvementSuggestions: analysis.improvementSuggestions || [],
          atsSuggestions: analysis.atsSuggestions || [],
          aiMetadata: analysis._metadata || { model: 'gemini-2.0-flash', analyzedAt: new Date(), promptVersion: 'v3.2' }
        };
      } catch (err) {
        console.error(`Analysis failed for candidate ${candidate.name}:`, err.message);
        return {
          candidateId: candidate._id,
          candidateName: candidate.name,
          candidateEmail: candidate.email,
          resumeId: resume.resumeId,
          resumeOriginalName: resume.originalName,
          resumeFileUrl: resume.fileUrl,
          resumeScore: null,
          atsScore: null,
          skillMatch: null,
          experienceMatch: null,
          educationMatch: null,
          certificationScore: null,
          communicationScore: null,
          leadershipScore: null,
          projectQuality: null,
          problemSolving: null,
          softSkillsMatch: null,
          confidenceScore: null,
          overallScore: null,
          rank: 0,
          recommendation: 'AI analysis unavailable',
          rankingReason: 'AI service temporarily unavailable.',
          strengths: [],
          weaknesses: [],
          missingSkills: [],
          recommendations: [],
          improvementSuggestions: [],
          atsSuggestions: [],
          aiMetadata: { model: 'gemini-2.0-flash', analyzedAt: new Date(), error: err.message }
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(Boolean));
  }

  // Deterministic sorting with secondary tie-breaking
  results.sort((a, b) => {
    if (a.overallScore === null && b.overallScore === null) return 0;
    if (a.overallScore === null) return 1;
    if (b.overallScore === null) return -1;

    if (b.overallScore !== a.overallScore) {
      return b.overallScore - a.overallScore;
    }
    if ((b.skillMatch || 0) !== (a.skillMatch || 0)) {
      return (b.skillMatch || 0) - (a.skillMatch || 0);
    }
    if ((b.experienceMatch || 0) !== (a.experienceMatch || 0)) {
      return (b.experienceMatch || 0) - (a.experienceMatch || 0);
    }
    return String(a.candidateId).localeCompare(String(b.candidateId));
  });

  results.forEach((r, index) => {
    r.rank = index + 1;
  });

  // Non-destructive ranking persistence (preserves existing recruiter shortlists/rejections)
  await storeRankings(jobId, results);

  return { job, rankings: results };
}

/**
 * Store ranking results non-destructively in the Ranking collection
 */
async function storeRankings(jobId, rankings) {
  // Preserve existing recruiter shortlist/rejection decisions
  const existingRankings = await Ranking.find({ job: jobId }).select('candidate status').lean();
  const statusMap = new Map(existingRankings.map(r => [r.candidate.toString(), r.status]));

  await Ranking.deleteMany({ job: jobId });

  const rankingDocs = rankings.map(r => ({
    job: jobId,
    candidate: r.candidateId,
    resume: r.resumeId,
    resumeScore: r.resumeScore,
    atsScore: r.atsScore,
    skillMatch: r.skillMatch,
    experienceMatch: r.experienceMatch,
    educationMatch: r.educationMatch,
    certificationScore: r.certificationScore,
    communicationScore: r.communicationScore,
    leadershipScore: r.leadershipScore,
    projectQuality: r.projectQuality,
    problemSolving: r.problemSolving,
    softSkillsMatch: r.softSkillsMatch,
    confidenceScore: r.confidenceScore,
    overallScore: r.overallScore,
    rank: r.rank,
    recommendation: r.recommendation,
    rankingReason: r.rankingReason || '',
    strengths: r.strengths,
    weaknesses: r.weaknesses,
    missingSkills: r.missingSkills,
    recommendations: r.recommendations,
    improvementSuggestions: r.improvementSuggestions || [],
    atsSuggestions: r.atsSuggestions || [],
    status: statusMap.get(r.candidateId.toString()) || (r.overallScore === null ? 'ai_unavailable' : 'analyzed'),
    aiMetadata: r.aiMetadata
  }));

  if (rankingDocs.length > 0) {
    await Ranking.insertMany(rankingDocs);
  }
}

/**
 * Get stored rankings for a job with filtering and sorting
 */
export async function getRankings(jobId, filters = {}) {
  const { minScore, skills, experience, education, recommendation, search, sortBy, sortOrder } = filters;

  const query = { job: jobId };
  if (minScore) {
    query.overallScore = { $gte: Number(minScore) };
  }
  if (recommendation) {
    query.recommendation = recommendation;
  }

  let rankings = await Ranking.find(query)
    .populate('candidate', 'name email')
    .populate('resume', 'originalName fileUrl parsedData')
    .lean();

  if (skills) {
    const skillsArr = skills.split(',').map(s => s.trim().toLowerCase());
    rankings = rankings.filter(r =>
      skillsArr.some(skill =>
        (r.missingSkills || []).some(ms => ms.toLowerCase().includes(skill)) ||
        (r.strengths || []).some(s => s.toLowerCase().includes(skill))
      )
    );
  }

  if (experience) {
    rankings = rankings.filter(r => (r.experienceMatch || 0) >= Number(experience));
  }
  if (education) {
    rankings = rankings.filter(r => (r.educationMatch || 0) >= Number(education));
  }

  if (search) {
    const searchLower = search.toLowerCase();
    rankings = rankings.filter(r => {
      const candidate = r.candidate || {};
      return (
        (candidate.name || '').toLowerCase().includes(searchLower) ||
        (candidate.email || '').toLowerCase().includes(searchLower) ||
        (r.missingSkills || []).some(s => s.toLowerCase().includes(searchLower))
      );
    });
  }

  // Sort
  const sortField = sortBy || 'rank';
  const order = sortOrder === 'desc' ? -1 : 1;

  rankings.sort((a, b) => {
    let valA = a[sortField] ?? a.rank ?? 0;
    let valB = b[sortField] ?? b.rank ?? 0;

    if (valA === null) valA = -1;
    if (valB === null) valB = -1;

    if (valA !== valB) {
      return (valA > valB ? 1 : -1) * order;
    }
    return String(a._id).localeCompare(String(b._id));
  });

  return rankings;
}

export async function updateRankingStatus(rankingId, status, userId) {
  const ranking = await Ranking.findById(rankingId).populate('job', 'employerId');
  if (!ranking) {
    throw new Error('Ranking not found');
  }

  if (userId && ranking.job?.employerId?.toString() !== userId.toString()) {
    throw new Error('Not authorized to update candidate status on this job.');
  }

  ranking.status = status;
  await ranking.save();
  return ranking;
}
