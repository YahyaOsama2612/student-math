import React, { useState } from "react";
import { useParams } from "react-router-dom";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loading";
import Errorpage from "@/components/Errorpage";

const Review = () => {
  const { attemptId } = useParams();
  const [expandedRow, setExpandedRow] = useState(null);

  const { data, loading, error } = useGet(
    `/api/user/diagnostic-exams/attempts/${attemptId}/review`
  );

  // 🔹 Handle different API shapes safely
  const questions = Array.isArray(data?.data?.data)
    ? data.data.data
    : Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data)
    ? data
    : [];

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  if (!questions.length) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500 font-medium">
        No review data found.
      </div>
    );
  }

  // ✅ استخدام isCorrect من الـ API مباشرة
  const correctQuestions = [];
  const incorrectQuestions = [];

  questions.forEach((q, index) => {
    if (q.isCorrect) {
      correctQuestions.push(index + 1);
    } else {
      incorrectQuestions.push(index + 1);
    }
  });

  const toggleExplanation = (index) => {
    setExpandedRow(expandedRow === index ? null : index);
  };

  const scrollToQuestion = (num) => {
    const el = document.getElementById(`question-${num}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setExpandedRow(num - 1);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* 🔥 Summary */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        
        {/* Correct */}
        <div className="flex-1 border border-green-200 bg-green-50 p-6 rounded-xl shadow-sm">
          <h3 className="text-green-800 font-bold text-lg mb-4">
            ✅ Correct ({correctQuestions.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {correctQuestions.map((num) => (
              <button
                key={num}
                onClick={() => scrollToQuestion(num)}
                className="w-12 h-12 rounded-lg bg-white border border-green-200 text-green-700 font-semibold shadow-sm hover:scale-105 transition"
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Incorrect */}
        <div className="flex-1 border border-red-200 bg-red-50 p-6 rounded-xl shadow-sm">
          <h3 className="text-red-800 font-bold text-lg mb-4">
            ❌ Incorrect ({incorrectQuestions.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {incorrectQuestions.map((num) => (
              <button
                key={num}
                onClick={() => scrollToQuestion(num)}
                className="w-12 h-12 rounded-lg bg-white border border-red-200 text-red-700 font-semibold shadow-sm hover:scale-105 transition"
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 🔥 Questions Cards بدل Table */}
      <div className="space-y-5">
        {questions.map((q, index) => {
          const isMCQ = q.answerType === "MCQ";
          const correctOption = q.correctAnswers?.[0];

          const isCorrect = q.isCorrect;

          const yourAnswer = isMCQ
            ? q.studentSubmittedMCQId
              ? isCorrect
                ? correctOption?.answerText
                : "Wrong Answer"
              : "Unanswered"
            : q.studentSubmittedGridInText || "Unanswered";

          const correctAnswer = isMCQ
            ? correctOption?.answerText
            : q.correctAnswers?.map((a) => a.answerText).join(" or ");

          return (
            <div
              key={q.questionId}
              id={`question-${index + 1}`}
              className={`p-5 rounded-xl border shadow-sm transition ${
                isCorrect
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg text-slate-800">
                  Question {index + 1}
                </h3>

                <span
                  className={`px-3 py-1 text-sm rounded-full font-medium ${
                    isCorrect
                      ? "bg-green-200 text-green-800"
                      : "bg-red-200 text-red-800"
                  }`}
                >
                  {isCorrect ? "Correct" : "Wrong"}
                </span>
              </div>

              {/* Question Text */}
              <div
                className="mb-4 text-slate-700"
                dangerouslySetInnerHTML={{ __html: q.questionText }}
              />

              {/* Image */}
              {q.questionImage && (
                <img
                  src={q.questionImage}
                  alt="question"
                  className="w-full max-w-md rounded-lg border mb-4"
                />
              )}

              {/* Answers */}
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-slate-600">
                    Your Answer:
                  </p>
                  <p
                    className={`mt-1 ${
                      yourAnswer === "Unanswered"
                        ? "text-gray-400"
                        : isCorrect
                        ? "text-green-700 font-medium"
                        : "text-red-600 font-medium"
                    }`}
                  >
                    {yourAnswer}
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-slate-600">
                    Correct Answer:
                  </p>
                  <p className="text-green-700 font-semibold mt-1">
                    {correctAnswer}
                  </p>
                </div>
              </div>

              {/* Button */}
              <button
                onClick={() => toggleExplanation(index)}
                className="mt-4 text-sm font-medium text-one hover:underline"
              >
                {expandedRow === index
                  ? "Hide explanation"
                  : "View explanation"}
              </button>

              {/* Explanation */}
              {expandedRow === index && (
                <div className="mt-4 p-4 bg-white border rounded-lg shadow-sm">
                  <h4 className="font-semibold mb-2 text-slate-700">
                    💡 Explanation
                  </h4>

                  {q.explanationContent?.pdf && (
                    <a
                      href={q.explanationContent.pdf}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-blue-600 underline mb-2"
                    >
                      📄 View PDF
                    </a>
                  )}

                  {q.explanationContent?.video && (
                    <video controls className="w-full rounded">
                      <source
                        src={q.explanationContent.video}
                        type="video/mp4"
                      />
                    </video>
                  )}

                  {!q.explanationContent?.pdf &&
                    !q.explanationContent?.video && (
                      <p className="text-gray-400 text-sm">
                        No explanation available.
                      </p>
                    )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Review;