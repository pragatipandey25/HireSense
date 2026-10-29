import { Link } from "react-router-dom";

const JobCard = ({ job, showActions = false, onClose, onReopen, onDelete, userRole }) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isDeadlinePassed = job.deadline ? new Date(job.deadline) < new Date() : false;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all duration-200 flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start gap-2 mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              {job.title}
            </h3>
            <p className="text-indigo-600 font-semibold text-xs tracking-tight mt-0.5">
              {job.company}
            </p>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize shrink-0 ${
              job.status === "active"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : job.status === "closed"
                  ? "bg-slate-100 text-slate-600 border border-slate-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
          >
            ● {job.status}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3 text-xs">
          {job.location && (
            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-medium">
              📍 {job.location}
            </span>
          )}
          {job.salary && (
            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-medium">
              💰 {job.salary}
            </span>
          )}
          {job.experience && (
            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-medium">
              🎓 {job.experience}
            </span>
          )}
        </div>

        <p className="text-slate-600 text-xs mb-4 line-clamp-2 leading-relaxed">
          {job.description}
        </p>

        {job.requiredSkills?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {job.requiredSkills.slice(0, 4).map((skill, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md text-[11px] font-medium"
              >
                {skill}
              </span>
            ))}
            {job.requiredSkills.length > 4 && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[11px] font-medium">
                +{job.requiredSkills.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs mt-2">
        <p className="text-slate-400">
          Deadline: {job.deadline ? formatDate(job.deadline) : "Open"}
          {isDeadlinePassed && (
            <span className="text-rose-500 font-semibold ml-1">(Expired)</span>
          )}
        </p>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {userRole === "candidate" && job.status === "active" && !showActions && (
            <Link
              to={`/candidate/jobs/${job._id}`}
              className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl text-xs font-semibold hover:from-indigo-700 hover:to-blue-700 transition-all shadow-xs"
            >
              Apply Now
            </Link>
          )}

          {showActions && (
            <>
              <Link
                to={`/employer/jobs/${job._id}`}
                className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold border border-indigo-200 transition-colors"
              >
                View
              </Link>
              <Link
                to={`/employer/jobs/edit/${job._id}`}
                className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
              >
                Edit
              </Link>
              {job.status === "active" ? (
                <button
                  type="button"
                  onClick={() => onClose?.(job._id)}
                  className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-semibold border border-amber-200 transition-colors cursor-pointer"
                >
                  Close
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onReopen?.(job._id)}
                  className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold border border-emerald-200 transition-colors cursor-pointer"
                >
                  Reopen
                </button>
              )}
              <button
                type="button"
                onClick={() => onDelete?.(job._id)}
                className="px-2.5 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-semibold border border-rose-200 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobCard;
