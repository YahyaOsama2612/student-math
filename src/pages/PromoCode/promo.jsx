import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useGet from "../../hooks/useGet";
import { Page, PageHead } from "@/components/portal/ui";
import { ErrorCard, fmtDate } from "@/pages/Purchases/parts/shop";

/* Promo codes available to the student — copy one and apply it at checkout. */

const getStatus = (startDate, endDate) => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

  if (now < start) return { label: "UPCOMING", cls: "bg-sky-50 text-sky-700" };
  if (now > end) return { label: "EXPIRED", cls: "bg-slate-100 text-slate-500" };
  if (daysLeft <= 3) return { label: `ENDS IN ${daysLeft}D`, cls: "bg-amber-100 text-amber-700" };
  return { label: "ACTIVE", cls: "bg-green-100 text-green-700" };
};

const CopyButton = ({ code }) => {
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
    <button onClick={handleCopy} className={`btn-mini shrink-0 ${copied ? "ok" : ""}`} title="Copy code">
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
};

const PromoPage = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useGet("/api/user/promo-codes");
  const promoCodes = data?.data?.promoCodes || [];

  return (
    <Page>
      <PageHead title="Promo codes" text="Offers you can use — copy a code and apply it at checkout.">
        <button className="pl-btn primary" onClick={() => navigate("/user/payment")}>Open the Store</button>
      </PageHead>

      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skel h-24"></div>)}</div>
      ) : error ? (
        <ErrorCard text={error} onRetry={refetch} />
      ) : promoCodes.length === 0 ? (
        <section className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <p className="text-lg font-extrabold text-gray-900 mb-1">No promo codes right now</p>
          <p className="text-sm text-slate-500">When an offer is available for you, it shows up here.</p>
        </section>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {promoCodes.map((p) => {
            const st = getStatus(p.startDate, p.endDate);
            return (
              <section key={p.id} className="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4">
                <span className="w-14 h-14 rounded-xl bg-[#FDECEC] text-one flex flex-col items-center justify-center shrink-0">
                  <span className="text-lg font-extrabold leading-none">{p.discountAmount}%</span>
                  <span className="text-[9px] font-extrabold tracking-wider mt-0.5">OFF</span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-gray-900 tracking-wider font-mono">{p.code}</b>
                    <span className={`pill ${st.cls}`}>{st.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 truncate">{p.promoName}</p>
                  <p className="text-xs text-slate-400">
                    {p.type === "restricted" ? "Just for you" : "For everyone"} · {fmtDate(p.startDate)} – {fmtDate(p.endDate)}
                  </p>
                </div>
                <CopyButton code={p.code} />
              </section>
            );
          })}
        </div>
      )}
    </Page>
  );
};

export default PromoPage;
