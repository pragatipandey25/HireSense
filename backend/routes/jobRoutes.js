import express from 'express';
import { body } from 'express-validator';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import validateRequest from '../middleware/validateRequest.js';
import {
  createJob,
  getJobs,
  getEmployerJobs,
  getJobById,
  updateJob,
  deleteJob,
  closeJob,
  reopenJob
} from '../controllers/jobController.js';

const router = express.Router();

router.use(protect);

// Employer/Admin: Create job
router.post(
  '/',
  authorizeRoles('employer', 'admin'),
  [
    body('title', 'Job title is required').trim().notEmpty(),
    body('description', 'Job description is required').trim().notEmpty(),
    body('experience', 'Experience requirement is required').trim().notEmpty(),
    body('education', 'Education requirement is required').trim().notEmpty(),
    body('location', 'Location is required').trim().notEmpty(),
    body('company', 'Company name is required').trim().notEmpty(),
    body('deadline', 'Application deadline is required').isISO8601()
  ],
  validateRequest,
  createJob
);

// Browse active jobs (all authenticated roles)
router.get(
  '/',
  authorizeRoles('candidate', 'employer', 'admin'),
  getJobs
);

// Employer: Get my jobs
router.get(
  '/employer',
  authorizeRoles('employer', 'admin'),
  getEmployerJobs
);

// Get job by ID
router.get(
  '/:id',
  getJobById
);

// Employer: Update job
router.put(
  '/:id',
  authorizeRoles('employer', 'admin'),
  updateJob
);

// Employer: Delete job
router.delete(
  '/:id',
  authorizeRoles('employer', 'admin'),
  deleteJob
);

// Employer: Close job
router.patch(
  '/:id/close',
  authorizeRoles('employer', 'admin'),
  closeJob
);

// Employer: Reopen job
router.patch(
  '/:id/reopen',
  authorizeRoles('employer', 'admin'),
  reopenJob
);

export default router;
