import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getEmployerJobs, deleteJob, closeJob, reopenJob } from "../services/jobService";
import JobCard from "../components/JobCard";
import LoadingSpinner from "../components/LoadingSpinner";
import Navbar from "../components/Navbar";
import { toast } from "react-toastify";

const ViewJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = useCallback(async (isMounted = { current: true }) => {
    try {
      const data = await getEmployerJobs();
      if (isMounted.current) {
        setJobs(data.jobs || []);
      }
    } catch {
      toast.error("Failed to load jobs");
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const isMounted = { current: true };
    loadJobs(isMounted);
    return () => {
      isMounted.current = false;
    };
  }, [loadJobs]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this job posting? This will remove all associated rankings and applications.")) return;
    try {
      await deleteJob(id);
      toast.success("Job posting deleted");
      loadJobs();
    } catch {
      toast.error("Failed to delete job");
    }
  };

  const handleClose = async (id) => {
    try {
      await closeJob(id);
      toast.success("Job closed successfully");
      loadJobs();
    } catch {
      toast.error("Failed to close job");
    }
  };

  const handleReopen = async (id) => {
    try {
      await reopenJob(id);
      toast.success("Job reopened successfully");
      loadJobs();
    } catch {
      toast.error("Failed to reopen job");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner text="Loading your job postings..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Header Banner */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white border-b border-indigo-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold mb-2">
                <span>💼</span> Job Management
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                My Job Postings
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                Manage your active vacancies, screen applicants, and close or reopen roles.
              </p>
            </div>
            <Link
              to="/employer/jobs/create"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all self-start sm:self-auto cursor-pointer"
            >
              <span>+</span> Post New Job
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {jobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-xl mx-auto shadow-xs">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 border border-indigo-100">
              📭
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Jobs Posted Yet</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Create your first job listing to begin receiving resumes and running AI-assisted screening.
            </p>
            <Link
              to="/employer/jobs/create"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-blue-700 transition-all shadow-sm"
            >
              Post Your First Job
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <JobCard
                key={job._id}
                job={job}
                showActions={true}
                onClose={handleClose}
                onReopen={handleReopen}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewJobs;
