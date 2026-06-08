import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useGet from '@/hooks/useGet'; // الهوك بتاعك
import axios from 'axios'; // أو الهوك بتاع الـ Post لو عندك
import { 
  ArrowLeft, 
  CreditCard, 
  Image as ImageIcon, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle,
  Wallet
} from 'lucide-react';
import Loader from '@/components/Loading';
import Errorpage from '@/components/Errorpage';
import { toast } from 'react-hot-toast';
import usePost from '../../hooks/usePost';

const Enrollment = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  
  // البيانات المتوقع استقبالها من الصفحة اللي فاتت
  // { type: 'courseId' | 'chapterIds' | 'lessonIds', ids: [...], price: 100, name: '...' }
  const itemToBuy = state || {}; 
const { postData, loading: submitting } = usePost('/api/user/enrollment/enroll');
  const { data, loading, error } = useGet('/api/user/payment/payment-methods');
  const paymentMethods = data?.data?.paymentMethods || [];

  const [selectedMethod, setSelectedMethod] = useState(null);
  const [base64Image, setBase64Image] = useState(null);

  // تحويل الصورة لـ Base64 لو الدفع يدوي
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBase64Image(reader.result);
      reader.readAsDataURL(file);
    }
  };



const handlePayment = async () => {
  // 1. التحقق من الاختيارات قبل الإرسال
  if (!selectedMethod) return toast.error("Please select a payment method");
  
  if (selectedMethod.type === 'Manual' && !base64Image) {
    return toast.error("Please upload the transaction receipt");
  }

  // 2. تجهيز الـ Payload بناءً على البيانات المستلمة في الـ state
  const payload = {
    paymentType: selectedMethod.type.toLowerCase() === 'automatic' ? 'wallet' : 'manual',
    [itemToBuy.type]: itemToBuy.ids, // سيتم إرسال courseId أو chapterIds أو lessonIds ديناميكياً
    paymentMethodId: selectedMethod.id,
  };

  // إضافة الصورة في حالة الدفع اليدوي
  if (selectedMethod.type === 'Manual') {
    payload.image = base64Image;
  }

  try {
    // 3. نداء الـ API باستخدام الـ hook بتاعك
    // بنبعت الـ payload ورسالة نجاح مخصصة تظهر في الـ Toast
    await postData(payload, null, "Enrollment request submitted successfully!");

    // 4. في حالة النجاح، توجيه المستخدم لصفحة كورساتي
    // الـ Hook بتاعك جواه toast.success أصلاً فمش محتاج تكررها هنا
    setTimeout(() => {
        navigate('/user/home');
    }, 1500); // تأخير بسيط عشان يلحق يشوف رسالة النجاح

  } catch (err) {
    // الخطأ بيتعالج تلقائياً جوه الـ hook بتاعك وبيظهر toast.error
    console.error("Enrollment Error:", err.message);
  }
};

  if (loading) return <Loader />;
  if (error) return <Errorpage />;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 mb-8 hover:text-one transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ملخص الطلب */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">Checkout</h2>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Summary</h3>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600 font-medium">{itemToBuy.name || "Item Name"}</span>
              <span className="font-bold text-gray-900">{itemToBuy.price} LE</span>
            </div>
            <div className="pt-4 border-t border-dashed mt-4 flex justify-between items-center text-lg">
              <span className="font-bold">Total</span>
              <span className="font-black text-one">{itemToBuy.price} LE</span>
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              For manual methods like <b>Vodafone Cash</b>, please upload a screenshot of the transaction after transferring the amount.
            </p>
          </div>
        </div>

        {/* اختيار وسيلة الدفع */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-one" /> Payment Methods
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method)}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                  selectedMethod?.id === method.id 
                  ? "border-one bg-one/5 shadow-md" 
                  : "border-gray-50 bg-gray-50/50 hover:border-gray-200"
                }`}
              >
                <div className="flex items-center gap-4">
                  <img src={method.logo} alt={method.name} className="w-10 h-10 rounded-xl object-cover border bg-white" />
                  <div className="text-left">
                    <span className="block font-bold text-gray-800">{method.name}</span>
                    <span className="text-xs text-gray-400">{method.type}</span>
                  </div>
                </div>
                {selectedMethod?.id === method.id && <CheckCircle2 className="w-5 h-5 text-one" />}
              </button>
            ))}
          </div>

          {/* سيكشن رفع الصورة لو الدفع يدوي */}
          {selectedMethod?.type === 'Manual' && (
            <div className="mt-6 space-y-3">
              <label className="text-sm font-bold text-gray-700 block">Upload Transfer Receipt</label>
              <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-6 hover:bg-gray-50 transition-colors text-center">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {base64Image ? (
                  <div className="flex flex-col items-center">
                    <img src={base64Image} className="w-24 h-24 object-cover rounded-lg mb-2 shadow-sm" alt="Preview" />
                    <span className="text-xs text-one font-bold">Change Image</span>
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
              submitting ? "bg-gray-400 cursor-not-allowed" : "bg-one hover:scale-[1.02] active:scale-95"
            }`}
          >
            {submitting ? "Processing..." : (
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