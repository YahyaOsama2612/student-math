import React, { useMemo, useState } from 'react';
import Loading from '../../components/Loading';
import useGet from '../../hooks/useGet';
import usePost from '../../hooks/usePost';
import ReusableTable from '../../components/ReusableTable';
import {  Eye, CreditCard, CheckCircle2, AlertCircle, ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

const Wallet = () => {
    // 1. جلب البيانات
    const { data: transData, loading: transLoading, refetch } = useGet('/api/user/wallet/transactions?page=1&limit=20');
    const { data: methodsData, loading: methodsLoading } = useGet('/api/user/payment/payment-methods');
    
    // استخدام هوك الـ Post بدون Url افتراضي لأننا سنحدده ديناميكياً
    const { postData, loading: posting } = usePost();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ 
        amount: '', 
        paymentMethodId: '', 
        receiptImg: '' 
    });

    const transactions = transData?.data?.transactions || [];
    const paymentMethods = methodsData?.data?.paymentMethods || [];

    // تحديد طريقة الدفع المختارة حالياً لمعرفة نوعها (Manual/Automatic)
    const selectedMethod = paymentMethods.find(m => m.id === formData.paymentMethodId);

    // إعدادات الجدول
    const columns = [
        { 
            header: "Method", 
            key: "source", 
            render: (val) => <span className="font-bold text-gray-700 capitalize">{val}</span>
        },
        { 
            header: "Amount", 
            key: "amount", 
            render: (val) => <span className="text-green-600 font-bold">{val} EGP</span>
        },
        { 
            header: "Status", 
            key: "paymentStatus", 
            filterable: true, 
            filterType: 'select',
            render: (val) => (
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    val === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                    {val}
                </span>
            )
        }
    ];

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setFormData(prev => ({ ...prev, receiptImg: reader.result }));
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // التحقق من المدخلات
        if (!formData.paymentMethodId) return toast.error("Please select a payment method");
        if (!formData.amount) return toast.error("Please enter the amount");

        let endpoint = "";
        let body = { 
            paymentMethodId: formData.paymentMethodId,
            amount: Number(formData.amount)
        };

        // تحديد الـ API بناءً على النوع
        if (selectedMethod.type === "Automatic") {
            endpoint = "/api/user/wallet/recharge/automatic";
        } else {
            endpoint = "/api/user/wallet/recharge";
            if (!formData.receiptImg) return toast.error("Please upload the receipt for manual payment");
            body.receiptImg = formData.receiptImg;
        }

        try {
            const response = await postData(body, endpoint, "Request sent successfully");
            
            // لو الدفع أوتوماتيك وجاء لينك دفع في الرد، ممكن تحوله عليه
            if (selectedMethod.type === "Automatic" && response?.paymentUrl) {
                window.location.href = response.paymentUrl;
            } else {
                setIsModalOpen(false);
                setFormData({ amount: '', paymentMethodId: '', receiptImg: '' });
                refetch();
            }
        } catch (err) {
            console.error("Payment API Error");
        }
    };
    const totalBalance = useMemo(() => {
    if (!transactions.length) return 0;
    return transactions
        .filter(t => t.paymentStatus === 'completed')
        .reduce((acc, curr) => acc + curr.amount, 0);
}, [transactions]);

    if (transLoading || methodsLoading) return <Loading />;

    return (
        <div className="bg-[#f8f9fa] p-4 md:p-8 ">
            <div className="mx-auto space-y-6">
                
                {/* Balance Section */}
              <div className="bg-white border border-border rounded-[2rem] p-8 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden group hover:shadow-md transition-shadow duration-500">
        
        {/* إضافة لمسة جمالية خلفية (Background Decor) */}
        <div className="absolute -right-16 -top-16 w-32 h-32 bg-one/5 rounded-full blur-3xl group-hover:bg-one/10 transition-colors" />

        <div className="relative z-10">
            <p className="text-[10px] font-black text-one/50 uppercase tracking-[0.3em] mb-2 drop-shadow-sm">
                Total Wallet Balance
            </p>
            <div className="flex items-baseline gap-2">
                <h2 className="text-6xl font-black text-gray-900 tracking-tighter animate-in fade-in slide-in-from-left duration-700">
                    {totalBalance.toLocaleString()}
                </h2>
                <span className="text-xl font-bold text-gray-400 uppercase tracking-tighter">
                    EGP
                </span>
            </div>
            
            {/* إضافة مؤشر حالة صغير */}
            <div className="flex items-center gap-2 mt-2">
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Secure Encrypted Wallet</span>
            </div>
        </div>

        <button 
            onClick={() => setIsModalOpen(true)}
            className="group/btn relative bg-one text-white px-12 py-6 rounded-[1.5rem] font-black shadow-2xl shadow-one/30 hover:shadow-one/40 hover:-translate-y-1 active:scale-95 transition-all duration-300 flex items-center gap-4 overflow-hidden"
        >
            {/* تأثير ضوئي عند الحرك (Hover Shine) */}
            <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-[-25deg] -translate-x-full group-hover/btn:translate-x-[250%] transition-transform duration-1000" />
            
            <CreditCard className="w-6 h-6 group-hover/btn:rotate-12 transition-transform" />
            <span className="tracking-widest uppercase text-sm">Recharge</span>
        </button>
    </div>

                {/* Transactions Table */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-border overflow-hidden">
                    <ReusableTable 
                        title="Wallet Activity" 
                        columns={columns} 
                        data={transactions} 
                        extraActions={(row) => row.paymentReceiptImg && (
                            <a href={row.paymentReceiptImg} target="_blank" rel="noreferrer" className="p-2 text-one hover:bg-one/5 rounded-lg transition-all"><Eye size={18}/></a>
                        )}
                    />
                </div>
            </div>

            {/* Recharge Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 tracking-tight">Top Up Wallet</h3>
                                <p className="text-sm text-gray-500 font-medium">Select a payment gateway to continue</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 text-3xl font-light">×</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-8">
                            {/* 1. Payment Methods */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {paymentMethods.map((method) => (
                                    <div 
                                        key={method.id}
                                        onClick={() => setFormData({ ...formData, paymentMethodId: method.id })}
                                        className={`relative cursor-pointer transition-all p-4 rounded-3xl border-2 flex flex-col items-center gap-3
                                            ${formData.paymentMethodId === method.id ? "border-one bg-one/5 ring-4 ring-one/5 shadow-inner" : "border-gray-100 hover:border-gray-200"}`}
                                    >
                                        <img src={method.logo} alt="" className="w-12 h-12 object-contain rounded-xl" />
                                        <span className={`text-[10px] font-black uppercase ${formData.paymentMethodId === method.id ? "text-one" : "text-gray-400"}`}>
                                            {method.name}
                                        </span>
                                        {formData.paymentMethodId === method.id && <CheckCircle2 size={16} className="absolute top-2 right-2 text-one" />}
                                    </div>
                                ))}
                            </div>

                            <div className="grid md:grid-cols-2 gap-8 items-end">
                                {/* 2. Amount Input */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Deposit Amount</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            className="w-full pl-6 pr-14 py-4 rounded-2xl border-2 border-gray-100 focus:border-one outline-none font-black text-2xl text-one"
                                            placeholder="0"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                        />
                                        <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-gray-300">EGP</span>
                                    </div>
                                </div>

                                {/* 3. Conditional UI */}
                                {selectedMethod?.type === "Manual" ? (
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Upload Receipt</label>
                                        <div className="relative border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center hover:bg-gray-50 transition-all cursor-pointer group">
                                            <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            <p className="text-[10px] font-black text-gray-400 group-hover:text-one">
                                                {formData.receiptImg ? "✅ ATTACHED" : "UPLOAD SCREENSHOT"}
                                            </p>
                                        </div>
                                    </div>
                                ) : selectedMethod?.type === "Automatic" ? (
                                    <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                        <AlertCircle className="text-blue-400" size={20} />
                                        <p className="text-[10px] text-blue-600 font-bold leading-tight">AUTOMATIC GATEWAY:<br/>Fast & Secure processing</p>
                                    </div>
                                ) : null}
                            </div>

                            {/* Submit Button */}
                            <button 
                                type="submit"
                                disabled={posting || !formData.paymentMethodId}
                                className="w-full bg-one text-white py-5 rounded-[1.5rem] font-black shadow-2xl shadow-one/30 hover:translate-y-[-2px] active:translate-y-0 transition-all disabled:opacity-50"
                            >
                                {posting ? 'SENDING...' : selectedMethod?.type === "Automatic" ? 'PROCEED TO PAYMENT' : 'SUBMIT REQUEST'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Wallet