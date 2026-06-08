import React, { useState, useMemo } from 'react';
import useGet from '../../hooks/useGet';
import usePost from '../../hooks/usePost';
import ReusableTableSearch from '../../components/ReusableTableSearch';
import Loading from '../../components/Loading';
import { toast } from 'react-hot-toast';
import { ShoppingBag, CreditCard, CheckCircle2, Eye, ShieldCheck,ArrowLeft, Zap } from 'lucide-react';

const Payment = () => {
    // --- 1. State الخاصة بالجدول (Pagination & Search) ---
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState("");

    // --- 2. جلب البيانات من الـ APIs ---
    const { data: packagesData, loading: packLoading } = useGet('/api/user/packages');
    const { data: methodsData, loading: methodsLoading } = useGet('/api/user/payment/payment-methods');
    
    // إرسال رقم الصفحة والليميت في الرابط لجلب البيانات الصحيحة من السيرفر
    const { data: historyData, loading: historyLoading, refetch } = useGet(
        `/api/user/payment/package-buy/history?page=${currentPage}&limit=${rowsPerPage}`
    );
    
    const { postData, loading: posting } = usePost();

    const [selectedPackage, setSelectedPackage] = useState(null);
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [receiptImg, setReceiptImg] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // استخراج البيانات والـ Pagination من رد السيرفر
    const packages = packagesData?.data?.data || [];
    const paymentMethods = methodsData?.data?.paymentMethods || [];
    const purchaseHistory = historyData?.data?.history || [];
    const paginationInfo = historyData?.data?.pagination || {};

    // --- 3. إعداد أعمدة الجدول ---
    const columns = [
        { 
            header: "Package", 
            key: "package", 
            render: (val) => <span className="font-bold text-one">{val?.name}</span> 
        },
        { 
            header: "Amount", 
            key: "amount", 
            render: (val) => <span className="font-bold text-green-600">{val} EGP</span> 
        },
        { 
            header: "Status", 
            key: "status", 
            render: (val) => (
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    val === 'completed' ? 'bg-green-100 text-green-700' : 
                    val === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                    {val}
                </span>
            )
        },
        { 
            header: "Date", 
            key: "createdAt", 
            render: (val) => <span className="text-gray-400 text-xs">{new Date(val).toLocaleDateString()}</span> 
        }
    ];

    // --- 4. دالة الشراء ---
    const handlePurchase = async (e) => {
        e.preventDefault();
        if (!selectedMethod) return toast.error("Please select a payment method");

        const isAutomatic = selectedMethod.type === "Automatic";
        const endpoint = isAutomatic 
            ? "/api/user/payment/package-buy/automatic" 
            : "/api/user/payment/package-buy";

        const body = {
            packageId: selectedPackage.id,
            paymentMethodId: selectedMethod.id,
            ...( !isAutomatic && { receiptImg } )
        };

        try {
            const res = await postData(body, endpoint);
            if (isAutomatic && res?.paymentUrl) {
                window.location.href = res.paymentUrl;
            } else {
                setIsModalOpen(false);
                setSelectedPackage(null);
                setReceiptImg('');
                refetch(); // تحديث الجدول بعد الشراء
            }
        } catch (err) { console.error(err); }
    };

    if (packLoading || methodsLoading) return <Loading />;

    return (
        <div className="bg-[#fcfcfd] min-h-screen p-4 md:p-8 space-y-10">
            {/* الباقات (نفس الكود السابق) */}
            <section className="mx-auto">
                <div className="flex items-center gap-3 mb-8">
  
  {/* Back Button */}
  <button 
    onClick={() => window.history.back()} 
    className="p-3 bg-gray-100 rounded-2xl text-gray-700 hover:bg-gray-200 transition-colors shadow-sm"
  >
    <ArrowLeft size={24} />
  </button>

  {/* Icon */}
  <div className="p-3 bg-one rounded-2xl text-white shadow-lg shadow-one/20">
      <ShoppingBag size={24} />
  </div>

  {/* Title */}
  <h2 className="text-2xl font-black text-gray-800 tracking-tight">Available Packages</h2>
</div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                    {packages.map((pkg) => (
                        <div key={pkg.id} className="bg-white border-2 border-gray-100 rounded-[2.5rem] p-8 hover:border-one transition-all duration-500 group relative shadow-sm">
                            <h3 className="text-2xl font-black text-gray-800 mb-2">{pkg.name}</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-black text-one">{pkg.price}</span>
                                <span className="text-gray-400 font-bold text-sm uppercase">EGP</span>
                            </div>
                            <button 
                                onClick={() => { setSelectedPackage(pkg); setIsModalOpen(true); }}
                                className="w-full py-4 bg-black text-white rounded-2xl font-black group-hover:bg-one/80 transition-all"
                            >
                                BUY PACKAGE
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* الجدول المحدث (ReusableTableSearch) */}
            <section className="mx-auto bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <ReusableTableSearch 
                    title="Purchase History" 
                    columns={columns} 
                    data={purchaseHistory} 
                    loading={historyLoading}
                    
                    // Pagination Props من الـ State والـ API
                    currentPage={currentPage}
                    totalPages={paginationInfo.totalPages || 1}
                    totalResults={paginationInfo.total || 0}
                    rowsPerPage={rowsPerPage}
                    onPageChange={(page) => setCurrentPage(page)}
                    onRowsPerPageChange={(size) => { setRowsPerPage(size); setCurrentPage(1); }}

                    // Search Props
                    searchTerm={searchTerm}
                    onSearchChange={(val) => setSearchTerm(val)}

                    extraActions={(row) => row.receiptImg && (
                        <a href={row.receiptImg} target="_blank" rel="noreferrer" className="p-2 text-one hover:bg-one/5 rounded-lg transition-all"><Eye size={18}/></a>
                    )}
                />
            </section>

            {/* Purchase Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800">Checkout</h3>
                                <p className="text-sm text-gray-400">Completing purchase for <span className="text-one font-bold">{selectedPackage?.name}</span></p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 text-3xl font-light">×</button>
                        </div>

                        <form onSubmit={handlePurchase} className="p-8 space-y-8">
                            <div className="space-y-4">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Choose Payment Method</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {paymentMethods.map((method) => (
                                        <div 
                                            key={method.id}
                                            onClick={() => setSelectedMethod(method)}
                                            className={`relative cursor-pointer transition-all p-4 rounded-[2rem] border-2 flex flex-col items-center gap-3
                                                ${selectedMethod?.id === method.id ? "border-one bg-one/5 ring-4 ring-one/5 shadow-inner" : "border-gray-100 hover:border-gray-200"}`}
                                        >
                                            <img src={method.logo} alt="" className="w-10 h-10 object-contain rounded-xl" />
                                            <span className={`text-[10px] font-black uppercase text-center leading-tight ${selectedMethod?.id === method.id ? "text-one" : "text-gray-400"}`}>
                                                {method.name}
                                            </span>
                                            {selectedMethod?.id === method.id && <CheckCircle2 size={16} className="absolute top-2 right-2 text-one" />}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedMethod?.type === "Manual" && (
                                <div className="space-y-4 animate-in slide-in-from-top duration-300">
                                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3">
                                        <AlertCircle className="text-amber-500 mt-1" size={20} />
                                        <p className="text-xs text-amber-700 font-medium">Please transfer <span className="font-bold underline">{selectedPackage?.price} EGP</span> to the wallet number, then upload the screenshot below.</p>
                                    </div>
                                    <div className="relative border-2 border-dashed border-gray-200 rounded-[2rem] p-8 text-center hover:bg-gray-50 transition-all cursor-pointer group">
                                        <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="p-3 bg-gray-100 rounded-full group-hover:bg-one group-hover:text-white transition-colors">
                                                <Zap size={20} />
                                            </div>
                                            <p className="text-xs font-black text-gray-400">
                                                {receiptImg ? "✅ RECEIPT ATTACHED" : "UPLOAD SCREENSHOT"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedMethod?.type === "Automatic" && (
                                <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex items-center gap-4">
                                    <div className="p-3 bg-blue-500 rounded-full text-white shadow-lg shadow-blue-200">
                                        <Zap size={20} />
                                    </div>
                                    <p className="text-xs text-blue-700 font-bold leading-relaxed">
                                        INSTANT ACTIVATION:<br/>
                                        <span className="font-normal opacity-70 text-[10px]">You'll be redirected to a secure payment gateway.</span>
                                    </p>
                                </div>
                            )}

                            <button 
                                type="submit"
                                disabled={posting || !selectedMethod}
                                className="w-full bg-one text-white py-6 rounded-[1.5rem] font-black shadow-2xl shadow-one/30 hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                            >
                                {posting ? 'PROCESSING...' : selectedMethod?.type === "Automatic" ? 'PROCEED TO SECURE PAY' : 'CONFIRM PURCHASE'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// أيقونة بسيطة مساعدة
const AlertCircle = ({ className, size }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
);

export default Payment;