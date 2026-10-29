import { useState, useEffect, useCallback } from "react";
import {
  uploadResume,
  parseResume,
  analyzeResume,
  getResumes,
  deleteResume,
} from "../services/resumeService";
import LoadingSpinner from "../components/LoadingSpinner";
import ScoreCard from "../components/ScoreCard";
import Navbar from "../components/Navbar";
import { toast } from "react-toastify";

const ResumeUpload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState(null);

  const loadResumes = useCallback(async (isMounted = { current: true }) => {
    try {
      const data = await getResumes();
      if (isMounted.current) {
        setResumes(data.resumes || []);
      }
    } catch {
      // Handled gracefully
    }
  }, []);

  useEffect(() => {
    const isMounted = { current: true };
    loadResumes(isMounted);
    return () => {
      isMounted.current = false;
    };
  }, [loadResumes]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Please upload only PDF or DOCX format files");
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("File size must be 5MB or less");
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a document first");
      return;
    }

    try {
      setLoading(true);
      const data = await uploadResume(file);
      toast.success("Resume uploaded successfully!");
      setFile(null);
      setSelectedResume(data.resume);
      await loadResumes();

      // Auto-parse after upload
      setParsing(true);
      const parseData = await parseResume(data.resume._id);
      setParsedData(parseData.parsedData);
      toast.success("Resume parsed successfully!");
      setParsing(false);

      const updated = await getResumes();
      const found = updated.resumes?.find((r) => r._id === data.resume._id);
      if (found) {
        setSelectedResume(found);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Resume upload failed");
    } finally {
      setLoading(false);
      setParsing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedResume) {
      toast.error("Please select and parse a resume first");
      return;
    }
    if (!jobDescription.trim()) {
      toast.error("Please enter a target job description for comparison");
      return;
    }

    try {
      setAnalyzing(true);
      const data = await analyzeResume(selectedResume._id, jobDescription);
      setAnalysis(data.analysis);
      toast.success("AI Analysis complete!");
    } catch (error) {
      toast.error(error.response?.data?.message || "AI Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this resume?")) return;
    try {
      await deleteResume(id);
      toast.success("Resume deleted");
      setSelectedResume(null);
      setAnalysis(null);
      setParsedData(null);
      await loadResumes();
    } catch {
      toast.error("Failed to delete resume");
    }
  };

  const handleSelectResume = (resume) => {
    setSelectedResume(resume);
    setAnalysis(resume.aiScore?.resumeScore ? resume.aiScore : null);
    setParsedData(resume.parsedData);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Header Banner */}
      <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white border-b border-indigo-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold mb-2">
            <span>📄</span> Candidate Portfolio
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Resume Management & AI Diagnostics
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Upload your resume, inspect extracted profile entities, and run instant AI match diagnostics against job roles.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Upload & Profile Resumes */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-1">Upload New Resume</h2>
              <p className="text-xs text-slate-500 mb-4">Upload standard PDF or Word DOCX document.</p>

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                  dragActive
                    ? "border-indigo-500 bg-indigo-50/50"
                    : "border-slate-300 hover:border-indigo-400 bg-slate-50/50"
                }`}
              >
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  id="resume-file-upload"
                />
                <label htmlFor="resume-file-upload" className="cursor-pointer block">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl mx-auto mb-2 border border-indigo-100">
                    📄
                  </div>
                  <p className="text-sm text-slate-800 font-semibold mb-1">
                    {file ? file.name : "Choose or drag resume here"}
                  </p>
                  <p className="text-xs text-slate-400">PDF or DOCX (max 5MB)</p>
                </label>
              </div>

              {file && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-slate-500">📎</span>
                      <span className="text-xs font-semibold text-slate-700 truncate max-w-[180px]">
                        {file.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-rose-500 hover:text-rose-700 text-xs font-semibold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={loading}
                    className="w-full mt-3 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-blue-700 transition shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? "Processing Upload..." : "Upload & Parse Resume"}
                  </button>
                </div>
              )}
            </div>

            {/* Previous Resumes List */}
            {resumes.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
                <h2 className="text-base font-bold text-slate-900 mb-3">Saved Resumes</h2>
                <div className="space-y-2">
                  {resumes.map((resume) => (
                    <div
                      key={resume._id}
                      onClick={() => handleSelectResume(resume)}
                      className={`p-3 rounded-xl cursor-pointer transition-all border ${
                        selectedResume?._id === resume._id
                          ? "border-indigo-400 bg-indigo-50/50 shadow-xs"
                          : "border-slate-200/80 hover:border-indigo-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-slate-400 text-base">📄</span>
                          <div>
                            <p className="text-xs font-bold text-slate-800 truncate max-w-[160px]">
                              {resume.originalName}
                            </p>
                            <span
                              className={`text-[10px] font-semibold uppercase tracking-wider ${
                                resume.status === "analyzed"
                                  ? "text-emerald-600"
                                  : resume.status === "parsed"
                                    ? "text-indigo-600"
                                    : "text-slate-400"
                              }`}
                            >
                              ● {resume.status}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(resume._id);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete resume"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Parsing & AI Diagnostic Output */}
          <div className="lg:col-span-2 space-y-6">
            {parsing && (
              <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-xs flex justify-center">
                <LoadingSpinner text="Extracting candidate entities from document..." />
              </div>
            )}

            {parsedData && !parsing && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Parsed Resume Entities
                    </h2>
                    <p className="text-xs text-slate-500">Extracted metadata and structured credentials.</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✓ Verified
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2.5 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase font-semibold">Candidate Name</p>
                      <p className="text-sm font-bold text-slate-800">{parsedData.name || "Not detected"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase font-semibold">Email</p>
                      <p className="text-xs text-slate-700 font-mono">{parsedData.email || "Not detected"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase font-semibold">Phone</p>
                      <p className="text-xs text-slate-700 font-mono">{parsedData.phone || "Not detected"}</p>
                    </div>
                  </div>

                  <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase font-semibold mb-1">
                        Detected Skills ({parsedData.skills?.length || 0})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {parsedData.skills?.map((skill, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md text-[11px] font-semibold"
                          >
                            {skill}
                          </span>
                        )) || <span className="text-xs text-slate-400">None detected</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {parsedData.experience?.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                      Work Experience
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {parsedData.experience.map((exp, i) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                          <p className="font-bold text-slate-800">{exp.company || exp.role || "Role"}</p>
                          <p className="text-slate-500 mt-0.5">{exp.duration}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI Diagnostics Box */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🤖</span>
                <h2 className="text-base font-bold text-slate-900">AI Role Match Diagnostic</h2>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Paste any job description to evaluate your resume against its requirements and discover missing skills.
              </p>

              <div className="mb-4">
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the target job description or requirements here..."
                  rows={4}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none transition-all leading-relaxed"
                />
              </div>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing || !selectedResume}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {analyzing ? "Analyzing with HireSense AI..." : "Run AI Resume Diagnostic"}
              </button>

              {analyzing && (
                <div className="mt-6 flex justify-center py-4">
                  <LoadingSpinner text="Evaluating semantic relevance and competencies..." />
                </div>
              )}

              {analysis && !analyzing && (
                <div className="mt-6 space-y-5 pt-5 border-t border-slate-100">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    <ScoreCard label="Resume Score" score={analysis.resumeScore} color="indigo" icon="📊" />
                    <ScoreCard label="ATS Score" score={analysis.atsScore} color="blue" icon="⚡" />
                    <ScoreCard label="Technical" score={analysis.technicalSkills} color="purple" icon="💻" />
                    <ScoreCard label="Communication" score={analysis.communication} color="teal" icon="💬" />
                    <ScoreCard label="Experience" score={analysis.experienceMatch} color="orange" icon="💼" />
                    <ScoreCard label="Education" score={analysis.educationMatch} color="green" icon="🎓" />
                  </div>

                  <div
                    className={`text-center py-2.5 px-4 rounded-xl font-bold text-sm ${
                      analysis.ranking === "Highly Recommended"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : analysis.ranking === "Recommended"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : analysis.ranking === "Moderate"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    AI Recommendation Status: {analysis.ranking}
                  </div>

                  {analysis.summary && (
                    <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
                      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700 mb-1">
                        Executive Summary
                      </p>
                      <p className="text-xs text-indigo-950 leading-relaxed font-medium">
                        {analysis.summary}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                      <h3 className="text-xs font-bold text-emerald-800 mb-1.5 flex items-center gap-1">
                        <span>✓</span> Key Strengths
                      </h3>
                      <ul className="space-y-1">
                        {analysis.strengths?.map((s, i) => (
                          <li key={i} className="text-xs text-emerald-700">
                            • {s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-100">
                      <h3 className="text-xs font-bold text-rose-800 mb-1.5 flex items-center gap-1">
                        <span>⚠️</span> Areas for Improvement
                      </h3>
                      <ul className="space-y-1">
                        {analysis.weaknesses?.map((w, i) => (
                          <li key={i} className="text-xs text-rose-700">
                            • {w}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
                      <h3 className="text-xs font-bold text-blue-800 mb-1.5 flex items-center gap-1">
                        <span>💡</span> Actionable Advice
                      </h3>
                      <ul className="space-y-1">
                        {analysis.recommendations?.map((r, i) => (
                          <li key={i} className="text-xs text-blue-700">
                            • {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {analysis.missingSkills?.length > 0 && (
                    <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100">
                      <h3 className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1.5">
                        <span>🔧</span> Missing Required Competencies
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.missingSkills.map((skill, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-xs font-semibold"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!selectedResume && !analysis && (
                <div className="mt-6 text-center py-6 text-slate-400 text-xs">
                  Upload or select a resume on the left to activate AI diagnostics.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeUpload;
