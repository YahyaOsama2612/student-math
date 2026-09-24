import React, { useEffect, useState } from "react";
import { Star, X, Send, AlertCircle, CheckCircle } from "lucide-react";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost";
import usePut from "@/hooks/usePut";
import Loading from "../../components/Loading";

const SessionRatingModal = ({
  sessionId,
  sessionName,
  onClose,
  onRatingSuccess,
}) => {
  // State for form inputs
  const [generalComment, setGeneralComment] = useState("");
  const [questionRatings, setQuestionRatings] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' or 'error'
  const [error, setError] = useState(null);

  // API hooks
  const { data: formData, loading: formLoading } = useGet(
    `/api/user/session-ratings/${sessionId}/form`,
  );
  const { postData } = usePost();
  const { putData } = usePut();

  // Initialize ratings with questions from API
  useEffect(() => {
    if (formData?.success && formData?.data?.data?.questions) {
      const apiQuestions = formData.data.data.questions;
      const existingRating = formData.data.data.existingRating;

      console.log("Questions loaded:", apiQuestions);
      console.log("Existing Rating:", existingRating);

      // Store questions
      setQuestions(apiQuestions);

      // Set general comment from existing rating if available
      if (existingRating?.generalComment) {
        setGeneralComment(existingRating.generalComment);
      }

      // Initialize question ratings from questions array
      const initialRatings = apiQuestions.map((question) => {
        // Find existing rating for this question if available
        const existingQuestionRating = existingRating?.questionRatings?.find(
          (qr) => qr.questionId === question.id,
        );

        return {
          questionId: question.id,
          rating: existingQuestionRating?.rating || 0, // 0-10 scale
          comment: existingQuestionRating?.comment || "",
        };
      });

      setQuestionRatings(initialRatings);
    }
  }, [formData]);

  // Handle rating change (1-10 scale)
  const handleRatingChange = (questionId, newRating) => {
    setQuestionRatings((prev) =>
      prev.map((item) =>
        item.questionId === questionId ? { ...item, rating: newRating } : item,
      ),
    );
  };

  // Handle comment change
  const handleCommentChange = (questionId, newComment) => {
    setQuestionRatings((prev) =>
      prev.map((item) =>
        item.questionId === questionId
          ? { ...item, comment: newComment }
          : item,
      ),
    );
  };

  // Calculate overall rating (average out of 10)
  const calculateOverallRating = () => {
    if (questionRatings.length === 0) return 0;
    const sum = questionRatings.reduce((acc, item) => acc + item.rating, 0);
    return Math.round((sum / questionRatings.length) * 10) / 10;
  };

  // Handle submit
  const handleSubmitRating = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Validate that all questions are rated
      if (questionRatings.some((item) => item.rating === 0)) {
        setError("Please rate all questions before submitting");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        generalComment: generalComment || null,
        ratings: questionRatings.map((item) => ({
          questionId: item.questionId,
          rating: item.rating,
          comment: item.comment || null,
        })),
      };

      console.log("Submitting payload:", payload);

      // Check if updating existing rating or creating new one
      const existingRatingId = formData?.data?.data?.existingRating?.id;

      if (existingRatingId) {
        // Update existing rating
        await putData(payload, `/api/user/session-ratings/${existingRatingId}`);
      } else {
        // Create new rating
        await postData(payload, `/api/user/session-ratings/${sessionId}`);
      }

      setSubmitStatus("success");
      setTimeout(() => {
        onRatingSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Submit error:", err);
      setError(err.message || "Failed to save rating");
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (formLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl w-full max-w-2xl p-8">
          <Loading />
        </div>
      </div>
    );
  }

  const overallRating = calculateOverallRating();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl my-8 shadow-2xl">
        {/* Header */}
        <div className="px-6 md:px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Rate Session</h2>
            <p className="text-sm text-slate-500 mt-1">{sessionName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Success Message */}
        {submitStatus === "success" && (
          <div className="px-6 md:px-8 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center gap-3 text-emerald-700">
            <CheckCircle size={20} />
            <span className="font-medium">Rating saved successfully! ✨</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="px-6 md:px-8 py-4 bg-red-50 border-b border-red-100 flex items-center gap-3 text-red-700">
            <AlertCircle size={20} />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Content */}
        <div className="px-6 md:px-8 py-6 space-y-8 max-h-[calc(100vh-300px)] overflow-y-auto">
          {/* Overall Rating Preview */}
          <div
            className="rounded-2xl p-6 border-2"
            style={{
              backgroundColor: "rgba(125, 10, 10, 0.08)",
              borderColor: "#7d0a0a",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-2">
                  Overall Rating
                </p>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-slate-900">
                    {overallRating}
                  </div>
                  <div className="text-lg text-slate-600">/10</div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">
                  Out of {questions.length} questions
                </p>
              </div>
            </div>
          </div>

          {/* Questions */}
          {questions.length > 0 ? (
            <div className="space-y-6">
              {questions.map((question, index) => {
                const currentRating = questionRatings.find(
                  (q) => q.questionId === question.id,
                );

                return (
                  <div key={question.id} className="space-y-3">
                    {/* Question Title */}
                    <div className="flex items-start gap-3">
                      <span
                        className="text-sm font-bold px-3 py-1 rounded-lg whitespace-nowrap"
                        style={{
                          color: "#7d0a0a",
                          backgroundColor: "rgba(125, 10, 10, 0.1)",
                        }}
                      >
                        Q {index + 1}
                      </span>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-800 text-base">
                          {question.title}
                        </h3>
                        {question.description && (
                          <p className="text-xs text-slate-500 mt-1">
                            {question.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Star Rating (1-10) */}
                    <div className="flex gap-2 items-center flex-wrap">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                          <button
                            key={star}
                            onClick={() =>
                              handleRatingChange(question.id, star)
                            }
                            className="transition-transform hover:scale-125 focus:outline-none active:scale-95"
                          >
                            <Star
                              size={24}
                              style={{
                                fill:
                                  star <= (currentRating?.rating || 0)
                                    ? "#7d0a0a"
                                    : "none",
                                color:
                                  star <= (currentRating?.rating || 0)
                                    ? "#7d0a0a"
                                    : "#cbd5e1",
                                cursor: "pointer",
                              }}
                              className={`${
                                star <= (currentRating?.rating || 0)
                                  ? ""
                                  : "hover:text-opacity-50"
                              }`}
                              onMouseEnter={(e) => {
                                if (star > (currentRating?.rating || 0)) {
                                  e.currentTarget.style.color = "#9ca3af";
                                }
                              }}
                            />
                          </button>
                        ))}
                      </div>
                      {currentRating?.rating > 0 && (
                        <span className="text-sm font-semibold text-slate-600 ml-2 bg-slate-100 px-3 py-1 rounded-lg">
                          {currentRating.rating}/10
                        </span>
                      )}
                    </div>

                    {/* Comment Input */}
                    <textarea
                      value={currentRating?.comment || ""}
                      onChange={(e) =>
                        handleCommentChange(question.id, e.target.value)
                      }
                      placeholder="Add your comment (optional)..."
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                      style={{ "--tw-ring-color": "#7d0a0a" }}
                      rows={2}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p>No questions to rate</p>
            </div>
          )}

          {/* General Comment */}
          {questions.length > 0 && (
            <div className="border-t pt-6">
              <label className="block text-sm font-bold text-slate-800 mb-2">
                General comment (optional)
              </label>
              <textarea
                value={generalComment}
                onChange={(e) => setGeneralComment(e.target.value)}
                placeholder="Share your overall feedback about the session..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                style={{ "--tw-ring-color": "#7d0a0a" }}
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 md:px-8 py-4 border-t border-slate-100 flex gap-3 bg-slate-50 rounded-b-3xl">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitRating}
            disabled={
              isSubmitting ||
              submitStatus === "success" ||
              questions.length === 0
            }
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 active:scale-[0.98]"
            style={{
              backgroundColor: "#7d0a0a",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#5a0707")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#7d0a0a")
            }
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Send size={18} />
                Submit Rating
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionRatingModal;
