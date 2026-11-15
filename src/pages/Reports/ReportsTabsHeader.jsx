import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Report switcher (design: Subjects | EXAM | Diagnose → .rp-seg).
export const REPORT_TABS = [
  { id: "quizzes", label: "Subjects", path: "/user/reports/quizzes" },
  { id: "exams", label: "EXAM", path: "/user/reports/exams" },
  { id: "diagnostic", label: "Diagnose", path: "/user/reports/diagnostic-exam" },
];

/** Which report a pathname shows: /user/reports and /user/reports/quizzes → quizzes. */
export const reportTabFor = (pathname = "") =>
  REPORT_TABS.find((t) => pathname.startsWith(t.path))?.id || "quizzes";

export const ReportsTabsHeader = ({ activeTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentTab = activeTab || reportTabFor(location.pathname);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1" role="tablist" aria-label="Reports">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={currentTab === tab.id}
            onClick={() => currentTab !== tab.id && navigate(tab.path)}
            className={`rp-seg ${currentTab === tab.id ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ReportsTabsHeader;
