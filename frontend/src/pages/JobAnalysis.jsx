import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getJobById } from "../services/jobService";
import {
  analyzeJobCandidates,
  getJobRankings,
  updateRankingStatus,
  getEmployerAnalysisAnalytics,
  exportJobRankingsCSV,
} from "../services/analysisService";
import { uploadBulkResumes } from "../services/resumeService";
import RankingCard from "../components/RankingCard";
import FilterBar from "../components/FilterBar";
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
import { toast } from "react-toastify";

const COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444"];

const JobAnalysis = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [filteredRankings, setFilteredRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState("rankings");
  const [sortBy, setSortBy] = useState("rank");
  const [sortOrder, setSortOrder] = useState("asc");

  // Bulk resume upload modal state
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkFiles, setBulkFiles] = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkSummary, setBulkSummary] = useState(null);

  const loadRankings = useCallback(
    async (filters = {}, isMounted = { current: true }) => {
      try {
        const rankingData = await getJobRankings(id, {
          sortBy,
          sortOrder,
          ...filters,
        });
        if (isMounted.current) {
          setRankings(rankingData.rankings || []);
          setFilteredRankings(rankingData.rankings || []);
        }
      } catch {
        if (isMounted.current) {
          setRankings([]);
          setFilteredRankings([]);
        }
      }
    },
    [id, sortBy, sortOrder]
  );

  const loadData = useCallback(async (isMounted = { current: true }) => {
    try {
      const jobData = await getJobById(id);
      if (isMounted.current) {
        setJob(jobData.job);
      }

      await loadRankings({}, isMounted);

      try {
        const analyticsData = await getEmployerAnalysisAnalytics();
        if (isMounted.current) {
          setAnalytics(analyticsData);
        }
      } catch {
        // Analytics may be empty initially
      }
    } catch {
      toast.error("Failed to load job details.");
      navigate("/employer/jobs");
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [id, loadRankings, navigate]);

  useEffect(() => {
    const isMounted = { current: true };
    loadData(isMounted);
    return () => {
      isMounted.current = false;
    };
  }, [loadData]);

  const handleAnalyze = async () => {
    if (
      !window.confirm(
        "Run HireSense AI multi-dimensional screening across all candidate resumes for this job?"
      )
    )
      return;

    try {
      setAnalyzing(true);
      const result = await analyzeJobCandidates(id);
      toast.success(result.message || "AI Analysis complete!");
      await loadRankings();

      try {
        const analyticsData = await getEmployerAnalysisAnalytics();
        setAnalytics(analyticsData);
      } catch {
        // Non-critical background analytics refresh
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const blob = await exportJobRankingsCSV(id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `HireSense_${job?.title?.replace(/\s+/g, "_") || "Job"}_Rankings.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("CSV candidate report exported successfully!");
    } catch {
      toast.error("Failed to export CSV report.");
    } finally {
      setExporting(false);
    }
  };

  const handleBulkUploadSubmit = async (e) => {
    e.preventDefault();
    if (!bulkFiles.length) {
      toast.error("Please select at least one PDF or DOCX resume.");
      return;
    }

    try {
      setBulkUploading(true);
      const res = await uploadBulkResumes(bulkFiles);
      toast.success(res.message);
      setBulkSummary(res);
      setBulkFiles([]);
      // Refresh rankings
      await loadRankings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Bulk upload failed.");
    } finally {
      setBulkUploading(false);
    }
  };

  const handleShortlist = async (candidate) => {
    const rankingId = candidate._id;
    if (!rankingId) return;
    try {
      await updateRankingStatus(rankingId, "shortlisted");
      toast.success("Candidate shortlisted!");
      await loadRankings();
    } catch {
      toast.error("Failed to shortlist candidate.");
    }
  };

  const handleReject = async (candidate) => {
    const rankingId = candidate._id;
    if (!rankingId) return;
    try {
      await updateRankingStatus(rankingId, "rejected");
      toast.success("Candidate rejected.");
      await loadRankings();
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleViewAnalysis = (candidate) => {
    const rankingId = candidate._id || candidate.applicationId;
    if (rankingId) {
      navigate(`/employer/analysis/${rankingId}`);
    }
  };

  const handleFilter = (filters) => {
    loadRankings(filters);
  };

  const handleSearch = (term) => {
    const searchLower = term.toLowerCase();
    const filtered = rankings.filter((r) => {
      const name = (r.candidate?.name || r.candidateName || "").toLowerCase();
      const email = (r.candidate?.email || r.candidateEmail || "").toLowerCase();
      const missingSkills = (r.missingSkills || []).join(" ").toLowerCase();
      return (
        name.includes(searchLower) ||
        email.includes(searchLower) ||
        missingSkills.includes(searchLower)
      );
    });
    setFilteredRankings(filtered);
  };

  const handleSort = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    loadRankings({ sortBy: field, sortOrder: order });
  };

  const topThree = filteredRankings.filter((r) => r.rank <= 3);
  const restRankings = filteredRankings.filter((r) => r.rank > 3);

  const scoreDistributionData = analytics?.scoreDistribution
    ? [
        { name: "Excellent (85+)", value: analytics.scoreDistribution.excellent, color: "#10b981" },
        { name: "Strong (70-84)", value: analytics.scoreDistribution.strong, color: "#6366f1" },
        { name: "Adequate (50-69)", value: analytics.scoreDistribution.adequate, color: "#f59e0b" },
        {
          name: "Below (0-49)",
          value: analytics.scoreDistribution.belowAverage + analytics.scoreDistribution.poor,
          color: "#ef4444",
        },
      ].filter((d) => d.value > 0)
    : [];

  const recommendationDistData = analytics?.recommendationDistribution
    ? [
        { name: "Highly Rec", value: analytics.recommendationDistribution.highlyRecommended, color: "#10b981" },
        { name: "Recommended", value: analytics.recommendationDistribution.recommended, color: "#6366f1" },
        { name: "Moderate", value: analytics.recommendationDistribution.moderate, color: "#f59e0b" },
        { name: "Not Rec", value: analytics.recommendationDistribution.notRecommended, color: "#ef4444" },
      ].filter((d) => d.value > 0)
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <LoadingSpinner text="Loading candidate rankings..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-8 mb-8 text-white shadow-md border border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
                Recruitment Intelligence
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                AI Candidate Screening & Ranking
              </h1>
              <p className="text-slate-300 mt-1 text-base">
                {job?.title} <span className="text-cyan-400">@</span> {job?.company}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={`/employer/jobs/${id}`}
                className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
              >
                ← View Job Details
              </Link>

              <button
                onClick={() => setBulkModalOpen(true)}
                className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-cyan-400 border border-cyan-500/40 rounded-xl text-xs font-semibold transition flex items-center gap-2 shadow-sm"
              >
                📁 Bulk Upload Resumes
              </button>

              <button
                onClick={handleExportCSV}
                disabled={exporting || rankings.length === 0}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                📥 Export CSV Report
              </button>

              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {analyzing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Screening Resumes...
                  </>
                ) : (
                  <>⚡ Re-Analyze All Candidates</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("rankings")}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === "rankings"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            Candidate Rankings ({filteredRankings.length})
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === "analytics"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            Analytics & Distribution
          </button>
        </div>

        {/* Tab 1: Rankings View */}
        {activeTab === "rankings" && (
          <div className="space-y-6">
            <FilterBar
              onFilter={handleFilter}
              onSearch={handleSearch}
              onSort={handleSort}
              totalCount={filteredRankings.length}
            />

            {analyzing && (
              <div className="p-6 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-4">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <div>
                  <h4 className="font-bold text-indigo-950">HireSense AI is evaluating resumes...</h4>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    Analyzing 11 scoring dimensions, semantic skill matching, and ATS keyword relevance.
                  </p>
                </div>
              </div>
            )}

            {filteredRankings.length > 0 ? (
              <div className="space-y-6">
                {/* Top 3 Podium Cards */}
                {topThree.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Top Match Candidates
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {topThree.map((candidate) => (
                        <RankingCard
                          key={candidate._id || candidate.candidateId}
                          candidate={candidate}
                          onShortlist={handleShortlist}
                          onReject={handleReject}
                          onViewAnalysis={handleViewAnalysis}
                          featured={true}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Remaining Ranked Candidates */}
                {restRankings.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Other Evaluated Candidates ({restRankings.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {restRankings.map((candidate) => (
                        <RankingCard
                          key={candidate._id || candidate.candidateId}
                          candidate={candidate}
                          onShortlist={handleShortlist}
                          onReject={handleReject}
                          onViewAnalysis={handleViewAnalysis}
                          featured={false}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-3xl mx-auto mb-4">
                  👥
                </div>
                <h3 className="text-lg font-bold text-slate-900">No candidate rankings yet</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto mb-6">
                  Bulk upload resumes or click "Analyze Candidates" to screen available profiles against this job criteria.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setBulkModalOpen(true)}
                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
                  >
                    📁 Upload Resumes Now
                  </button>
                  <button
                    onClick={handleAnalyze}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
                  >
                    ⚡ Analyze Existing Resumes
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Analytics View */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {analytics ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Avg Resume Score</p>
                    <p className="text-3xl font-extrabold text-indigo-600 mt-1">
                      {analytics.averageResumeScore || 0}%
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Avg ATS Score</p>
                    <p className="text-3xl font-extrabold text-cyan-600 mt-1">
                      {analytics.averageAtsScore || 0}%
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Avg Overall Match</p>
                    <p className="text-3xl font-extrabold text-purple-600 mt-1">
                      {analytics.averageOverallScore || 0}%
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Total Screened</p>
                    <p className="text-3xl font-extrabold text-slate-800 mt-1">
                      {analytics.totalCandidates || rankings.length || 0}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {scoreDistributionData.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
                      <h4 className="text-sm font-bold text-slate-800 mb-4">Score Distribution</h4>
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={scoreDistributionData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label
                          >
                            {scoreDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {recommendationDistData.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
                      <h4 className="text-sm font-bold text-slate-800 mb-4">Recommendation Breakdown</h4>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={recommendationDistData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
                <p className="text-slate-500 text-sm">No analytics data available yet. Analyze candidates to view charts.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk Resume Upload Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900">Bulk Upload Resumes</h3>
              <button
                onClick={() => {
                  setBulkModalOpen(false);
                  setBulkSummary(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Upload up to 10 candidate resumes (.pdf or .docx) at once. HireSense AI will parse and extract skills automatically.
            </p>

            <form onSubmit={handleBulkUploadSubmit}>
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-indigo-500 transition mb-4">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setBulkFiles(Array.from(e.target.files || []))}
                  className="hidden"
                  id="bulk-file-input"
                />
                <label htmlFor="bulk-file-input" className="cursor-pointer flex flex-col items-center">
                  <span className="text-3xl mb-2">📄</span>
                  <span className="text-xs font-semibold text-indigo-600">Click to browse files</span>
                  <span className="text-[10px] text-slate-400 mt-1">PDF or DOCX (Max 5MB each)</span>
                </label>
              </div>

              {bulkFiles.length > 0 && (
                <div className="mb-4 max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-700 block mb-1">
                    Selected Files ({bulkFiles.length}):
                  </span>
                  {bulkFiles.map((file, idx) => (
                    <div key={idx} className="flex justify-between text-slate-600 truncate">
                      <span className="truncate">{file.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-2">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {bulkSummary && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                  <span className="font-bold">Result:</span> {bulkSummary.message}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkUploading || bulkFiles.length === 0}
                  className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition disabled:opacity-50 flex items-center gap-2"
                >
                  {bulkUploading ? "Uploading & Parsing..." : `Upload ${bulkFiles.length} Resumes`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobAnalysis;
