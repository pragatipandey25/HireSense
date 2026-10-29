import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getJobs } from "../services/jobService";
import { getResumes } from "../services/resumeService";
import { applyForJob } from "../services/applicationService";
import JobCard from "../components/JobCard";
import LoadingSpinner from "../components/LoadingSpinner";
import Navbar from "../components/Navbar";
import { toast } from "react-toastify";

const BrowseJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedResume, setSelectedResume] = useState("");
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadJobs = useCallback(async (isMounted = { current: true }) => {
    try {
      const params = { page, limit: 9 };
      if (search) params.search = search;
      if (skillFilter) params.skills = skillFilter;
      if (locationFilter) params.location = locationFilter;

      const data = await getJobs(params);
      if (isMounted.current) {
        setJobs(data.jobs || []);
        setTotalPages(data.pages || 1);
      }
    } catch (err) {
      console.error("Failed to load jobs:", err);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [page, search, skillFilter, locationFilter]);

  const loadResumes = useCallback(async (isMounted = { current: true }) => {
    try {
      const data = await getResumes();
      if (isMounted.current) {
        const list = data.resumes || [];
        setResumes(list);
        if (list.length > 0 && !selectedResume) {
          setSelectedResume(list[0]._id);
        }
      }
    } catch {
      // Resume list fails silently if not logged in
    }
  }, [selectedResume]);

  useEffect(() => {
    const isMounted = { current: true };
    loadJobs(isMounted);
    loadResumes(isMounted);
    return () => {
      isMounted.current = false;
    };
  }, [loadJobs, loadResumes]);

  const handleApplyClick = (job) => {
    setSelectedJob(job);
    if (resumes.length > 0) {
      setSelectedResume(resumes[0]._id);
    }
    setShowApplyModal(true);
  };

  const handleApply = async () => {
    if (!selectedResume) {
      toast.error("Please upload or select a resume first");
      return;
    }
    try {
      setApplying(true);
      await applyForJob(selectedJob._id, selectedResume);
      toast.success("Application submitted successfully!");
      setShowApplyModal(false);
      setSelectedJob(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Application failed");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Header Banner */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white border-b border-indigo-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold mb-2">
            <span>🔍</span> Opportunity Directory
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Explore Opportunities
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Discover roles with transparent criteria and AI-assisted qualification analysis.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Search Keyword
              </label>
              <input
                type="text"
                placeholder="Title, company, or keyword..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Required Skill
              </label>
              <input
                type="text"
                placeholder="e.g. React, Python, AWS..."
                value={skillFilter}
                onChange={(e) => {
                  setSkillFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Location
              </label>
              <input
                type="text"
                placeholder="e.g. Remote, New York..."
                value={locationFilter}
                onChange={(e) => {
                  setLocationFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSkillFilter("");
                  setLocationFilter("");
                  setPage(1);
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Jobs Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner text="Searching available opportunities..." />
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto shadow-xs">
            <p className="text-3xl mb-3">📭</p>
            <h3 className="text-base font-bold text-slate-800">No Job Postings Matched</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Try broadening your keyword or location search criteria.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setSkillFilter("");
                setLocationFilter("");
                setPage(1);
              }}
              className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-semibold border border-indigo-200 transition-colors cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <div key={job._id} className="flex flex-col justify-between">
                  <JobCard job={job} userRole="candidate" />
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() => handleApplyClick(job)}
                      className="w-full py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      Quick Apply with Resume
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3.5 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      page === p
                        ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-xs"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3.5 py-1.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Apply Modal */}
      {showApplyModal && selectedJob && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Apply for Position
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Submit your credentials for <span className="font-semibold text-slate-800">{selectedJob.title}</span> at{" "}
              <span className="font-semibold text-indigo-600">{selectedJob.company}</span>.
            </p>

            <div className="mb-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Select Active Resume
              </label>
              {resumes.length === 0 ? (
                <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800 border border-amber-200">
                  No resume on file. Please{" "}
                  <Link to="/candidate/resume" className="font-bold underline text-amber-900">
                    upload your resume
                  </Link>{" "}
                  first to proceed.
                </div>
              ) : (
                <select
                  value={selectedResume}
                  onChange={(e) => setSelectedResume(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {resumes.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.originalName} ({r.status})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={applying || !selectedResume}
                className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {applying ? "Submitting..." : "Confirm Application"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowseJobs;
