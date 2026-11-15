import React from "react";
import { useLocation } from "react-router-dom";
import { reportTabFor } from "./ReportsTabsHeader";
import QuizReports from "./QuizReports";
import ExamReportsView from "./ExamReportsView";

/**
 * Reports entry (/user/reports). The route has no :type param, so the view is
 * picked from the pathname — /user/reports itself shows Subjects (quiz reports).
 * /user/reports/quizzes, /exams and /diagnostic-exam have their own routes.
 */
const Reports = () => {
  const { pathname } = useLocation();
  const tab = reportTabFor(pathname);

  if (tab === "exams") return <ExamReportsView kind="exam" />;
  if (tab === "diagnostic") return <ExamReportsView kind="diagnostic" />;
  return <QuizReports />;
};

export default Reports;
