import express from 'express';
import { body } from 'express-validator';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import validateRequest from '../middleware/validateRequest.js';
import {
  analyzeJobCandidates,
  getJobRankings,
  exportJobRankingsCSV,
  getRankingDetail,
  updateRanking,
  getAvailableCandidates,
  getEmployerAnalysisAnalytics
} from '../controllers/analysisController.js';

const router = express.Router();

router.use(protect);

// Employer/Admin: Get available candidates with parsed resumes
router.get(
  '/candidates',
  authorizeRoles('employer', 'admin'),
  getAvailableCandidates
);

// Employer/Admin: Analyze all candidates for a job
router.post(
  '/:jobId/analyze',
  authorizeRoles('employer', 'admin'),
  analyzeJobCandidates
);

// Employer/Admin: Get rankings for a job (with filters, search, sort)
router.get(
  '/:jobId/rankings',
  authorizeRoles('employer', 'admin'),
  getJobRankings
);

// Employer/Admin: Export rankings as CSV report (sanitized against formula injection)
router.get(
  '/:jobId/export/csv',
  authorizeRoles('employer', 'admin'),
  exportJobRankingsCSV
);

// Employer/Admin: Get analytics
router.get(
  '/analytics',
  authorizeRoles('employer', 'admin'),
  getEmployerAnalysisAnalytics
);

// Get single ranking detail (Employer, Admin, or Candidate subject)
router.get(
  '/ranking/:id',
  authorizeRoles('employer', 'admin', 'candidate'),
  getRankingDetail
);

// Employer/Admin: Update ranking status (shortlist/reject)
router.patch(
  '/ranking/:id/status',
  authorizeRoles('employer', 'admin'),
  [
    body('status', 'Status must be shortlisted, rejected, or analyzed').isIn(['shortlisted', 'rejected', 'analyzed'])
  ],
  validateRequest,
  updateRanking
);

export default router;
