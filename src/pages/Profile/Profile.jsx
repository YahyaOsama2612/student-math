import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import Icon from "@/components/portal/Icon";
import { Page, PageHead } from "@/components/portal/ui";
import { initials } from "@/lib/portal";
import { ErrorCard, money } from "@/pages/Purchases/parts/shop";
import RechargeModal from "@/pages/Wallet/RechargeModal";

/* My profile — account card (personal info, category / grade), balances, wallet and sign out. */

const Field = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
    <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">{value || "Not set"}</p>
  </div>
);

const Profile = () => {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useGet("/api/user/profile");
  const [recharge, setRecharge] = useState(false);
  const student = data?.data?.student;

  if (loading && !data) {
    return (
      <Page>
        <PageHead title="My profile" text="Your account details and balances." />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="skel h-72 lg:col-span-2"></div>
          <div className="skel h-72"></div>
        </div>
      </Page>
    );
  }
  if (error || !student) {
    return (
      <Page>
        <PageHead title="My profile" text="Your account details and balances." />
        <ErrorCard text={error} onRetry={refetch} />
      </Page>
    );
  }

  const live = Number(student.livebalance ?? 0);
  const liveTone = live <= 1 ? "text-red-600" : live <= 3 ? "text-amber-600" : "text-green-700";
  const tags = [student.category?.name, student.grade?.name].filter(Boolean);
  const signOut = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const link = (to, icon, label) => (
    <button onClick={() => navigate(to)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-one">
      <Icon name={icon} size={17} /> <span className="flex-1 text-left">{label}</span> <span className="text-slate-300">→</span>
    </button>
  );

  return (
    <Page>
      <PageHead title="My profile" text="Your account details and balances." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex flex-wrap items-center gap-4 pb-5 mb-5 border-b border-slate-100">
              {student.avatar
                ? <img src={student.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover border border-slate-200" />
                : <span className="w-16 h-16 rounded-2xl bg-[#FDECEC] text-one flex items-center justify-center text-xl font-extrabold">{initials(student.fullName)}</span>}
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-extrabold text-gray-900 truncate">{student.fullName}</h3>
                {student.nickname && <p className="text-xs font-extrabold text-one">{student.nickname}</p>}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {tags.length
                    ? tags.map((t) => <span key={t} className="pill bg-slate-100 text-slate-600">{t}</span>)
                    : <span className="pill bg-slate-100 text-slate-500">STUDENT</span>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              <Field label="Email" value={student.email} />
              <Field label="Phone" value={student.phone} />
              <Field label="Parent phone" value={student.parentphone} />
              <Field label="Grade" value={student.grade?.name || "Not assigned"} />
              <Field label="Category" value={student.category?.name} />
            </div>
          </section>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rp-kpi">
              <p className="rp-kpi-label">Live sessions left</p>
              <p className={`rp-kpi-value ${liveTone}`}>{live}</p>
              <p className="rp-kpi-sub">{live <= 3 ? <button className="font-bold text-one hover:underline" onClick={() => navigate("/user/payment")}>Buy more</button> : "In your packages"}</p>
            </div>
            <div className="rp-kpi">
              <p className="rp-kpi-label">Exams left</p>
              <p className="rp-kpi-value">{Number(student.exambalance ?? 0)}</p>
              <p className="rp-kpi-sub">From your packages</p>
            </div>
            <div className="rp-kpi">
              <p className="rp-kpi-label">Questions left</p>
              <p className="rp-kpi-value">{Number(student.questionbalance ?? 0)}</p>
              <p className="rp-kpi-sub">From your packages</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl s-hero text-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-white/75">Wallet balance</p>
                <p className="text-3xl font-extrabold tabular-nums">{money(student.wallet?.balance)}</p>
              </div>
              <span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><Icon name="wallet" size={20} /></span>
            </div>
            <p className="text-xs text-white/70 mt-1">Use it to pay at checkout in the Store.</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <button className="s-hero-btn solid" onClick={() => setRecharge(true)}>Add funds</button>
              <button className="s-hero-btn ghost" onClick={() => navigate("/user/wallet", { state: { scrollTo: "activity" } })}>Transaction history</button>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-2">
            {link("/user/mypurchases", "purchases", "My purchases")}
            {link("/user/wallet", "wallet", "Wallet")}
            {link("/user/promo", "promo", "Promo codes")}
            <div className="border-t border-slate-100 my-1"></div>
            <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50">
              <Icon name="logout" size={17} /> Sign out
            </button>
          </section>
        </div>
      </div>

      {recharge && (
        <RechargeModal
          onClose={() => setRecharge(false)}
          onDone={() => { setRecharge(false); refetch(); }}
        />
      )}
    </Page>
  );
};

export default Profile;
