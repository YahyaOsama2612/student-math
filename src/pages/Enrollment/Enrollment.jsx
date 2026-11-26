import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import { toast } from "react-hot-toast";
import usePost from "../../hooks/usePost";
import Icon from "@/components/portal/Icon";
import { useStudentData } from "@/context/StudentData";
import { EmptyCard, Page, PageHead } from "@/components/portal/ui";
import { ErrorCard, KIND_LABEL, PayMethods, PromoBox, ReceiptUpload, WALLET_METHOD as WALLET, WalletOption, money, egp, moneyBoth } from "@/pages/Payment/storeParts";
import { useCurrency } from "@/context/CurrencyContext";

/* Checkout (MathPortal design: renderCheckout) for the courses / chapters / lessons picked in the Store.
   Receives the selection in location.state and posts it to /api/user/enrollment/enroll. */

const KIND_OF_KEY = { courses: "course", chapters: "chapter", lessons: "lesson", packages: "package" };

const Enrollment = () => {
  const { code } = useCurrency(); // currency the prices are shown in
  const navigate = useNavigate();
  const { state } = useLocation();

  // what the previous page sent
  const itemToBuy = state || {};
  const { postData, loading: submitting } = usePost("/api/user/enrollment/enroll");
  const { data, loading, error } = useGet("/api/user/payment/payment-methods");
  const paymentMethods = data?.data?.paymentMethods || [];

  const [selectedMethod, setSelectedMethod] = useState(null);
  const [base64Image, setBase64Image] = useState(null);
  const [imageName, setImageName] = useState("");
  const [placed, setPlaced] = useState(false);
  const { profile, reloadProfile } = useStudentData();
  const balance = Number(profile?.wallet?.balance ?? 0);
  // read the balance fresh when checkout opens
  useEffect(() => { reloadProfile?.(); }, [reloadProfile]);

  // ---- Promo code ----
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState(null);
  const [appliedPromo, setAppliedPromo] = useState(null); // { code, discountAmount }
  const { postData: validatePromo, loading: validatingPromo } = usePost("/api/user/promo-codes/validate");

  // which backend key the items go under (courses / chapters / lessons / packages)
  const resolveApiKey = () => {
    if (itemToBuy.type === "chapterId" || itemToBuy.type === "chapterIds") return "chapters";
    if (itemToBuy.type === "lessonId" || itemToBuy.type === "lessonIds") return "lessons";
    if (itemToBuy.type === "packageId" || itemToBuy.type === "packageIds") return "packages";
    return "courses";
  };

  const getSelectedIds = () =>
    itemToBuy.selectedItems
      ?.map((item) => item.id || item.courseId || item.chapterId || item.lessonId || item.packageId)
      .filter(Boolean) || [];

  const buildPromoItems = () => {
    const keyMap = { courses: "courseIds", chapters: "chapterIds", lessons: "lessonIds", packages: "packageIds" };
    const items = { packageIds: [], courseIds: [], chapterIds: [], lessonIds: [] };
    items[keyMap[resolveApiKey()]] = getSelectedIds();
    return items;
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoError(null);
    try {
      const json = await validatePromo({ code: promoCode.trim().toUpperCase(), items: buildPromoItems() });
      if (json?.success) {
        setAppliedPromo({
          code: promoCode.trim().toUpperCase(),
          discountAmount: json?.data?.discountAmount ?? json?.discountAmount,
        });
        toast.success("Promo code applied!");
      } else {
        setPromoError(json?.error?.message || json?.message || "Invalid promo code");
      }
    } catch (err) {
      setPromoError(err.message || "This code couldn't be validated");
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode("");
    setPromoError(null);
  };

  const originalPrice = parseFloat(itemToBuy.price) || 0;
  const discountedPrice = appliedPromo
    ? originalPrice - (originalPrice * appliedPromo.discountAmount) / 100
    : originalPrice;

  // receipt image → base64 (manual methods)
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBase64Image(reader.result);
        setImageName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePayment = async () => {
    if (!selectedMethod) return toast.error("Please select a payment method");

    if (selectedMethod.type === "Manual" && !base64Image) {
      return toast.error("Please upload the transaction receipt");
    }

    // 1. backend key (courses / chapters / lessons) from the incoming type
    const apiKey = resolveApiKey();

    // 2. items as { id, priceId } — the plan id is the price id
    const formattedItems =
      itemToBuy.selectedItems
        ?.map((item) => ({
          id: item.id || item.courseId || item.chapterId || item.lessonId,
          priceId: item.planId,
        }))
        .filter((item) => item.id && item.priceId) || [];

    // 3. payload — wallet: taken from the balance now; automatic (Paymob): pay on the payment page;
    //    manual: transfer + screenshot, the admin approves
    const isWallet = selectedMethod.id === WALLET.id;
    const isAutomatic = selectedMethod.type === "Automatic";
    if (isWallet && balance < discountedPrice) {
      return toast.error(`Your wallet has ${egp(balance)} — top it up or pick another method`);
    }
    const payload = { [apiKey]: formattedItems };
    if (!isAutomatic) payload.paymentType = isWallet ? "wallet" : "manual";
    if (!isWallet) payload.paymentMethodId = selectedMethod.id;

    if (selectedMethod.type === "Manual") {
      payload.image = base64Image;
    }

    if (appliedPromo?.code) {
      payload.promoCode = appliedPromo.code;
    }

    try {
      const res = await postData(
        payload,
        isAutomatic ? "/api/user/enrollment/enroll/automatic" : null,
        isWallet ? "Paid from your wallet" : isAutomatic ? "Opening the payment page…" : "Enrollment request submitted successfully!",
      );

      const redirectUrl = res?.checkoutUrl || res?.paymentUrl || res?.data?.checkoutUrl || res?.data?.paymentUrl;

      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }

      if (isWallet) reloadProfile?.();
      setPlaced(true);
      setTimeout(() => {
        navigate(isWallet ? "/user/wallet" : "/user/home");
      }, isWallet ? 2500 : 1500);
    } catch (err) {
      console.error("Enrollment Error:", err.message);
    }
  };

  if (!state) {
    return (
      <Page>
        <EmptyCard
          title="Nothing to check out"
          text="Pick courses, chapters or lessons in the Store first."
          action={<button className="btn-primary !w-auto mx-auto" onClick={() => navigate("/user/payment")}>Open the Store</button>}
        />
      </Page>
    );
  }

  const kind = KIND_OF_KEY[resolveApiKey()];
  const items = itemToBuy.selectedItems && itemToBuy.selectedItems.length > 0 ? itemToBuy.selectedItems : null;
  const count = items ? items.length : 1;

  if (placed) {
    const paidNow = selectedMethod?.id === WALLET.id;
    return (
      <Page>
        <div className="max-w-2xl mx-auto">
          <section className="card p-8 text-center">
            <div className={`w-16 h-16 rounded-full ${paidNow ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"} flex items-center justify-center mx-auto mb-4`}><Icon name="check" size={30} /></div>
            <h2 className="text-2xl font-extrabold text-gray-900">{paidNow ? "Paid — your items are unlocked" : "Order placed"}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {paidNow
                ? <>{egp(discountedPrice)} was taken from your wallet. New balance: <b>{egp(balance)}</b>.</>
                : <>Your {selectedMethod?.name} request was sent. Your items unlock once the payment is confirmed.</>}
            </p>
            {!paidNow && <p className="text-lg font-extrabold text-gray-900 mt-3">{moneyBoth(discountedPrice)}</p>}
            <p className="text-xs text-slate-400 mt-4">{paidNow ? "Taking you to your wallet…" : "Taking you home…"}</p>
          </section>
        </div>
      </Page>
    );
  }

  return (
    <Page wide>
      <div className="max-w-6xl mx-auto">
        <PageHead title="Checkout" text={`Prices in ${code}${code !== "EGP" ? " — payments are made in EGP" : ""}. Choose one of the payment methods MathPortal has enabled.`}>
          <button className="btn-ghost" onClick={() => navigate(-1)}>← Continue shopping</button>
        </PageHead>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 flex flex-col gap-4">
            {/* 1. Items */}
            <section className="card p-6">
              <h3 className="font-extrabold text-gray-900 mb-2">1. Order items</h3>
              <div className="divide-y divide-slate-100">
                {items ? items.map((item, idx) => (
                  <div key={item.id || item.courseId || item.chapterId || item.lessonId || idx} className="flex items-start gap-3 py-3">
                    <span className={`kind-pill kind-${kind === "package" ? "sessions" : kind}`}>{KIND_LABEL[kind]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{item.courseName || item.chapterName || item.lessonName || item.name}</p>
                      {item.planLabel && <p className="text-xs text-slate-400">Access plan: {item.planLabel}</p>}
                    </div>
                    <p className="text-sm font-extrabold text-gray-900 whitespace-nowrap">{money(item.price)}</p>
                  </div>
                )) : (
                  <div className="flex items-start gap-3 py-3">
                    <span className={`kind-pill kind-${kind === "package" ? "sessions" : kind}`}>{KIND_LABEL[kind]}</span>
                    <p className="flex-1 text-sm font-bold text-gray-900">{itemToBuy.name || "Item Summary"}</p>
                    <p className="text-sm font-extrabold text-gray-900 whitespace-nowrap">{money(itemToBuy.price)}</p>
                  </div>
                )}
              </div>
            </section>

            {/* 2. Payment method */}
            <section className="card p-6">
              <h3 className="font-extrabold text-gray-900 mb-4">2. Payment method</h3>
              {/* wallet first: it pays instantly from the balance */}
              <WalletOption balance={balance} price={discountedPrice} selected={selectedMethod} onSelect={setSelectedMethod}
                onTopUp={() => navigate("/user/wallet", { state: { openRecharge: true } })} group="enroll-pay" />
              {loading || (!data && !error) ? <div className="skel h-24"></div> : error ? <ErrorCard text="Could not load the payment methods." /> : (
                <PayMethods methods={paymentMethods} selected={selectedMethod} onSelect={setSelectedMethod} group="enroll-pay" />
              )}

              {selectedMethod?.type === "Manual" && (
                <div className="mt-4 bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-600 mb-3">
                    Send <b>{egp(discountedPrice)}</b> with <b>{selectedMethod.name}</b>, then upload the screenshot of the transfer. The admin approves the payment and your items unlock.
                  </p>
                  <p className="text-xs font-bold text-slate-500 mb-1">Payment screenshot <span className="text-red-500">*</span></p>
                  <ReceiptUpload
                    value={base64Image}
                    fileName={imageName}
                    methodName={selectedMethod.name}
                    onPick={handleImageChange}
                    onRemove={() => { setBase64Image(null); setImageName(""); }}
                  />
                </div>
              )}
              {selectedMethod?.id === WALLET.id && (
                <p className="text-xs text-slate-500 mt-4 bg-slate-50 rounded-xl p-3">
                  {egp(discountedPrice)} is taken from your wallet now and your items unlock right away. You'll have {egp(Math.max(0, balance - discountedPrice))} left.
                </p>
              )}
              {selectedMethod?.type === "Automatic" && (
                <p className="text-xs text-slate-500 mt-4 bg-slate-50 rounded-xl p-3">
                  Instant payment. If this method needs a payment page, you are taken there to finish — your items unlock as soon as the payment is confirmed.
                </p>
              )}
            </section>
          </div>

          {/* Summary */}
          <aside className="lg:col-span-2">
            <section className="card p-6 lg:sticky lg:top-24">
              <h3 className="font-extrabold text-gray-900 mb-4">Order summary</h3>
              <PromoBox
                code={promoCode}
                setCode={setPromoCode}
                applied={appliedPromo}
                error={promoError}
                validating={validatingPromo}
                onApply={handleApplyPromo}
                onRemove={handleRemovePromo}
              />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal ({count} item{count === 1 ? "" : "s"})</span><span className="font-bold">{money(originalPrice)}</span></div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Discount{appliedPromo ? ` (${appliedPromo.discountAmount}%)` : ""}</span>
                  <span className={`font-bold ${appliedPromo ? "text-green-700" : ""}`}>{appliedPromo ? `− ${money(originalPrice - discountedPrice)}` : money(0)}</span>
                </div>
                <div className="flex justify-between items-baseline border-t border-slate-100 pt-3 mt-3">
                  <span className="font-extrabold text-gray-900">Total</span>
                  <span className="font-extrabold text-2xl text-gray-900">{money(discountedPrice)}</span>{code !== "EGP" && <span className="block text-xs font-bold text-slate-500 text-right">You pay {egp(discountedPrice)}</span>}
                </div>
              </div>
              <button className="btn-primary mt-5" onClick={handlePayment} disabled={submitting} style={submitting ? { opacity: 0.6 } : undefined}>
                {submitting ? "Processing…" : <><Icon name="wallet" size={18} /> Place order · {money(discountedPrice)}</>}
              </button>
            </section>
          </aside>
        </div>
      </div>
    </Page>
  );
};

export default Enrollment;
