import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { getJobById, closeJob, reopenJob } from "../services/jobService";
import {
  getCandidateRankings,
  updateApplicationStatus,
} from "../services/applicationService";
import RankingTable from "../components/RankingTable";
import LoadingSpinner from "../components/LoadingSpinner";
import Navbar from "../components/Navbar";
import { toast } from "react-toastify";

const JobDetail = () => {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const loadData = useCallback(async (isMounted = { current: true }) => {
    try {
      const jobData = await getJobById(id);
      if (isMounted.current) {
        setJob(jobData.job);
      }

      try {
        const rankingData = await getCandidateRankings(id);
        if (isMounted.current) {
          setRankings(rankingData.rankings || []);
        }
      } catch {
        if (isMounted.current) {
          setRankings([]);
        }
      }
    } catch {
      toast.error("Failed to load job details");
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    const isMounted = { current: true };
    loadData(isMounted);
    return () => {
      isMounted.current = false;
    };
  }, [loadData]);

  const handleShortlist = async (applicationId) => {
    try {
      await updateApplicationStatus(applicationId, "shortlisted");
      toast.success("Candidate shortlisted!");
      loadData();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleReject = async (applicationId) => {
    try {
      await updateApplicationStatus(applicationId, "rejected");
      toast.success("Candidate rejected");
      loadData();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleCloseJob = async () => {
    if (!window.confirm("Are you sure you want to close this job posting? Candidates will no longer be able to apply.")) return;
    try {
      await closeJob(id);
      toast.success("Job closed successfully");
      loadData();
    } catch {
      toast.error("Failed to close job");
    }
  };

  const handleReopenJob = async () => {
    try {
      await reopenJob(id);
      toast.success("Job reopened and active for candidate applications!");
      loadData();
    } catch {
      toast.error("Failed to reopen job");
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <LoadingSpinner text="Loading job posting details..." />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <p className="text-slate-500 text-lg">Job posting not found.</p>
          <Link to="/employer/jobs" className="mt-4 inline-block px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold">
            Back to My Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Job Header Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {job.title}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    job.status === "active"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {job.status}
                </span>
              </div>
              <p className="text-slate-500 text-sm">
                {job.company} • {job.location} • {job.employmentType} • Salary: {job.salary}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Link
                to={`/employer/jobs/${id}/analyze`}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
              >
                ⚡ AI Screening & Rankings
              </Link>

              <Link
                to={`/employer/jobs/edit/${id}`}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                ✏️ Edit Job
              </Link>

              {job.status === "active" ? (
                <button
                  onClick={handleCloseJob}
                  className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold transition"
                >
                  Close Job
                </button>
              ) : (
                <button
                  onClick={handleReopenJob}
                  className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition"
                >
                  Reopen Job
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "overview"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            Job Details & Requirements
          </button>
          <button
            onClick={() => setActiveTab("rankings")}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === "rankings"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            Direct Applicants ({rankings.length})
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-3">Job Description</h3>
                <p className="text-slate-600 text-sm whitespace-pre-line leading-relaxed">
                  {job.description}
                </p>
              </div>

              {/* Responsibilities */}
              {job.responsibilities?.length > 0 && (
                <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900 mb-3">Key Responsibilities</h3>
                  <ul className="list-disc list-inside space-y-2 text-slate-600 text-sm leading-relaxed">
                    {job.responsibilities.map((resp, i) => (
                      <li key={i}>{resp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Requirements */}
              {job.requirements?.length > 0 && (
                <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900 mb-3">Requirements & Qualifications</h3>
                  <ul className="list-disc list-inside space-y-2 text-slate-600 text-sm leading-relaxed">
                    {job.requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right Meta Column */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-4">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.requiredSkills?.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {job.preferredSkills?.length > 0 && (
                  <>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-6 mb-3">
                      Preferred Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {job.preferredSkills.map((skill, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                <div className="mt-6 pt-6 border-t border-slate-100 space-y-3 text-xs text-slate-500">
                  <p>
                    <span className="font-semibold text-slate-700">Experience:</span> {job.experience}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Education:</span> {job.education}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Application Deadline:</span>{" "}
                    {formatDate(job.deadline)}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Posted on:</span> {formatDate(job.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Applicants */}
        {activeTab === "rankings" && (
          <div className="space-y-6">
            <RankingTable
              rankings={rankings}
              onShortlist={handleShortlist}
              onReject={handleReject}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default JobDetail;
