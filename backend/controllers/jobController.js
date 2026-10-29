import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Ranking from '../models/Ranking.js';

// @desc    Create job
// @route   POST /api/jobs
export const createJob = async (req, res) => {
  try {
    const {
      title, description, responsibilities, requirements,
      preferredSkills, requiredSkills,
      experience, minimumExperience, education, requiredEducation,
      employmentType, salary, location, company, deadline
    } = req.body;

    const job = await Job.create({
      employerId: req.user._id,
      title, description,
      responsibilities: responsibilities || [],
      requirements: requirements || [],
      preferredSkills: preferredSkills || [],
      requiredSkills: requiredSkills || [],
      experience: experience || '',
      minimumExperience: minimumExperience || '',
      education: education || '',
      requiredEducation: requiredEducation || '',
      employmentType: employmentType || 'full-time',
      salary: salary || 'Not specified',
      location,
      company,
      deadline
    });

    return res.status(201).json({
      success: true,
      message: 'Job posting created successfully',
      job
    });
  } catch (error) {
    console.error('Create job error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error creating job posting.' });
  }
};

// @desc    Get all active jobs (for candidates with pagination and search)
// @route   GET /api/jobs
export const getJobs = async (req, res) => {
  try {
    const {
      search, skills, location,
      experience, education, page = 1, limit = 10
    } = req.query;

    const query = { status: 'active' };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim());
      query.requiredSkills = { $in: skillsArray };
    }

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    if (experience) {
      query.experience = { $regex: experience, $options: 'i' };
    }

    if (education) {
      query.education = { $regex: education, $options: 'i' };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));

    const [total, jobs] = await Promise.all([
      Job.countDocuments(query),
      Job.find(query)
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
};

// @desc    Get employer's jobs
// @route   GET /api/jobs/employer
export const getEmployerJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ employerId: req.user._id })
      .sort('-createdAt')
      .lean();

    return res.status(200).json({ success: true, jobs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving employer jobs.' });
  }
};

// @desc    Get job by ID
// @route   GET /api/jobs/:id
export const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('employerId', 'name email')
      .lean();

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    return res.status(200).json({ success: true, job });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error retrieving job.' });
  }
};

// @desc    Update job (with mass assignment protection)
// @route   PUT /api/jobs/:id
export const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.employerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this job' });
    }

    const allowedFields = [
      'title', 'description', 'responsibilities', 'requirements',
      'preferredSkills', 'requiredSkills', 'experience', 'minimumExperience',
      'education', 'requiredEducation', 'employmentType', 'salary',
      'location', 'company', 'deadline', 'status'
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      job: updatedJob
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error updating job.' });
  }
};

// @desc    Delete job with cascade cleanup
// @route   DELETE /api/jobs/:id
export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.employerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this job' });
    }

    // Cascade delete associated applications and rankings
    await Promise.all([
      Application.deleteMany({ jobId: job._id }),
      Ranking.deleteMany({ job: job._id }),
      job.deleteOne()
    ]);

    return res.status(200).json({ success: true, message: 'Job and associated records deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error deleting job.' });
  }
};

// @desc    Close job
// @route   PATCH /api/jobs/:id/close
export const closeJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.employerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to close this job' });
    }

    job.status = 'closed';
    await job.save();

    return res.status(200).json({
      success: true,
      message: 'Job closed successfully',
      job
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error closing job.' });
  }
};

// @desc    Reopen job
// @route   PATCH /api/jobs/:id/reopen
export const reopenJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (job.employerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to reopen this job' });
    }

    job.status = 'active';
    await job.save();

    return res.status(200).json({
      success: true,
      message: 'Job reopened successfully',
      job
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error reopening job.' });
  }
};
