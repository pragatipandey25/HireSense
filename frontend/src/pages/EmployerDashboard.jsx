import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getEmployerDashboard } from "../services/dashboardService";
import LoadingSpinner from "../components/LoadingSpinner";
import Navbar from "../components/Navbar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#6366f1", "#06b6d4", "#10b981", "#ef4444", "#f59e0b"];

const EmployerDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async (isMounted = { current: true }) => {
    try {
      const dashboardData = await getEmployerDashboard();
      if (isMounted.current) {
        setData(dashboardData);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      if (isMounted.current) {
        setError("Unable to load employer analytics. Please try again.");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <LoadingSpinner text="Loading recruitment analytics..." />
      </div>
    );
  }

  const { stats, charts, recentApplications } = data || {};

  const candidateDistributionData = charts?.candidateDistribution
    ? Object.entries(charts.candidateDistribution).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      })).filter(d => d.value > 0)
    : [];

  const applicationsPerJobData = charts?.applicationsPerJob || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-8 mb-8 text-white shadow-md border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
                Recruiter Intelligence Portal
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">Employer Dashboard</h1>
              <p className="text-slate-300 mt-1 text-sm">
                Real-time pipeline metrics, AI candidate evaluations, and hiring analytics.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/employer/jobs"
                className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
              >
                📋 View All Jobs
              </Link>
              <Link
                to="/employer/jobs/create"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
              >
                + Post New Job
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase">Active Jobs</p>
            <p className="text-3xl font-extrabold text-indigo-600 mt-1">{stats?.totalJobs || 0}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase">Total Applicants</p>
            <p className="text-3xl font-extrabold text-cyan-600 mt-1">{stats?.totalApplicants || 0}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase">Shortlisted</p>
            <p className="text-3xl font-extrabold text-emerald-600 mt-1">{stats?.shortlisted || 0}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase">Rejected</p>
            <p className="text-3xl font-extrabold text-rose-600 mt-1">{stats?.rejected || 0}</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Applicants per Job */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Applicants per Job Posting</h3>
            {applicationsPerJobData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={applicationsPerJobData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="title" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="applicants" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-xs py-10 text-center">No job applicants recorded yet.</p>
            )}
          </div>

          {/* Candidate Pipeline Distribution */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Application Funnel Distribution</h3>
            {candidateDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={candidateDistributionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {candidateDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-xs py-10 text-center">No application status data available.</p>
            )}
          </div>
        </div>

        {/* Recent Applications Table */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Recent Candidate Applications</h3>
              <p className="text-xs text-slate-500">Latest applicants received across your open roles</p>
            </div>
            <Link
              to="/employer/jobs"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Manage Positions →
            </Link>
          </div>

          {recentApplications?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Candidate</th>
                    <th className="pb-3 font-semibold">Applied Position</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentApplications.map((app) => (
                    <tr key={app._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5">
                        <span className="font-bold text-slate-900 block">{app.candidateId?.name || "Candidate"}</span>
                        <span className="text-[11px] text-slate-400">{app.candidateId?.email}</span>
                      </td>
                      <td className="py-3.5 font-medium text-slate-700">{app.jobId?.title || "Job Posting"}</td>
                      <td className="py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full font-semibold capitalize text-[11px] ${
                            app.status === "shortlisted"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : app.status === "rejected"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <Link
                          to={`/employer/jobs/${app.jobId?._id}/analyze`}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition"
                        >
                          Screen
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400">
              <p className="text-3xl mb-2">📥</p>
              <p className="text-xs">No candidate applications submitted yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployerDashboard;
