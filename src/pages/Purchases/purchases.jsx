import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loading";
import Errorpage from "@/components/Errorpage";
import {
  ArrowLeft,
  BookOpen,
  User,
  GraduationCap,
  Lock,
  Unlock,
  CheckCircle2,
  Wallet,
  AlertCircle,
  Lightbulb,
} from "lucide-react";

const Purchases = () => {
  const navigate = useNavigate();
  // State to track which endpoint/tab is active
  const [activeTab, setActiveTab] = useState("courses");

  // Map tabs to their respective API endpoints
  const endpoints = {
    courses: "/api/user/courses/purchased",
    chapters: "/api/user/chapters/purchased",
    lessons: "/api/user/lessons/purchased",
  };

  // Fetch data dynamically based on the active tab
  const { data, loading, error } = useGet(endpoints[activeTab]);

  // Handle loading state
  if (loading) return <Loader />;

  // Handle error state
  if (error) return <Errorpage error={error} />;

  // Safe navigation down to the array items (fallback to empty array if nested data is missing)
  const items =
    data?.data?.courses || data?.data?.chapters || data?.data?.lessons || [];

  return (
    <div className="min-w-full min-h-screen p-6 bg-gray-50/50">
      {/* Header section with back button */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="p-2 transition-colors rounded-full hover:bg-gray-200"
          aria-label="Go back"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            My Purchase History
          </h1>
          <p className="text-sm text-gray-500">
            Access your active subscriptions and content
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex gap-2 p-1 mb-6 bg-gray-200/80 rounded-xl max-w-md">
        {Object.keys(endpoints).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all duration-200 ${
              activeTab === tab
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Display Grid */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white border border-dashed rounded-2xl border-gray-300">
          <AlertCircle className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-lg font-medium text-gray-700">
            No purchased {activeTab} found.
          </p>
          <p className="text-sm text-gray-400">
            Items you purchase will appear right here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const isExpired = new Date(item.expiresAt) < new Date();

            return (
              <div
                key={item.id || item.enrollmentId}
                className="flex flex-col justify-between p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  {/* Status Badges */}
                  <div className="flex justify-between items-start mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 capitalize">
                      <Wallet className="w-3.5 h-3.5" />
                      {item.status || "Active"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                        isExpired
                          ? "bg-red-50 text-red-700"
                          : "bg-green-50 text-green-700"
                      }`}
                    >
                      {isExpired ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        <Unlock className="w-3 h-3" />
                      )}
                      {isExpired ? "Expired" : "Access Active"}
                    </span>
                  </div>

                  {/* Title and Description */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {item.description || "No description provided."}
                  </p>

                  {/* Additional Metadata Details */}
                  <div className="space-y-2.5 border-t border-gray-100 pt-4 mb-6">
                    {item.preRequisition && item.preRequisition !== "None" && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <GraduationCap className="w-4 h-4 text-gray-400" />
                        <span>Prerequisite: {item.preRequisition}</span>
                      </div>
                    )}
                    {item.whatYouGain && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Lightbulb className="w-4 h-4 text-emerald-500" />
                        <span>Gain: {item.whatYouGain}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <CheckCircle2 className="w-4 h-4 text-gray-300" />
                      <span>
                        Purchased:{" "}
                        {new Date(item.purchasedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* View Action Button */}
                <button
                  disabled={isExpired}
                  onClick={() => {
                    // توجيه موحد لصفحة الـ contentdetails وبنمرر الـ id بتاع الكونتنت المختار علطول
                    navigate(`/user/contentdetails/${item.id}`, {
                      state: { contentType: activeTab }, // activeTab هنا بيكون إما (courses أو chapters أو lessons)
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-xl font-medium transition-colors text-sm"
                >
                  <BookOpen className="w-4 h-4" />
                  View Content
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Purchases;
