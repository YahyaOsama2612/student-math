import React, { useState } from "react";
import {
  TicketPercent,
  Calendar,
  Copy,
  Check,
  Loader2,
  XCircle,
} from "lucide-react";
import useGet from "../../hooks/useGet";

const getStatus = (startDate, endDate) => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

  if (now < start) return { label: "Upcoming", tone: "upcoming" };
  if (now > end) return { label: "Expired", tone: "expired" };
  if (daysLeft <= 3) return { label: `Expires in ${daysLeft}d`, tone: "soon" };
  return { label: "Active", tone: "active" };
};

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  soon: "bg-amber-50 text-amber-700 ring-amber-600/20",
  upcoming: "bg-sky-50 text-sky-700 ring-sky-600/20",
  expired: "bg-gray-100 text-gray-500 ring-gray-400/20",
};

const CopyChip = ({ code }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available, ignore */
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 font-mono text-xs tracking-wide bg-gray-900 text-white px-2.5 py-1 rounded-lg hover:bg-gray-800 transition-colors"
      title="Copy code"
    >
      {code}
      {copied ? (
        <Check size={13} className="text-emerald-400" />
      ) : (
        <Copy size={13} className="opacity-70" />
      )}
    </button>
  );
};

const PromoCard = ({ promo }) => {
  const status = getStatus(promo.startDate, promo.endDate);
  return (
    <div className="p-5 bg-white/70 backdrop-blur-lg border border-white/40 rounded-3xl shadow-md hover:shadow-xl transition-all duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="w-11 h-11 shrink-0 flex items-center justify-center bg-gradient-to-br from-one/20 to-one/5 border border-one/20 rounded-2xl">
          <TicketPercent className="text-one w-5 h-5" />
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset ${statusStyles[status.tone]}`}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-4">
        <h3 className="text-lg font-bold text-gray-900">{promo.promoName}</h3>
        <p className="text-sm text-gray-500 capitalize">{promo.type} promo</p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <CopyChip code={promo.code} />
        <span className="text-2xl font-extrabold text-one">
          {promo.discountAmount}
          <span className="text-sm font-semibold align-top">%</span>
        </span>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200/70 flex items-center gap-1.5 text-xs text-gray-500">
        <Calendar size={13} />
        {new Date(promo.startDate).toLocaleDateString()} –{" "}
        {new Date(promo.endDate).toLocaleDateString()}
      </div>
    </div>
  );
};

const PromoPage = () => {
  const { data, loading, error } = useGet("/api/user/promo-codes");
  const promoCodes = data?.data?.promoCodes || [];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-one/20 to-one/5 border border-one/20 rounded-2xl">
          <TicketPercent className="text-one w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promo Codes</h1>
          <p className="text-sm text-gray-500">
            Browse available offers — apply one at checkout
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading promo codes...
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <XCircle size={16} />
          {error}
        </div>
      )}

      {!loading && !error && promoCodes.length === 0 && (
        <div className="text-center text-gray-400 border-2 border-dashed border-gray-300 rounded-3xl py-12">
          No promo codes available right now
        </div>
      )}

      {!loading && promoCodes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {promoCodes.map((p) => (
            <PromoCard key={p.id} promo={p} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PromoPage;
