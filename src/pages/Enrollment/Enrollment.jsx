import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useGet from "@/hooks/useGet";
import {
  ArrowLeft,
  CreditCard,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Wallet,
  Tag,
  TicketPercent,
  Loader2,
  X,
} from "lucide-react";
import Loader from "@/components/Loading";
import Errorpage from "@/components/Errorpage";
import { toast } from "react-hot-toast";
import usePost from "../../hooks/usePost";

const Enrollment = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  // البيانات المستلمة من الصفحات السابقة
  const itemToBuy = state || {};
  const { postData, loading: submitting } = usePost(
    "/api/user/enrollment/enroll",
  );
  const { data, loading, error } = useGet("/api/user/payment/payment-methods");
  const paymentMethods = data?.data?.paymentMethods || [];

  const [selectedMethod, setSelectedMethod] = useState(null);
  const [base64Image, setBase64Image] = useState(null);

  // ---- Promo code state ----
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState(null);
  const [appliedPromo, setAppliedPromo] = useState(null); // { code, discountAmount }
  const { postData: validatePromo, loading: validatingPromo } = usePost(
    "/api/user/promo-codes/validate",
  );

  // نفس منطق تحديد نوع العنصر المستخدم في handlePayment، لكن بيتحسب هنا كمان
  // عشان نقدر نبني الـ items payload بتاع الـ promo code بنفس القيم الحقيقية
  const resolveApiKey = () => {
    if (itemToBuy.type === "chapterId" || itemToBuy.type === "chapterIds") {
      return "chapters";
    }
    if (itemToBuy.type === "lessonId" || itemToBuy.type === "lessonIds") {
      return "lessons";
    }
    if (itemToBuy.type === "packageId" || itemToBuy.type === "packageIds") {
      return "packages";
    }
    return "courses";
  };

  const getSelectedIds = () =>
    itemToBuy.selectedItems
      ?.map(
        (item) =>
          item.id ||
          item.courseId ||
          item.chapterId ||
          item.lessonId ||
          item.packageId,
      )
      .filter(Boolean) || [];

  const buildPromoItems = () => {
    const keyMap = {
      courses: "courseIds",
      chapters: "chapterIds",
      lessons: "lessonIds",
      packages: "packageIds",
    };
    const items = {
      packageIds: [],
      courseIds: [],
      chapterIds: [],
      lessonIds: [],
    };
    items[keyMap[resolveApiKey()]] = getSelectedIds();
    return items;
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoError(null);
    try {
      const json = await validatePromo({
        code: promoCode.trim().toUpperCase(),
        items: buildPromoItems(),
      });
      if (json?.success) {
        setAppliedPromo({
          code: promoCode.trim().toUpperCase(),
          discountAmount: json?.data?.discountAmount ?? json?.discountAmount,
        });
        toast.success("Promo code applied!");
      } else {
        setPromoError(
          json?.error?.message || json?.message || "Invalid promo code",
        );
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

  // تحويل الصورة لـ Base64 في حالة الدفع اليدوي
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBase64Image(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handlePayment = async () => {
    if (!selectedMethod) return toast.error("Please select a payment method");

    if (selectedMethod.type === "Manual" && !base64Image) {
      return toast.error("Please upload the transaction receipt");
    }

    // 1. تحديد المفتاح المناسب للباك-إند (courses أو chapters أو lessons) بناءً على الـ type القادم
    const apiKey = resolveApiKey();

    // 2. تشكيل مصفوفة العناصر بالصيغة الهيكلية التي يطلبها الباك-إند: { id, priceId }
    // نقوم بفحص item.id أو item.courseId / item.chapterId / item.lessonId لضمان جلب الـ ID بشكل صحيح مهما كان مصدر الصفحة
    const formattedItems =
      itemToBuy.selectedItems
        ?.map((item) => ({
          id: item.id || item.courseId || item.chapterId || item.lessonId,
          priceId: item.planId, // الـ planId هو الـ priceId المطلوب من الباك-إند
        }))
        .filter((item) => item.id && item.priceId) || [];

    // 3. بناء الـ Payload النهائي ومطابقته لطلب الباك-إند تماماً
    const payload = {
      paymentType:
        selectedMethod.type.toLowerCase() === "automatic" ? "wallet" : "manual",
      [apiKey]: formattedItems, // تمرير المصفوفة المهيكلة (id و priceId) داخل المفتاح الديناميكي
    };

    // إرسال الـ paymentMethodId
    if (selectedMethod.id) {
      payload.paymentMethodId = selectedMethod.id;
    }

    // إضافة الصورة في حالة الدفع اليدوي
    if (selectedMethod.type === "Manual") {
      payload.image = base64Image;
    }

    // تمرير كود الخصم لو اتطبق
    if (appliedPromo?.code) {
      payload.promoCode = appliedPromo.code;
    }

    try {
      await postData(
        payload,
        null,
        "Enrollment request submitted successfully!",
      );
      setTimeout(() => {
        navigate("/user/home");
      }, 1500);
    } catch (err) {
      console.error("Enrollment Error:", err.message);
    }
  };

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 mb-8 hover:text-one transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* سيكشن ملخص الطلب */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Checkout</h2>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Order Summary
            </h3>

            {/* 1. لو البيانات جاية في مصفوفة تفصيلية */}
            {itemToBuy.selectedItems && itemToBuy.selectedItems.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1 mb-4">
                {itemToBuy.selectedItems.map((item, idx) => {
                  const displayName =
                    item.courseName ||
                    item.chapterName ||
                    item.lessonName ||
                    item.name;

                  return (
                    <div
                      key={item.id || idx}
                      className="flex justify-between items-start gap-4 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block font-bold text-gray-800 text-sm truncate">
                          {displayName}
                        </span>

                        {/* عرض خطة السعر المحددة */}
                        {item.planLabel && (
                          <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-one/10 text-one text-[10px] font-black rounded-md">
                            <Tag className="w-3 h-3" /> {item.planLabel}
                          </span>
                        )}
                      </div>
                      <span className="font-extrabold text-gray-900 text-sm shrink-0">
                        {item.price} LE
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* 2. حالة احتياطية fallback */
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl mb-4 border border-gray-100">
                <span className="text-gray-800 font-bold text-sm">
                  {itemToBuy.name || "Item Summary"}
                </span>
                <span className="font-extrabold text-gray-900 text-sm">
                  {itemToBuy.price} LE
                </span>
              </div>
            )}

            {/* المجموع الكلي */}
            <div className="pt-4 border-t border-dashed mt-4 flex justify-between items-center text-lg">
              <span className="font-bold text-gray-700">Total Amount</span>
              <span className="flex items-baseline gap-2">
                {appliedPromo && (
                  <span className="text-sm text-gray-400 line-through">
                    {originalPrice} LE
                  </span>
                )}
                <span className="font-black text-one text-xl">
                  {discountedPrice.toFixed(2)} LE
                </span>
              </span>
            </div>
          </div>

          {/* كود الخصم */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
              <TicketPercent className="w-4 h-4 text-one" /> Promo Code
            </h3>

            {appliedPromo ? (
              <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <div className="flex items-center gap-2 text-emerald-800 text-sm font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  {appliedPromo.code} applied — {appliedPromo.discountAmount}%
                  off
                </div>
                <button
                  onClick={handleRemovePromo}
                  className="text-emerald-700 hover:text-emerald-900"
                  title="Remove promo code"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <div className="flex gap-2">
                  <input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter promo code"
                    className="flex-1 font-mono tracking-wide px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-one/40 focus:border-one/40"
                  />
                  <button
                    onClick={handleApplyPromo}
                    disabled={validatingPromo || !promoCode.trim()}
                    className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {validatingPromo && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    Apply
                  </button>
                </div>
                {promoError && (
                  <p className="mt-2 text-xs text-red-600">{promoError}</p>
                )}
              </div>
            )}
          </div>

          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              For manual methods like <b>Vodafone Cash</b>, please upload a
              screenshot of the transaction after transferring the amount.
            </p>
          </div>
        </div>

        {/* سيكشن اختيار وسيلة الدفع */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-one" /> Payment Methods
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setSelectedMethod(method)}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                  selectedMethod?.id === method.id
                    ? "border-one bg-one/5 shadow-md shadow-one/5"
                    : "border-gray-50 bg-gray-50/50 hover:border-gray-200"
                }`}
              >
                <div className="flex items-center gap-4">
                  <img
                    src={method.logo}
                    alt={method.name}
                    className="w-10 h-10 rounded-xl object-cover border bg-white"
                  />
                  <div className="text-left">
                    <span className="block font-bold text-gray-800">
                      {method.name}
                    </span>
                    <span className="text-xs text-gray-400">{method.type}</span>
                  </div>
                </div>
                {selectedMethod?.id === method.id && (
                  <CheckCircle2 className="w-5 h-5 text-one" />
                )}
              </button>
            ))}
          </div>

          {/* رفع إيصال التحويل للمانويال */}
          {selectedMethod?.type === "Manual" && (
            <div className="mt-6 space-y-3 animate-in fade-in duration-200">
              <label className="text-sm font-bold text-gray-700 block">
                Upload Transfer Receipt
              </label>
              <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-6 hover:bg-gray-50 transition-colors text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {base64Image ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={base64Image}
                      className="w-24 h-24 object-cover rounded-lg mb-2 shadow-sm"
                      alt="Preview"
                    />
                    <span className="text-xs text-one font-bold">
                      Change Image
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <UploadCloud className="w-10 h-10 mb-2" />
                    <span className="text-sm">Click to upload screenshot</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={submitting}
            className={`w-full py-4 rounded-2xl font-bold text-white text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${
              submitting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-one hover:scale-[1.01] active:scale-95 shadow-one/20"
            }`}
          >
            {submitting ? (
              "Processing..."
            ) : (
              <>
                <Wallet className="w-5 h-5" /> Confirm Enrollment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Enrollment;
