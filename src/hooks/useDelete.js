// src/hooks/useDelete.js
import { useState } from "react";
import { toast } from "react-hot-toast";
import api from "../api/api";

export default function useDelete(defaultUrl) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const deleteData = async (customUrl = null) => {
    try {
      setLoading(true);
      const res = await api.delete(customUrl || defaultUrl);

      if (res.data.success) {
        toast.success("delete successfully!");
      } else {
        toast.error(res.data?.error?.message || "Delete failed!");
      }

      return res.data;
    } catch (err) {
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        "Delete request failed";

      setError(errorMsg);
      toast.error(errorMsg);

      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { deleteData, loading, error };
}
