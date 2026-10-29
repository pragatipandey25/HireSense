import express from 'express';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Resume from '../models/Resume.js';
import Ranking from '../models/Ranking.js';

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('admin'));

// @desc    Get all users with pagination and role filter
// @route   GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const query = {};
    if (role) query.role = role;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select('-password')
        .sort('-createdAt')
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean()
    ]);

    return res.status(200).json({
      success: true,
      users,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving users.' });
  }
});

// @desc    Delete user with self-protection and full cascading cleanup
// @route   DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Administrators cannot delete their own active account.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Find and delete employer jobs & associated records
    const jobs = await Job.find({ employerId: user._id }).select('_id').lean();
    const jobIds = jobs.map(j => j._id);

    await Promise.all([
      Resume.deleteMany({ userId: user._id }),
      Application.deleteMany({ $or: [{ jobId: { $in: jobIds } }, { candidateId: user._id }] }),
      Ranking.deleteMany({ $or: [{ job: { $in: jobIds } }, { candidate: user._id }] }),
      Job.deleteMany({ employerId: user._id }),
      user.deleteOne()
    ]);

    return res.status(200).json({ success: true, message: 'User and all related records deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error deleting user.' });
  }
});

// @desc    Get all jobs across system
// @route   GET /api/admin/jobs
router.get('/jobs', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [total, jobs] = await Promise.all([
      Job.countDocuments(),
      Job.find()
        .populate('employerId', 'name email')
        .sort('-createdAt')
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean()
    ]);

    return res.status(200).json({
      success: true,
      jobs,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving jobs.' });
  }
});

// @desc    Get all applications across system
// @route   GET /api/admin/applications
router.get('/applications', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [total, applications] = await Promise.all([
      Application.countDocuments(),
      Application.find()
        .populate('candidateId', 'name email')
        .populate('jobId', 'title company')
        .sort('-createdAt')
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean()
    ]);

    return res.status(200).json({
      success: true,
      applications,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving applications.' });
  }
});

// @desc    Get aggregate system stats
// @route   GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalCandidates,
      totalEmployers,
      totalJobs,
      activeJobs,
      totalApplications,
      totalResumes
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'candidate' }),
      User.countDocuments({ role: 'employer' }),
      Job.countDocuments(),
      Job.countDocuments({ status: 'active' }),
      Application.countDocuments(),
      Resume.countDocuments()
    ]);

    return res.status(200).json({
      success: true,
      totalUsers,
      totalCandidates,
      totalEmployers,
      totalJobs,
      activeJobs,
      totalApplications,
      totalResumes
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving system stats.' });
  }
});

export default router;
