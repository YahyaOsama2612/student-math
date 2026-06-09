import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import Loader from "@/components/Loading";
import Errorpage from "@/components/Errorpage";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Wallet,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const PendingPurchases = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("pending");

  // Fetching data using your custom hook
  const { data, loading, error, refetch } = useGet(
    "/api/user/enrollment/my-purchases",
  );

  if (loading) return <Loader />;
  if (error) return <Errorpage error={error} refetch={refetch} />;

  const allPurchases = data?.data?.purchases || [];

  // تصنيف المشتريات بناءً على الـ paymentStatus
  const categorizedPurchases = {
    pending: allPurchases.filter(
      (p) => p.paymentStatus !== "completed" && p.paymentStatus !== "rejected",
    ),
    completed: allPurchases.filter((p) => p.paymentStatus === "completed"),
    rejected: allPurchases.filter((p) => p.paymentStatus === "rejected"),
  };

  const currentPurchases = categorizedPurchases[activeTab] || [];

  // إعدادات التابات
  const tabsConfig = [
    {
      id: "pending",
      label: "Pending",
      color: "bg-amber-100 text-amber-800 border-amber-200",
    },
    {
      id: "completed",
      label: "Completed",
      color: "bg-green-100 text-green-800 border-green-200",
    },
    {
      id: "rejected",
      label: "Rejected",
      color: "bg-red-100 text-red-800 border-red-200",
    },
  ];

  // دالة لتحديد شكل شارة الحالة داخل الكارت
  const getStatusBadge = (status) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200 uppercase">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            Success
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200 uppercase">
            <XCircle className="w-3.5 h-3.5 text-red-500" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      {/* Header section */}
      <div className="max-w-5xl mx-auto mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          My Purchases
        </h1>
        <p className="text-gray-500 mt-1">
          Track the status of your orders, subscriptions, and payment
          verifications.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="flex border-b border-gray-200 gap-2">
          {tabsConfig.map((tab) => {
            const count = categorizedPurchases[tab.id].length;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 px-4 font-medium text-sm transition-all relative flex items-center gap-2 ${
                  isActive
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${tab.color}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto">
        {currentPurchases.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              No {activeTab} purchases
            </h3>
            <p className="text-gray-500">
              You don't have any items in this section right now.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {currentPurchases.map((purchase) => (
              <div
                key={purchase.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between transition-all hover:shadow-md"
              >
                {/* Card Top / Details */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    {getStatusBadge(purchase.paymentStatus)}
                  </div>

                  {/* حماية الكود من القيم الفارغة details?.name */}
                  <h3 className="text-xl font-bold text-gray-900 mb-1 truncate">
                    {purchase.details?.name ||
                      `Purchase ID: #${purchase.id.slice(0, 8)}`}
                  </h3>

                  <p className="text-sm font-medium text-blue-600 mb-4">
                    Type:{" "}
                    <span className="capitalize">{purchase.type || "N/A"}</span>
                    {purchase.pricePlan?.label &&
                      ` (${purchase.pricePlan.label})`}
                  </p>

                  <hr className="border-gray-100 my-4" />

                  {/* Pricing and Date breakdown */}
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-gray-400" />
                      <span>
                        Paid{" "}
                        <strong>{purchase.payment?.amount || 0} EGP</strong> via{" "}
                        {purchase.payment?.method || "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>
                        Requested:{" "}
                        {purchase.date
                          ? new Date(purchase.date).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )
                          : "N/A"}
                      </span>
                    </div>

                    {/* عرض سبب الرفض من الأدمن إن وُجد */}
                    {purchase.payment?.reason && (
                      <div className="mt-2 p-2 bg-red-50 text-red-700 rounded-lg text-xs border border-red-100">
                        <strong>Reason:</strong> {purchase.payment.reason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom / Action Attachment */}
                {purchase.payment?.receipt && (
                  <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">
                      Payment Proof Attached
                    </span>
                    <a
                      href={purchase.payment.receipt}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      View Receipt
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingPurchases;
