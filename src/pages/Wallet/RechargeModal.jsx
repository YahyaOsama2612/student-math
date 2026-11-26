import { useState } from "react";
import { toast } from "react-hot-toast";
import useGet from "@/hooks/useGet";
import usePost from "@/hooks/usePost";
import { Modal } from "@/components/portal/ui";
import { getCurrent, money } from "@/lib/currency";

/* Wallet recharge dialog — used by the Wallet page and by Profile → "Add funds".
   Automatic method → POST /api/user/wallet/recharge/automatic, then go to the checkout link.
   Manual method    → POST /api/user/wallet/recharge with the receipt screenshot. */

const EMPTY_FORM = { amount: "", paymentMethodId: "", receiptImg: "" };

export default function RechargeModal({ onClose, onDone }) {
  const { data: methodsData, loading: methodsLoading } = useGet("/api/user/payment/payment-methods");
  const methods = methodsData?.data?.paymentMethods || [];
  const { postData, loading: posting } = usePost();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const selectedMethod = methods.find((m) => m.id === formData.paymentMethodId);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData((prev) => ({ ...prev, receiptImg: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.paymentMethodId) return toast.error("Please select a payment method");
    if (!formData.amount) return toast.error("Please enter the amount");

    let endpoint = "";
    const body = { paymentMethodId: formData.paymentMethodId, amount: Number(formData.amount) };

    if (selectedMethod.type === "Automatic") {
      endpoint = "/api/user/wallet/recharge/automatic";
    } else {
      endpoint = "/api/user/wallet/recharge";
      if (!formData.receiptImg) return toast.error("Please upload the receipt for manual payment");
      body.receiptImg = formData.receiptImg;
    }

    try {
      const response = await postData(body, endpoint, "Request sent successfully");
      const redirectUrl =
        response?.checkoutUrl ||
        response?.paymentUrl ||
        response?.data?.checkoutUrl ||
        response?.data?.paymentUrl;

      // a checkout link in the answer = go and pay there
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        setFormData(EMPTY_FORM);
        onDone?.();
      }
    } catch {
      console.error("Payment API Error");
    }
  };

  const auto = selectedMethod?.type === "Automatic";

  return (
    <Modal
      title="Top up your wallet"
      wide
      onClose={onClose}
      actions={<>
        <button className="pl-btn" onClick={onClose}>Cancel</button>
        <button className="pl-btn primary" onClick={handleSubmit} disabled={posting || !formData.paymentMethodId}>
          {posting ? "Sending…" : auto ? "Proceed to payment" : "Submit request"}
        </button>
      </>}
    >
      <p className="mb-3">Choose how you pay, then enter the amount.</p>
      {methodsLoading && !methodsData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4"><div className="skel h-16"></div><div className="skel h-16"></div></div>
      ) : methods.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {methods.map((m) => {
            const on = formData.paymentMethodId === m.id;
            return (
              <label key={m.id} className={`pay-opt ${on ? "active" : ""}`}>
                <input type="radio" name="pay-method" checked={on} onChange={() => setFormData({ ...formData, paymentMethodId: m.id })} className="accent-[#7d0a0a]" />
                {m.logo && <img src={m.logo} alt="" className="w-9 h-9 object-contain rounded-lg shrink-0" />}
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-gray-900">{m.name}</span>
                  <span className="block text-xs text-slate-500">{m.type === "Automatic" ? "Pay online — you go to the checkout page" : "Transfer, then upload the screenshot"}</span>
                </span>
              </label>
            );
          })}
        </div>
      ) : (
        <p className="pl-alert info mb-4"><b>No payment methods</b>None are available right now. Try again later.</p>
      )}

      <label className="text-xs font-bold text-slate-700">Amount</label>
      <div className="relative mt-1 mb-4">
        <input
          type="number"
          min="1"
          className="input pr-14 font-bold"
          placeholder="0"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">EGP</span>
      </div>
      {Number(formData.amount) > 0 && getCurrent() !== "EGP" && (
        <p className="-mt-3 mb-4 text-xs text-slate-500">≈ {money(formData.amount)} — wallet top-ups are paid in EGP</p>
      )}

      {selectedMethod?.type === "Manual" && (
        <div>
          <label className="text-xs font-bold text-slate-700">Payment screenshot</label>
          <input type="file" accept="image/*" onChange={handleFileChange} className="input mt-1" />
          {formData.receiptImg ? (
            <div className="flex items-center gap-3 mt-2">
              <img src={formData.receiptImg} alt="Receipt preview" className="w-14 h-14 object-cover rounded-lg border border-slate-200" />
              <span className="text-xs font-bold text-green-700">Receipt attached</span>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 mt-1">The admin checks it and then adds the money to your wallet.</p>
          )}
        </div>
      )}
      {auto && <p className="pl-alert info"><b>Automatic gateway</b>You will be sent to a secure checkout page to finish the payment.</p>}
    </Modal>
  );
}
