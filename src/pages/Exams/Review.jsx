import React, { useState } from "react";
import { useParams } from "react-router-dom";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loading";
import Errorpage from "@/components/Errorpage";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Review = () => {
  const { attemptId } = useParams();
  const [expandedRow, setExpandedRow] = useState(null);

  const { data, loading, error } = useGet(
    `/api/user/diagnostic-exams/attempts/${attemptId}/review`,
  );

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

  const getStudentAnswer = (q) => {
    const isMCQ = q.answerType === "MCQ";
    if (isMCQ) {
      return q.studentSubmittedMCQId
        ? q.isCorrect
          ? q.correctAnswers?.[0]?.answerText
          : "Wrong Answer"
        : "Unanswered";
    }
    return q.studentSubmittedGridInText || "Unanswered";
  };

  const getCorrectAnswer = (q) => {
    const isMCQ = q.answerType === "MCQ";
    return isMCQ
      ? q.correctAnswers?.[0]?.answerText
      : q.correctAnswers?.map((a) => a.answerText).join(" or ");
  };

  const downloadQuestionsReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Questions Report", 14, 15);
    autoTable(doc, {
      head: [["#", "Question"]],
      body: questions.map((q, index) => [
        index + 1,
        q.questionText.replace(/<[^>]*>/g, ""),
      ]),
      startY: 25,
    });
    doc.save(`questions-report-${attemptId}.pdf`);
  };

  const downloadQuestionsAnswersReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Questions & Answers Report", 14, 15);
    autoTable(doc, {
      head: [["#", "Question", "Student Answer", "Correct Answer", "Result"]],
      body: questions.map((q, index) => [
        index + 1,
        q.questionText.replace(/<[^>]*>/g, ""),
        getStudentAnswer(q),
        getCorrectAnswer(q),
        q.isCorrect ? "Correct" : "Wrong",
      ]),
      startY: 25,
      styles: { cellWidth: "wrap", overflow: "linebreak" },
      columnStyles: { 1: { cellWidth: 70 } },
    });
    doc.save(`questions-answers-report-${attemptId}.pdf`);
  };

  const downloadIncorrectWithRecap = () => {
    const doc = new jsPDF();
    doc.text("Incorrect Questions & Recommendations", 14, 15);
    autoTable(doc, {
      head: [["#", "Question", "Recap Lesson"]],
      body: questions
        .filter((q) => !q.isCorrect)
        .map((q, index) => [
          index + 1,
          q.questionText.replace(/<[^>]*>/g, ""),
          q.recommendationToRecap?.lessonName || "N/A",
        ]),
      startY: 25,
    });
    doc.save(`incorrect-recap-${attemptId}.pdf`);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={downloadQuestionsReport}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Download Questions
        </button>
        <button
          onClick={downloadQuestionsAnswersReport}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Download Q&A Report
        </button>
        <button
          onClick={downloadIncorrectWithRecap}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Export Incorrect & Recap
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
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

      <div className="space-y-5">
        {questions.map((q, index) => (
          <div
            key={q.questionId}
            id={`question-${index + 1}`}
            className={`p-5 rounded-xl border shadow-sm ${q.isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg text-slate-800">
                Question {index + 1}
              </h3>
              <span
                className={`px-3 py-1 text-sm rounded-full font-medium ${q.isCorrect ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}
              >
                {q.isCorrect ? "Correct" : "Wrong Answer"}
              </span>
            </div>

            <div
              className="mb-4 text-slate-700"
              dangerouslySetInnerHTML={{ __html: q.questionText }}
            />

            <button
              onClick={() => toggleExplanation(index)}
              className="mt-2 px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-all font-semibold shadow-md"
            >
              {expandedRow === index ? "Hide explanation" : "View explanation"}
            </button>

            {expandedRow === index && (
              <div className="mt-4 p-4 bg-white border rounded-lg shadow-inner">
                <h4 className="font-bold mb-3 text-slate-700 border-b pb-2">
                  💡 Explanation & Recap
                </h4>

                {q.explanationContent?.text && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase">
                      Explanation by Text
                    </p>
                    <p className="text-sm text-gray-700">
                      {q.explanationContent.text}
                    </p>
                  </div>
                )}
                {q.explanationContent?.image && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase">
                      Explanation by Image
                    </p>
                    <img
                      src={q.explanationContent.image}
                      className="w-full max-w-xs rounded border"
                    />
                  </div>
                )}
                {q.explanationContent?.video && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase">
                      Explanation by Video
                    </p>
                    <video controls className="w-full rounded">
                      <source
                        src={q.explanationContent.video}
                        type="video/mp4"
                      />
                    </video>
                  </div>
                )}
                {q.explanationContent?.pdf && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase">
                      Explanation by PDF
                    </p>
                    <a
                      href={q.explanationContent.pdf}
                      target="_blank"
                      className="block text-blue-600 underline"
                    >
                      View Document
                    </a>
                  </div>
                )}

                {q.recommendationToRecap && (
                  <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-100 text-sm">
                    <p className="font-bold text-blue-800">
                      Recommended Recap:
                    </p>
                    <p>Course: {q.recommendationToRecap.courseName}</p>
                    <p>Chapter: {q.recommendationToRecap.chapterName}</p>
                    <p>Lesson: {q.recommendationToRecap.lessonName}</p>
                  </div>
                )}

                {!q.explanationContent?.text &&
                  !q.explanationContent?.video &&
                  !q.explanationContent?.image &&
                  !q.explanationContent?.pdf &&
                  !q.recommendationToRecap && (
                    <p className="text-gray-400 text-sm">
                      No explanation available.
                    </p>
                  )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Review;
