import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getCandidateDashboard } from "../services/dashboardService";
import LoadingSpinner from "../components/LoadingSpinner";
import Navbar from "../components/Navbar";

const CandidateDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async (isMounted = { current: true }) => {
    try {
      const dashboardData = await getCandidateDashboard();
      if (isMounted.current) {
        setData(dashboardData);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      if (isMounted.current) {
        setError("Unable to load candidate dashboard metrics. Please check your network connection and try again.");
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const isMounted = { current: true };
    loadDashboard(isMounted);
    return () => {
      isMounted.current = false;
    };
  }, [loadDashboard]);

  const handleRetry = () => {
    setLoading(true);
    loadDashboard();
  };

  const getStatusColor = (status) => {
    const colors = {
      applied: "bg-blue-50 text-blue-700 border border-blue-200",
      shortlisted: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      rejected: "bg-rose-50 text-rose-700 border border-rose-200",
      withdrawn: "bg-slate-100 text-slate-500 border border-slate-200",
    };
    return colors[status] || "bg-slate-100 text-slate-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <LoadingSpinner text="Loading candidate portal..." />
      </div>
    );
  }

  const { resume, applications, stats } = data || {};
  const hasResume = resume && (resume.aiScore?.resumeScore > 0 || resume.status === "parsed" || resume.status === "analyzed");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-8 mb-8 text-white shadow-md border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
                Candidate Workspace
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">Candidate Dashboard</h1>
              <p className="text-slate-300 mt-1 text-sm">
                Track your active applications, resume parsing status, and explainable AI scores.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/candidate/jobs"
                className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition shadow-sm"
              >
                🔍 Explore Jobs
              </Link>
              <Link
                to="/candidate/resume"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
              >
                {resume ? "📄 Update Resume" : "📄 Upload Resume"}
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button
              onClick={handleRetry}
              className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Resume Status Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">📄 Primary Resume Document</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {resume
                  ? `Active File: ${resume.originalName}`
                  : "No resume uploaded yet. Upload a PDF or DOCX to unlock AI match scoring."}
              </p>
            </div>
            {resume && (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold capitalize bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Status: {resume.status}
                </span>
                <Link
                  to="/candidate/resume"
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Manage
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* AI Scoring Summary Cards */}
        {hasResume && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase">Resume Quality</p>
              <p className="text-3xl font-extrabold text-indigo-600 mt-1">{stats.resumeScore || 0}%</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase">ATS Readability</p>
              <p className="text-3xl font-extrabold text-cyan-600 mt-1">{stats.atsScore || 0}%</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase">Applied Jobs</p>
              <p className="text-3xl font-extrabold text-slate-800 mt-1">{applications?.total || 0}</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase">Shortlisted</p>
              <p className="text-3xl font-extrabold text-emerald-600 mt-1">{applications?.shortlisted || 0}</p>
            </div>
          </div>
        )}

        {/* Detailed AI Feedback Grid */}
        {hasResume && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Strengths */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Profile Strengths
              </h3>
              {stats?.strengths?.length > 0 ? (
                <ul className="space-y-2 text-xs text-slate-600">
                  {stats.strengths.map((str, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">Analyze your resume against a job to generate strengths.</p>
              )}
            </div>

            {/* Missing Skills */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="text-amber-500">⚠</span> Identified Skill Gaps
              </h3>
              {stats?.missingSkills?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {stats.missingSkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No major skill gaps identified in your latest evaluation.</p>
              )}
            </div>

            {/* Recommendations */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <span className="text-indigo-500">💡</span> AI Recommendations
              </h3>
              {stats?.recommendations?.length > 0 ? (
                <ul className="space-y-2 text-xs text-slate-600">
                  {stats.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">Apply to jobs to receive tailored AI recommendations.</p>
              )}
            </div>
          </div>
        )}

        {/* Recent Applications Section */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Your Active Job Applications</h3>
              <p className="text-xs text-slate-500">Real-time status updates from hiring teams</p>
            </div>
            <Link
              to="/candidate/applications"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View All Applications →
            </Link>
          </div>

          {applications?.list?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Position</th>
                    <th className="pb-3 font-semibold">Company</th>
                    <th className="pb-3 font-semibold">Location</th>
                    <th className="pb-3 font-semibold">Match Score</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.list.slice(0, 5).map((app) => (
                    <tr key={app._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 font-bold text-slate-900">{app.jobId?.title || "Job Posting"}</td>
                      <td className="py-3.5 text-slate-600">{app.jobId?.company || "Company"}</td>
                      <td className="py-3.5 text-slate-500">{app.jobId?.location || "Remote"}</td>
                      <td className="py-3.5">
                        <span className="font-extrabold text-indigo-600">
                          {app.aiScore?.overallScore ? `${app.aiScore.overallScore}%` : "Screened"}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-1 rounded-full font-semibold capitalize ${getStatusColor(app.status)}`}>
                          {app.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-xs">You have not submitted any applications yet.</p>
              <Link
                to="/candidate/jobs"
                className="mt-3 inline-block px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
              >
                Browse Open Positions
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboard;
