import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  getCandidateApplications,
  withdrawApplication,
} from "../services/applicationService";
import LoadingSpinner from "../components/LoadingSpinner";
import Navbar from "../components/Navbar";
import { toast } from "react-toastify";

const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const loadApplications = useCallback(async (isMounted = { current: true }) => {
    try {
      const data = await getCandidateApplications();
      if (isMounted.current) {
        setApplications(data.applications || []);
      }
    } catch {
      toast.error("Failed to load your applications");
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const isMounted = { current: true };
    loadApplications(isMounted);
    return () => {
      isMounted.current = false;
    };
  }, [loadApplications]);

  const handleWithdraw = async (id) => {
    if (!window.confirm("Are you sure you want to withdraw this application?"))
      return;
    try {
      await withdrawApplication(id);
      toast.success("Application withdrawn successfully");
      loadApplications();
    } catch {
      toast.error("Failed to withdraw application");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "shortlisted":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "rejected":
        return "bg-rose-50 text-rose-700 border border-rose-200";
      case "withdrawn":
        return "bg-slate-100 text-slate-500 border border-slate-200";
      case "applied":
      default:
        return "bg-indigo-50 text-indigo-700 border border-indigo-200";
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-indigo-600";
    if (score >= 40) return "text-amber-600";
    return "text-rose-600";
  };

  const filteredApps =
    filter === "all"
      ? applications
      : applications.filter((app) => app.status === filter);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Header Banner */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white border-b border-indigo-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold mb-2">
                <span>📋</span> Candidate Tracker
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                My Job Applications
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                Monitor evaluation progress, review AI competency scores, and check recruitment status.
              </p>
            </div>
            <Link
              to="/browse-jobs"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all self-start sm:self-auto cursor-pointer"
            >
              Browse More Jobs
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Pills */}
        <div className="flex gap-2 mb-6 flex-wrap border-b border-slate-200 pb-3">
          {["all", "applied", "shortlisted", "rejected", "withdrawn"].map(
            (status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                  filter === status
                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {status}
              </button>
            ),
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner text="Retrieving your submitted applications..." />
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto shadow-xs">
            <p className="text-3xl mb-3">📭</p>
            <h3 className="text-base font-bold text-slate-800">No Applications Found</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              {filter === "all"
                ? "You haven't applied to any job postings yet."
                : `No applications with status '${filter}'.`}
            </p>
            <Link
              to="/browse-jobs"
              className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl text-xs font-semibold hover:from-indigo-700 hover:to-blue-700 transition shadow-sm"
            >
              Explore Vacancies
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApps.map((app) => (
              <div
                key={app._id}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900">
                        {app.jobId?.title || "Job Title"}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${getStatusBadge(app.status)}`}
                      >
                        ● {app.status}
                      </span>
                    </div>

                    <p className="text-indigo-600 font-semibold text-xs mb-2">
                      {app.jobId?.company}
                    </p>

                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      {app.jobId?.location && (
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                          📍 {app.jobId.location}
                        </span>
                      )}
                      {app.jobId?.salary && (
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                          💰 {app.jobId.salary}
                        </span>
                      )}
                      <span className="text-slate-400 font-mono">
                        📅 Applied: {new Date(app.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    {/* Overall AI Score */}
                    <div className="text-center px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">AI Match</p>
                      <span
                        className={`text-lg font-extrabold ${getScoreColor(app.aiScore?.overallScore || 0)}`}
                      >
                        {app.aiScore?.overallScore != null ? `${app.aiScore.overallScore}%` : "Pending"}
                      </span>
                    </div>

                    {/* Resume Used */}
                    <div className="text-center hidden sm:block">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Resume</p>
                      <span className="text-xs text-slate-700 font-medium truncate max-w-[120px] block">
                        {app.resumeId?.originalName?.substring(0, 16) || "Document"}
                      </span>
                    </div>

                    {/* Withdraw Button */}
                    {app.status === "applied" && (
                      <button
                        type="button"
                        onClick={() => handleWithdraw(app._id)}
                        className="px-3.5 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-semibold border border-rose-200 transition-colors cursor-pointer"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>

                {/* AI Score Breakdown */}
                {app.aiScore && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div className="text-center p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-medium">Resume Relevance</p>
                        <p className="text-xs font-bold text-slate-800">
                          {app.aiScore.resumeScore != null ? `${app.aiScore.resumeScore}%` : "N/A"}
                        </p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-medium">Skills Alignment</p>
                        <p className="text-xs font-bold text-slate-800">
                          {app.aiScore.skillMatch != null ? `${app.aiScore.skillMatch}%` : "N/A"}
                        </p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-medium">Experience</p>
                        <p className="text-xs font-bold text-slate-800">
                          {app.aiScore.experienceMatch != null ? `${app.aiScore.experienceMatch}%` : "N/A"}
                        </p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-medium">Education</p>
                        <p className="text-xs font-bold text-slate-800">
                          {app.aiScore.educationMatch != null ? `${app.aiScore.educationMatch}%` : "N/A"}
                        </p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-medium">ATS Parsability</p>
                        <p className="text-xs font-bold text-slate-800">
                          {app.aiScore.atsScore != null ? `${app.aiScore.atsScore}%` : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyApplications;
