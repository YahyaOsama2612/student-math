import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import { useStudentData } from "@/context/StudentData";
import { Kpi, Page, PageHead } from "@/components/portal/ui";
import { ErrorCard, fmtDate, money } from "@/pages/Purchases/parts/shop";
import RechargeModal from "./RechargeModal";

/* Wallet — balance, activity table and the recharge dialog.
   location.state { openRecharge: true } opens the dialog on arrival; { scrollTo: "activity" } jumps to the table. */

const TxnPill = ({ status }) => {
  if (!status) return <span className="text-xs text-slate-400">—</span>;
  if (status === "completed") return <span className="pill bg-green-100 text-green-700">COMPLETED</span>;
  if (status === "rejected") return <span className="pill bg-red-100 text-red-600">REJECTED</span>;
  return <span className="pill bg-amber-100 text-amber-700">{String(status).toUpperCase()}</span>;
};

const Wallet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, reloadProfile } = useStudentData();
  // the balance changes after purchases / recharges — read it fresh every time the page opens
  useEffect(() => { reloadProfile?.(); }, [reloadProfile]);
  const { data: transData, loading: transLoading, error: transError, refetch } = useGet("/api/user/wallet/transactions?page=1&limit=20");
  const [isModalOpen, setIsModalOpen] = useState(!!location.state?.openRecharge);
  const [status, setStatus] = useState("all");
  const activityRef = useRef(null);

  // don't reopen the dialog on a page refresh
  useEffect(() => {
    if (location.state?.openRecharge) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (location.state?.scrollTo === "activity" && transData) {
      activityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.state, transData]);

  const transactions = transData?.data?.transactions || [];
  const statuses = [...new Set(transactions.map((t) => t.paymentStatus).filter(Boolean))];
  const rows = status === "all" ? transactions : transactions.filter((t) => t.paymentStatus === status);
  const balance = profile?.wallet?.balance;
  const pending = transactions.filter((t) => t.paymentStatus && t.paymentStatus !== "completed" && t.paymentStatus !== "rejected");
  const pendingSum = pending.reduce((a, t) => a + Number(t.amount || 0), 0);

  return (
    <Page>
      <PageHead title="Wallet" text="Your balance pays for Store orders. Top it up online or by transfer.">
        <button className="pl-btn primary" onClick={() => setIsModalOpen(true)}>Recharge</button>
      </PageHead>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <section className="rounded-2xl s-hero text-white p-6 lg:col-span-2 flex flex-col justify-between gap-4">
          <div>
            <p className="text-sm text-white/75">Balance</p>
            {balance === undefined
              ? <div className="h-9 w-40 rounded-lg bg-white/20 mt-1"></div>
              : <p className="text-3xl font-extrabold tabular-nums">{money(balance)}</p>}
            <p className="text-xs text-white/70 mt-1">Use it to pay at checkout. Transfers are added after the admin checks your receipt.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="s-hero-btn solid" onClick={() => setIsModalOpen(true)}>Recharge</button>
            <button className="s-hero-btn ghost" onClick={() => navigate("/user/payment")}>Open the Store</button>
          </div>
        </section>
        <Kpi
          label="Waiting for approval"
          value={pending.length ? money(pendingSum) : "—"}
          sub={pending.length ? `${pending.length} request${pending.length === 1 ? "" : "s"} in your latest activity` : "No top-ups waiting"}
          tone={pending.length ? "amber" : ""}
        />
      </div>

      <div ref={activityRef} className="flex flex-wrap items-center justify-between gap-2 mb-3 scroll-mt-20">
        <h3 className="font-extrabold text-gray-900">Wallet activity <span className="text-slate-400 font-semibold text-sm">(latest 20)</span></h3>
        {statuses.length > 0 && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input !w-auto !py-1.5 text-xs" aria-label="Filter by status">
            <option value="all">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        )}
      </div>

      {transLoading && !transData ? <div className="skel h-48"></div> : transError ? <ErrorCard text={transError} onRetry={refetch} /> : (
        <section className="rp-card !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="rp-table">
              <thead>
                <tr><th>Date</th><th>Source</th><th>Amount</th><th>Status</th><th className="text-right">Receipt</th></tr>
              </thead>
              <tbody>
                {rows.length ? rows.map((t) => {
                  const out = t.type === "withdrawal";
                  return (
                    <tr key={t.id}>
                      <td className="whitespace-nowrap font-semibold text-slate-900">{fmtDate(t.createdAt)}</td>
                      <td>
                        <p className="font-semibold text-slate-800 capitalize">{t.source}</p>
                        <p className="text-xs text-slate-400 capitalize">{t.type}</p>
                      </td>
                      <td className={`font-extrabold whitespace-nowrap ${out ? "text-red-600" : "text-green-700"}`}>{out ? "−" : "+"}{money(t.amount)}</td>
                      <td>
                        <TxnPill status={t.paymentStatus} />
                        {t.paymentReason && <p className="text-xs text-red-600 mt-1 max-w-[220px]">{t.paymentReason}</p>}
                      </td>
                      <td className="text-right">
                        {t.paymentReceiptImg
                          ? <a href={t.paymentReceiptImg} target="_blank" rel="noreferrer" className="btn-mini">View</a>
                          : <span className="text-xs text-slate-300">—</span>}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={5} className="py-10 text-center text-slate-400">{transactions.length ? "No activity with this status." : "No wallet activity yet."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {isModalOpen && (
        <RechargeModal
          onClose={() => setIsModalOpen(false)}
          onDone={() => { setIsModalOpen(false); refetch(); }}
        />
      )}
    </Page>
  );
};

export default Wallet;
