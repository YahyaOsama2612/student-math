import React, { useEffect, useState } from "react";
import {
  Star,
  Calendar,
  Clock,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import useGet from "@/hooks/useGet";
import Loading from "../../components/Loading";
import Errorpage from "../../components/Errorpage";
import AOS from "aos";
import "aos/dist/aos.css";

const SessionRatingsHistory = () => {
  const { data, loading, error, refetch } = useGet("/api/user/session-ratings");
  const [expandedRating, setExpandedRating] = useState(null);

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      easing: "ease-out-quad",
    });
  }, []);

  if (error) {
    return <Errorpage />;
  }

  const evaluations = data?.data?.data?.evaluations || [];
  const averageRating = data?.data?.data?.averageRating || 0;
  const totalSessionsEvaluated = data?.data?.data?.totalSessionsEvaluated || 0;

  const renderStars = (rating) => {
    const maxStars = 10;
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
          <Star
            key={star}
            size={16}
            style={{
              fill:
                star <= Math.ceil((rating / maxStars) * 10)
                  ? "#7d0a0a"
                  : "none",
              color:
                star <= Math.ceil((rating / maxStars) * 10)
                  ? "#7d0a0a"
                  : "#cbd5e1",
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      {totalSessionsEvaluated > 0 && (
        <div
          className="rounded-2xl p-6 border-2"
          style={{
            backgroundColor: "rgba(125, 10, 10, 0.08)",
            borderColor: "#7d0a0a",
          }}
          data-aos="fade-up"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-slate-600 font-medium mb-1">
                Overall Average
              </p>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-slate-900">
                  {averageRating}
                </span>
                <span className="text-sm text-slate-600">/10</span>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-600 font-medium mb-1">
                Sessions Rated
              </p>
              <p className="text-3xl font-bold text-slate-900">
                {totalSessionsEvaluated}
              </p>
            </div>

            <div className="col-span-2 md:col-span-1">
              <p className="text-xs text-slate-600 font-medium mb-2">Summary</p>
              <p className="text-sm text-slate-700 font-medium">
                Excellent rating performance! ⭐
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-8">
          <Loading />
        </div>
      )}

      {/* Empty State */}
      {!loading && evaluations.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 rounded-2xl"
          data-aos="fade-up"
        >
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <Star className="text-slate-300" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">
            No Ratings Yet
          </h3>
          <p className="text-slate-500 max-w-xs">
            Your session ratings will appear here after you complete and rate
            sessions
          </p>
        </div>
      )}

      {/* Ratings List */}
      {!loading && evaluations.length > 0 && (
        <div className="space-y-4">
          {evaluations.map((evaluation, index) => (
            <div
              key={evaluation.id}
              data-aos="fade-up"
              data-aos-delay={index * 50}
              className="bg-white border border-slate-100 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Header - Clickable */}
              <button
                onClick={() =>
                  setExpandedRating(
                    expandedRating === evaluation.id ? null : evaluation.id,
                  )
                }
                className="w-full text-left px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-slate-900 line-clamp-1">
                        {evaluation.sessionName}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Instructor: {evaluation.teacherName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>
                        {new Date(evaluation.sessionDate).toLocaleDateString(
                          "en-US",
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>
                        {evaluation.timeFrom} - {evaluation.timeTo}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rating Badge */}
                <div className="flex items-center gap-3 ml-4">
                  <div className="text-right">
                    <div className="flex gap-0.5 mb-1 justify-end">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                        <Star
                          key={star}
                          size={12}
                          style={{
                            fill:
                              star <=
                              Math.ceil((evaluation.overallRating / 10) * 10)
                                ? "#7d0a0a"
                                : "none",
                            color:
                              star <=
                              Math.ceil((evaluation.overallRating / 10) * 10)
                                ? "#7d0a0a"
                                : "#cbd5e1",
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      {evaluation.overallRating}/10
                    </span>
                  </div>
                  {expandedRating === evaluation.id ? (
                    <ChevronUp size={20} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={20} className="text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded Content */}
              {expandedRating === evaluation.id && (
                <div className="px-6 py-5 bg-slate-50 border-t border-slate-100 space-y-5">
                  {/* General Comment */}
                  {evaluation.generalComment && (
                    <div className="bg-white rounded-xl p-4 border border-slate-100">
                      <div className="flex items-start gap-2 mb-2">
                        <MessageCircle
                          size={16}
                          className="mt-1"
                          style={{ color: "#7d0a0a" }}
                        />
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                          General Comment
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {evaluation.generalComment}
                      </p>
                    </div>
                  )}

                  {/* Question Ratings */}
                  {evaluation.questionRatings?.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Question Ratings
                      </p>
                      {evaluation.questionRatings.map((qRating) => (
                        <div
                          key={qRating.id}
                          className="bg-white rounded-xl p-4 border border-slate-100 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-slate-800 text-sm">
                                {qRating.questionTitle}
                              </h4>
                              <p className="text-xs text-slate-500 mt-1">
                                Category: {qRating.questionCategory}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                {qRating.rating}/10
                              </span>
                            </div>
                          </div>

                          {qRating.comment && (
                            <p className="text-xs text-slate-600 pt-2 border-t border-slate-100">
                              💬 {qRating.comment}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="pt-3 border-t border-slate-200 text-xs text-slate-500">
                    <p>
                      Rated on:{" "}
                      {new Date(evaluation.createdAt).toLocaleDateString(
                        "en-US",
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionRatingsHistory;
