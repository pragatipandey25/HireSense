import express from 'express';
import { body } from 'express-validator';
import upload, { validateFileIntegrity } from '../middleware/uploadMiddleware.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import validateRequest from '../middleware/validateRequest.js';
import {
  uploadResume,
  uploadBulkResumes,
  parseResumeById,
  analyzeResume,
  getResumes,
  getResumeById,
  downloadResume,
  deleteResume,
  getCandidateResume
} from '../controllers/resumeController.js';

const router = express.Router();

router.use(protect);

// Upload single resume (candidate)
router.post(
  '/upload',
  authorizeRoles('candidate'),
  upload.single('resume'),
  validateFileIntegrity,
  uploadResume
);

// Bulk Upload resumes (employer/admin) - supports up to 10 resumes simultaneously
router.post(
  '/bulk-upload',
  authorizeRoles('employer', 'admin'),
  upload.array('resumes', 10),
  validateFileIntegrity,
  uploadBulkResumes
);

// Parse resume
router.post(
  '/parse/:id',
  authorizeRoles('candidate', 'employer', 'admin'),
  parseResumeById
);

// Analyze resume with AI against ad-hoc job description
router.post(
  '/analyze/:id',
  authorizeRoles('candidate', 'employer', 'admin'),
  [
    body('jobDescription', 'Job description is required').notEmpty()
  ],
  validateRequest,
  analyzeResume
);

// Get candidate resumes
router.get(
  '/',
  authorizeRoles('candidate'),
  getResumes
);

// Download resume document securely
router.get(
  '/download/:id',
  downloadResume
);

// Get resume metadata by ID
router.get(
  '/:id',
  getResumeById
);

// Delete resume
router.delete(
  '/:id',
  authorizeRoles('candidate', 'admin'),
  deleteResume
);

// Get candidate resume (authorized employer/admin only)
router.get(
  '/candidate/:id',
  authorizeRoles('employer', 'admin'),
  getCandidateResume
);

export default router;
