import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FileText, Award, Activity } from "lucide-react";

export const REPORT_TABS = [
  {
    id: "quizzes",
    label: "Quiz Reports",
    path: "/user/reports/quizzes",
    icon: FileText,
  },
  {
    id: "exams",
    label: "Exam Reports",
    path: "/user/reports/exams",
    icon: Award,
  },
  {
    id: "diagnostic",
    label: "Diagnostic Exam",
    path: "/user/reports/diagnostic-exam",
    icon: Activity,
  },
];

export const ReportsTabsHeader = ({ activeTab }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // If activeTab is not explicitly passed, determine from pathname
  const currentTab =
    activeTab ||
    REPORT_TABS.find((t) => location.pathname.startsWith(t.path))?.id ||
    (location.pathname === "/user/reports" ? "quizzes" : "quizzes");

  return (
    <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
      {REPORT_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => navigate(tab.path)}
            className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-bold transition-all border-b-2 -mb-[2px] ${
              isActive
                ? "border-[#7d0a0a] text-[#7d0a0a]"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <Icon size={16} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ReportsTabsHeader;
