import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getRankingDetail,
  updateRankingStatus,
} from "../services/analysisService";
import LoadingSpinner from "../components/LoadingSpinner";
import Navbar from "../components/Navbar";
import { toast } from "react-toastify";

const AnalysisDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ranking, setRanking] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDetail = useCallback(async (isMounted = { current: true }) => {
    try {
      const data = await getRankingDetail(id);
      if (isMounted.current) {
        setRanking(data.ranking);
      }
    } catch {
      toast.error("Failed to load candidate analysis");
      navigate("/employer/dashboard");
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [id, navigate]);

  useEffect(() => {
    const isMounted = { current: true };
    loadDetail(isMounted);
    return () => {
      isMounted.current = false;
    };
  }, [loadDetail]);

  const handleShortlist = async () => {
    try {
      await updateRankingStatus(id, "shortlisted");
      toast.success("Candidate marked as Shortlisted!");
      loadDetail();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleReject = async () => {
    try {
      await updateRankingStatus(id, "rejected");
      toast.success("Candidate marked as Rejected");
      loadDetail();
    } catch {
      toast.error("Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner text="Loading candidate ranking breakdown..." />
      </div>
    );
  }

  if (!ranking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Evaluation details not found.</p>
      </div>
    );
  }

  const candidate = ranking.candidate || {};
  const resume = ranking.resume || {};
  const job = ranking.job || {};

  const scores = [
    { label: "Resume Overall", value: ranking.resumeScore, icon: "📊" },
    { label: "ATS Score", value: ranking.atsScore, icon: "⚡" },
    { label: "Skill Match", value: ranking.skillMatch, icon: "💻" },
    { label: "Experience Match", value: ranking.experienceMatch, icon: "💼" },
    { label: "Education Match", value: ranking.educationMatch, icon: "🎓" },
    { label: "Certification", value: ranking.certificationScore, icon: "📜" },
    { label: "Communication", value: ranking.communicationScore, icon: "💬" },
    { label: "Leadership", value: ranking.leadershipScore, icon: "👑" },
  ];

  const getRecommendationBadge = () => {
    switch (ranking.recommendation) {
      case "Highly Recommended":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Recommended":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Moderate":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Not Recommended":
      default:
        return "bg-rose-50 text-rose-700 border-rose-200";
    }
  };

  const parsedData = resume?.parsedData || {};

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Header Banner */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white border-b border-indigo-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <Link
              to={`/employer/jobs/${job._id}/analyze`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-200 hover:text-white transition-colors"
            >
              <span>←</span> Back to Candidate Rankings
            </Link>

            <div className="flex items-center gap-2">
              {ranking.status === "analyzed" && (
                <>
                  <button
                    type="button"
                    onClick={handleShortlist}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    ✓ Shortlist Candidate
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    className="px-3.5 py-1.5 bg-rose-500/80 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    ✕ Reject Candidate
                  </button>
                </>
              )}
              {ranking.status === "shortlisted" && (
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-xl text-xs font-semibold">
                  ✓ Currently Shortlisted
                </span>
              )}
              {ranking.status === "rejected" && (
                <span className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-400/30 rounded-xl text-xs font-semibold">
                  ✕ Rejected
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-white text-xl font-bold">
                {candidate.name?.charAt(0)?.toUpperCase() || "C"}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                    {candidate.name || "Candidate Evaluation"}
                  </h1>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRecommendationBadge()}`}
                  >
                    ● {ranking.recommendation || "Evaluated"}
                  </span>
                </div>
                <p className="text-slate-300 text-xs mt-1 font-mono">
                  {candidate.email}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Candidate Rank: <strong className="text-white">#{ranking.rank}</strong> • Applying for{" "}
                  <strong className="text-indigo-200">{job.title}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-4 py-2 rounded-2xl text-center">
                <p className="text-[10px] text-slate-300 uppercase font-semibold">Overall AI Match</p>
                <p className="text-2xl font-extrabold text-white mt-0.5">
                  {ranking.overallScore || 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column - Detailed Dimension Breakdown */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-1">
                Multi-Dimensional Competency Scores
              </h2>
              <p className="text-xs text-slate-500 mb-5">
                Transparent breakdown of scores calculated across normalized evaluation criteria.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {scores.map((score) => (
                  <div
                    key={score.label}
                    className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 text-center"
                  >
                    <span className="text-xl mb-1 block">{score.icon}</span>
                    <p className="text-xl font-extrabold text-slate-900">
                      {score.value || 0}%
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{score.label}</p>
                    <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          score.value >= 80
                            ? "bg-emerald-500"
                            : score.value >= 60
                              ? "bg-indigo-500"
                              : score.value >= 40
                                ? "bg-amber-500"
                                : "bg-rose-500"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, score.value || 0))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths and Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-50/70 rounded-2xl p-5 border border-emerald-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2 flex items-center gap-1.5">
                  <span>✓</span> Identified Strengths
                </h3>
                {ranking.strengths?.length > 0 ? (
                  <ul className="space-y-1.5">
                    {ranking.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-emerald-800 flex items-start gap-1.5">
                        <span className="text-emerald-500 mt-0.5">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-emerald-600">No notable strengths recorded.</p>
                )}
              </div>

              <div className="bg-rose-50/70 rounded-2xl p-5 border border-rose-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 mb-2 flex items-center gap-1.5">
                  <span>⚠️</span> Evaluation Caveats
                </h3>
                {ranking.weaknesses?.length > 0 ? (
                  <ul className="space-y-1.5">
                    {ranking.weaknesses.map((w, i) => (
                      <li key={i} className="text-xs text-rose-800 flex items-start gap-1.5">
                        <span className="text-rose-500 mt-0.5">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-rose-600">No major caveats highlighted.</p>
                )}
              </div>
            </div>

            {/* Missing Skills */}
            {ranking.missingSkills?.length > 0 && (
              <div className="bg-amber-50/70 rounded-2xl p-5 border border-amber-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2 flex items-center gap-1.5">
                  <span>🔧</span> Skill Gap Detection
                </h3>
                <p className="text-xs text-amber-700 mb-3">
                  These required job competencies were not evident in the candidate resume:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ranking.missingSkills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {ranking.recommendations?.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                  <span>💡</span> Recruiter Recommendations
                </h3>
                <ul className="space-y-2">
                  {ranking.recommendations.map((r, i) => (
                    <li key={i} className="text-xs text-slate-700 flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-indigo-600 font-bold">→</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column - Candidate Profile Entities */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-3">
                Extracted Resume Entities
              </h2>

              <div className="space-y-3.5 text-xs">
                {parsedData.name && (
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Name</p>
                    <p className="text-slate-800 font-bold">{parsedData.name}</p>
                  </div>
                )}
                {parsedData.email && (
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Email</p>
                    <p className="text-slate-700 font-mono">{parsedData.email}</p>
                  </div>
                )}
                {parsedData.phone && (
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Phone</p>
                    <p className="text-slate-700 font-mono">{parsedData.phone}</p>
                  </div>
                )}

                {parsedData.skills?.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1.5">
                      Skills ({parsedData.skills.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {parsedData.skills.map((skill, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md text-[11px] font-semibold"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {parsedData.experience?.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1.5">
                      Experience
                    </p>
                    <div className="space-y-1.5">
                      {parsedData.experience.map((exp, i) => (
                        <div key={i} className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="font-bold text-slate-800">
                            {exp.role || exp.company || "Role"}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {exp.company} — {exp.duration}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Target Job Quick Reference */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-3">
                Job Posting Details
              </h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Position</span>
                  <span className="font-semibold text-slate-800">{job.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Company</span>
                  <span className="font-semibold text-slate-800">{job.company}</span>
                </div>
                {job.requiredSkills?.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">
                      Required Skills
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {job.requiredSkills.map((skill, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisDetail;
