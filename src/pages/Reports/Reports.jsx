import React, { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ReportsTabsHeader from "./ReportsTabsHeader";
import QuizReports from "./QuizReports";
import ExamReportsView from "./ExamReportsView";

/**
 * Unified Reports container supporting all 3 reports with their own designs:
 * 1. Quiz Reports (/user/reports/quizzes or /user/reports)
 * 2. Exam Reports (/user/reports/exams)
 * 3. Diagnostic Exam Reports (/user/reports/diagnostic-exam)
 */
const Reports = () => {
  const { type } = useParams();
  const location = useLocation();

  const activeTab = useMemo(() => {
    if (type === "exams") return "exams";
    if (type === "diagnostic-exam" || type === "diagnostic") return "diagnostic";
    if (type === "quizzes") return "quizzes";

    if (location.pathname.includes("/diagnostic-exam")) return "diagnostic";
    if (location.pathname.includes("/exams")) return "exams";
    return "quizzes";
  }, [type, location.pathname]);

  return (
    <div>
      {activeTab === "quizzes" && <QuizReports hideHeaderTab={false} />}
      {activeTab === "exams" && <ExamReportsView kind="exam" hideHeaderTab={false} />}
      {activeTab === "diagnostic" && <ExamReportsView kind="diagnostic" hideHeaderTab={false} />}
    </div>
  );
};

export default Reports;
