import { useState } from "react";
import { toast } from "react-hot-toast";
import api from "../api/api";

export default function usePost(defaultUrl = "") {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  



  const postData = async (body = {}, customUrl = null, toastMessage = "Success") => {
    try {
      setLoading(true);

      const url = String(customUrl || defaultUrl);

  
      const res = await api.post(url, body);

      // ✅ استخدم النص اللي وصل من props
      toast.success(toastMessage);

      return res.data;

} catch (err) {
  // التأكد من الوصول للرسالة حسب الـ JSON اللي إنت بعته
  const apiError = err?.response?.data?.error;
  
  let errorMessage = "Something went wrong";

  if (apiError?.message) {
    errorMessage = apiError.message; // دي اللي هتمسك "Payment method, amount..."
  } else if (err.response?.data?.message) {
    errorMessage = err.response.data.message;
  } else if (err.message) {
    errorMessage = err.message;
  }

  setError(errorMessage);
  toast.error(errorMessage); // المفروض التوست يظهر هنا تلقائياً
  
  throw new Error(errorMessage); 
}finally {
      setLoading(false);
    }
  };

  return { postData, loading, error };
}
