import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Resume from '../models/Resume.js';
import User from '../models/User.js';

// @desc    Get employer dashboard data (Optimized with Aggregation)
// @route   GET /api/dashboard/employer
export const getEmployerDashboard = async (req, res) => {
  try {
    const employerId = req.user._id;

    // Get all jobs for this employer
    const jobs = await Job.find({ employerId }).select('title company requiredSkills createdAt status').sort('-createdAt').lean();
    const jobIds = jobs.map(job => job._id);

    // Single aggregation query for applications per job (N+1 query fix)
    const [applications, appCountsByJob, recentApplications] = await Promise.all([
      Application.find({ jobId: { $in: jobIds } }).select('status createdAt jobId').lean(),
      Application.aggregate([
        { $match: { jobId: { $in: jobIds } } },
        { $group: { _id: '$jobId', count: { $sum: 1 } } }
      ]),
      Application.find({ jobId: { $in: jobIds } })
        .populate('candidateId', 'name email')
        .populate('jobId', 'title')
        .sort('-createdAt')
        .limit(10)
        .lean()
    ]);

    // Stats
    const totalJobs = jobs.length;
    const totalApplicants = applications.length;
    const shortlisted = applications.filter(app => app.status === 'shortlisted').length;
    const rejected = applications.filter(app => app.status === 'rejected').length;

    // Map application counts to jobs
    const countMap = new Map(appCountsByJob.map(item => [item._id.toString(), item.count]));
    const applicationsPerJob = jobs.map(job => ({
      jobId: job._id,
      title: job.title,
      company: job.company,
      applicants: countMap.get(job._id.toString()) || 0
    }));

    // Top skills demanded across active jobs
    const allSkills = jobs.flatMap(job => job.requiredSkills || []);
    const skillCount = {};
    allSkills.forEach(skill => {
      const normalized = skill.trim();
      if (normalized) {
        skillCount[normalized] = (skillCount[normalized] || 0) + 1;
      }
    });

    const topSkills = Object.entries(skillCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Candidate distribution by status
    const candidateDistribution = {
      applied: applications.filter(app => app.status === 'applied').length,
      shortlisted,
      rejected,
      withdrawn: applications.filter(app => app.status === 'withdrawn').length
    };

    return res.status(200).json({
      success: true,
      stats: { totalJobs, totalApplicants, shortlisted, rejected },
      charts: {
        applicationsPerJob,
        topSkills,
        candidateDistribution
      },
      recentApplications
    });
  } catch (error) {
    console.error('Employer dashboard error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error retrieving employer dashboard.' });
  }
};

// @desc    Get candidate dashboard data
// @route   GET /api/dashboard/candidate
export const getCandidateDashboard = async (req, res) => {
  try {
    const candidateId = req.user._id;

    // Concurrently fetch candidate resume and applications with lean projection
    const [resume, applications] = await Promise.all([
      Resume.findOne({ userId: candidateId }).select('-rawText').sort('-createdAt').lean(),
      Application.find({ candidateId })
        .populate('jobId', 'title company location salary status deadline')
        .sort('-createdAt')
        .lean()
    ]);

    const appliedJobs = applications.filter(app => app.status === 'applied').length;
    const shortlisted = applications.filter(app => app.status === 'shortlisted').length;
    const rejected = applications.filter(app => app.status === 'rejected').length;

    return res.status(200).json({
      success: true,
      resume: resume ? {
        _id: resume._id,
        originalName: resume.originalName,
        fileUrl: resume.fileUrl,
        status: resume.status,
        parsedData: resume.parsedData,
        aiScore: resume.aiScore
      } : null,
      applications: {
        total: applications.length,
        applied: appliedJobs,
        shortlisted,
        rejected,
        list: applications
      },
      stats: {
        resumeScore: resume?.aiScore?.resumeScore || 0,
        atsScore: resume?.aiScore?.atsScore || 0,
        missingSkills: resume?.aiScore?.missingSkills || [],
        strengths: resume?.aiScore?.strengths || [],
        recommendations: resume?.aiScore?.recommendations || []
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving candidate dashboard.' });
  }
};

// @desc    Get admin dashboard data
// @route   GET /api/dashboard/admin
export const getAdminDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalCandidates,
      totalEmployers,
      totalAdmins,
      totalJobs,
      activeJobs,
      closedJobs,
      totalApplications,
      shortlisted,
      rejected,
      recentUsers,
      recentJobs,
      recentApplications,
      jobsPerEmployer
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'candidate' }),
      User.countDocuments({ role: 'employer' }),
      User.countDocuments({ role: 'admin' }),
      Job.countDocuments(),
      Job.countDocuments({ status: 'active' }),
      Job.countDocuments({ status: 'closed' }),
      Application.countDocuments(),
      Application.countDocuments({ status: 'shortlisted' }),
      Application.countDocuments({ status: 'rejected' }),
      User.find().select('-password').sort('-createdAt').limit(10).lean(),
      Job.find().populate('employerId', 'name email').sort('-createdAt').limit(10).lean(),
      Application.find().populate('candidateId', 'name email').populate('jobId', 'title company').sort('-createdAt').limit(10).lean(),
      Job.aggregate([
        { $group: { _id: '$employerId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'employer'
          }
        },
        { $unwind: '$employer' },
        { $project: { name: '$employer.name', count: 1 } }
      ])
    ]);

    return res.status(200).json({
      success: true,
      users: {
        total: totalUsers,
        candidates: totalCandidates,
        employers: totalEmployers,
        admins: totalAdmins,
        recent: recentUsers
      },
      jobs: {
        total: totalJobs,
        active: activeJobs,
        closed: closedJobs,
        recent: recentJobs
      },
      applications: {
        total: totalApplications,
        shortlisted,
        rejected,
        recent: recentApplications
      },
      charts: {
        jobsPerEmployer
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving admin dashboard.' });
  }
};
