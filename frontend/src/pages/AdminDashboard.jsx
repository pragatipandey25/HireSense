import { useState, useEffect, useCallback } from "react";
import { deleteUser } from "../services/adminService";
import { getAdminDashboard } from "../services/dashboardService";
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
} from "recharts";
import { toast } from "react-toastify";

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const loadDashboard = useCallback(async (isMounted = { current: true }) => {
    try {
      const dashboardData = await getAdminDashboard();
      if (isMounted.current) {
        setData(dashboardData);
      }
    } catch {
      toast.error("Failed to load dashboard");
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

  const handleDeleteUser = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this user? This action cannot be undone.",
      )
    )
      return;
    try {
      await deleteUser(id);
      toast.success("User deleted successfully");
      loadDashboard();
    } catch {
      toast.error("Failed to delete user");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner text="Loading admin intelligence dashboard..." />
      </div>
    );
  }

  const { users, jobs, applications, charts } = data || {};

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Admin Header Banner */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white border-b border-indigo-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold mb-2">
                <span>🛡️</span> System Administration
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Admin Intelligence Dashboard
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                Monitor system metrics, manage users, and supervise recruitment pipelines.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Users</p>
            <p className="text-3xl font-extrabold text-indigo-600 mt-2">
              {users?.total || 0}
            </p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs text-slate-500">
              <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium">👤 {users?.candidates || 0} candidates</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium">💼 {users?.employers || 0} employers</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Jobs</p>
            <p className="text-3xl font-extrabold text-blue-600 mt-2">
              {jobs?.total || 0}
            </p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-medium">
                ● {jobs?.active || 0} active
              </span>
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                ● {jobs?.closed || 0} closed
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Applications</p>
            <p className="text-3xl font-extrabold text-purple-600 mt-2">
              {applications?.total || 0}
            </p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-medium">
                ✓ {applications?.shortlisted || 0} shortlisted
              </span>
              <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md font-medium">
                ✕ {applications?.rejected || 0} rejected
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">System Admins</p>
            <p className="text-3xl font-extrabold text-cyan-600 mt-2">
              {users?.admins || 0}
            </p>
            <p className="text-xs text-slate-500 mt-3 font-medium">
              🛡️ Root access accounts
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap border-b border-slate-200 pb-3">
          {[
            { id: "overview", label: "Overview & Analytics" },
            { id: "users", label: "Users Directory" },
            { id: "jobs", label: "Job Postings" },
            { id: "applications", label: "All Applications" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm shadow-indigo-500/25"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900">
                  Jobs Per Employer Distribution
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Job creation activity by employer account.
                </p>
              </div>
              {charts?.jobsPerEmployer?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={charts.jobsPerEmployer}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        color: "#fff",
                        borderRadius: "0.75rem",
                        border: "none",
                        fontSize: "0.8rem",
                      }}
                    />
                    <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                  No employer distribution data available yet.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 mb-4">
                  Recently Registered Users
                </h3>
                <div className="space-y-2">
                  {users?.recent?.slice(0, 5).map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl transition-colors border border-slate-100"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          {user.name}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-medium capitalize ${
                            user.role === "admin"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : user.role === "employer"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {user.role}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 mb-4">
                  Recently Posted Jobs
                </h3>
                <div className="space-y-2">
                  {jobs?.recent?.slice(0, 5).map((job) => (
                    <div
                      key={job._id}
                      className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl transition-colors border border-slate-100"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {job.title}
                        </p>
                        <p className="text-xs text-slate-500">{job.company}</p>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                          job.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Users */}
        {activeTab === "users" && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4">All Users</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users?.recent?.map((user) => (
                    <tr
                      key={user._id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm font-semibold text-slate-800">
                        {user.name}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 font-mono text-xs">
                        {user.email}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-md capitalize font-semibold ${
                            user.role === "admin"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : user.role === "employer"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteUser(user._id)}
                          className="px-3 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-semibold border border-rose-200 transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Jobs */}
        {activeTab === "jobs" && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4">All Job Postings</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Employer
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs?.recent?.map((job) => (
                    <tr
                      key={job._id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm font-semibold text-slate-800">
                        {job.title}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {job.company}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {job.employerId?.name || "Unknown"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                            job.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Applications */}
        {activeTab === "applications" && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              All Applications Across Platform
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Candidate
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Job
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      AI Score
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Applied
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications?.recent?.map((app) => (
                    <tr
                      key={app._id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm font-semibold text-slate-800">
                        {app.candidateId?.name || "Unknown"}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {app.jobId?.title || "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full capitalize font-semibold ${
                            app.status === "shortlisted"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : app.status === "rejected"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : app.status === "withdrawn"
                                  ? "bg-slate-100 text-slate-500 border border-slate-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm font-bold text-slate-800">
                        {app.aiScore?.overallScore != null ? `${app.aiScore.overallScore}%` : "Pending"}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;