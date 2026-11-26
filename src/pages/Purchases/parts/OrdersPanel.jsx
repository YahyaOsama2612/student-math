import { useMemo, useState } from "react";
import useGet from "@/hooks/useGet";
import { Kpi } from "@/components/portal/ui";
import { ErrorCard, KIND_LABEL, OrderPill, fmtDate, kindClass, egp as money } from "./shop"; // payments are recorded in EGP

/* Order history (GET /api/user/enrollment/my-purchases) — one row per payment, with its status.
   Used by "My purchases → Orders" and by /user/pendingpurchases. `names` maps a content id to its name. */

const statusOf = (p) => (p.paymentStatus === "completed" ? "completed" : p.paymentStatus === "rejected" ? "rejected" : "pending");

const TABS = [
  ["all", "All"],
  ["pending", "Awaiting approval"],
  ["completed", "Paid"],
  ["rejected", "Rejected"],
];

const exportCsv = (rows, nameOf) => {
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [["Date", "Order", "Type", "Item", "Plan", "Amount (EGP)", "Gateway", "Status", "Reason"]]
    .concat(rows.map((p) => [fmtDate(p.date), p.payment?.id || p.id, KIND_LABEL[p.type] || p.type, nameOf(p), p.pricePlan?.label || "", p.payment?.amount ?? 0, p.payment?.method || "", statusOf(p), p.payment?.reason || ""]))
    .map((r) => r.map(cell).join(","));
  const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "my-orders.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default function OrdersPanel({ names = {}, initialStatus = "all" }) {
  const [status, setStatus] = useState(initialStatus);
  const { data, loading, error, refetch } = useGet("/api/user/enrollment/my-purchases");
  const all = useMemo(() => data?.data?.purchases || [], [data]);

  const nameOf = (p) => names[p.details] || KIND_LABEL[p.type] || "Item";
  const count = (k) => (k === "all" ? all.length : all.filter((p) => statusOf(p) === k).length);
  const list = status === "all" ? all : all.filter((p) => statusOf(p) === status);

  const paid = all.filter((p) => statusOf(p) === "completed");
  const paidTotal = paid.reduce((a, p) => a + Number(p.payment?.amount || 0), 0);
  const waiting = count("pending");
  const byGate = {};
  paid.forEach((p) => {
    const k = p.payment?.method || "Other";
    byGate[k] = (byGate[k] || 0) + Number(p.payment?.amount || 0);
  });

  if (loading && !data) {
    return (
      <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">{[0, 1, 2, 3].map((i) => <div key={i} className="skel h-20"></div>)}</div>
        <div className="skel h-64"></div>
      </>
    );
  }
  if (error) return <ErrorCard text={error} onRetry={refetch} />;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Kpi label="Total paid" value={money(paidTotal)} sub={`${paid.length} order${paid.length === 1 ? "" : "s"} paid`} tone="green" />
        <Kpi label="Orders" value={all.length} sub="All your payments" />
        <Kpi label="Awaiting approval" value={waiting} sub={waiting ? "Unlocks after the admin confirms" : "Nothing pending"} tone={waiting ? "amber" : ""} />
        <Kpi label="Rejected" value={count("rejected")} sub="See the reason in the list" tone={count("rejected") ? "red" : ""} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap gap-2">
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setStatus(k)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold border ${status === k ? "bg-one text-white border-one" : "bg-white text-slate-600 border-slate-200 hover:border-one hover:text-one"}`}>
              {l} <span className={status === k ? "text-white/70" : "text-slate-400"}>{count(k)}</span>
            </button>
          ))}
        </div>
        {all.length > 0 && <button className="pl-btn" onClick={() => exportCsv(list, nameOf)}>Export CSV</button>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <section className="rp-card !p-0 overflow-hidden xl:col-span-3">
          <div className="overflow-x-auto">
            <table className="rp-table">
              <thead>
                <tr><th>Date</th><th>Item</th><th>Paid</th><th className="hidden sm:table-cell">Gateway</th><th>Status</th></tr>
              </thead>
              <tbody>
                {list.length ? list.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap">
                      <p className="font-semibold text-slate-900">{fmtDate(p.date)}</p>
                      <p className="text-xs text-slate-400">#{String(p.payment?.id || p.id).slice(0, 8)}</p>
                    </td>
                    <td className="min-w-[160px]">
                      <span className={kindClass(p.type)}>{KIND_LABEL[p.type] || p.type || "Item"}</span>
                      <p className="font-semibold text-slate-800 mt-1 leading-snug">{nameOf(p)}</p>
                      {p.pricePlan?.label && <p className="text-xs text-slate-400">{p.pricePlan.label}</p>}
                    </td>
                    <td>
                      <p className="font-extrabold text-slate-900 whitespace-nowrap">{money(p.payment?.amount)}</p>
                      <p className="sm:hidden text-[11px] text-slate-500 mt-1">{p.payment?.method || "—"}</p>
                    </td>
                    <td className="hidden sm:table-cell"><p className="font-semibold text-slate-800">{p.payment?.method || "—"}</p></td>
                    <td>
                      <div className="flex flex-col items-start gap-1.5">
                        <OrderPill status={p.paymentStatus} />
                        {p.payment?.reason && <p className="text-xs text-red-600 max-w-[220px]"><b>Reason:</b> {p.payment.reason}</p>}
                        {p.payment?.receipt && (
                          <a href={p.payment.receipt} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-one hover:underline">View receipt ↗</a>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="py-10 text-center text-slate-400">{all.length ? "No orders with this status." : "You have no orders yet."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <section className="rp-card">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Paid by gateway</h3>
          {Object.keys(byGate).length ? Object.entries(byGate).sort((a, b) => b[1] - a[1]).map(([g, v]) => (
            <div key={g} className="flex items-center justify-between gap-2 py-2 border-b border-slate-50">
              <span className="text-sm font-semibold text-slate-800">{g}</span>
              <span className="text-sm font-extrabold text-slate-900 whitespace-nowrap">{money(v)}</span>
            </div>
          )) : <p className="text-sm text-slate-400">No paid orders yet.</p>}
          <p className="text-[11px] text-slate-400 mt-3">Manual transfers unlock after the admin checks your receipt.</p>
        </section>
      </div>
    </>
  );
}
