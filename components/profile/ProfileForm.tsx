"use client";

import React, { useState, useTransition } from "react";

export default function ProfileForm() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("جاري حفظ البيانات...");
  };

  return (
    <div className="max-w-xl mx-auto my-8 p-6 bg-white text-right dir-rtl border rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4 text-slate-900">إعدادات الملف الشخصي</h2>
      {message && <div className="p-3 mb-4 bg-amber-100 text-amber-900 rounded">{message}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1 text-slate-700">الاسم الكامل</label>
          <input type="text" name="fullName" required className="w-full p-2 border rounded text-black" />
        </div>
        <div>
          <label className="block text-sm mb-1 text-slate-700">الدولة</label>
          <select name="countryCode" defaultValue="SA" className="w-full p-2 border rounded text-black">
            <option value="SA">المملكة العربية السعودية (SAR)</option>
            <option value="AE">الإمارات العربية المتحدة (AED)</option>
            <option value="EG">مصر (EGP)</option>
            <option value="JO">الأردن (JOD)</option>
            <option value="US">العالم (USD)</option>
          </select>
        </div>
        <button type="submit" className="w-full py-2 bg-amber-600 text-white rounded font-bold">
          {isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
        </button>
      </form>
    </div>
  );
}
