"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const DEFAULT_CONTENT: any = {
  en: {
    general: { siteName: "Maryem", availability: "Accepting New Clients" },
    hero: {
      headline: "The relationship you want starts with one honest session.",
      highlight: "honest",
      subheadline: "Biological, psychological, and social coaching for individuals and couples ready to heal patterns and deepen bonds.",
    },
    about: {
      imageUrl: "",
      text1: "My work is grounded in the biopsychosocial model — the understanding that our nervous system, our childhood story, and our cultural context all shape the way we love, attach, and repair.",
      text2: "I am a certified relationship coach trained in attachment theory, somatic awareness, and systemic family dynamics. My sessions are a safe, non-judgmental space where real change begins.",
    },
    sections: {
      servicesTitle: "What We Work On",
      testimonialsTitle: "Stories of Change",
      pricingTitle: "Investment",
      pricingFeatures: [
        "40-minute private session via video",
        "Personalized biopsychosocial intake",
        "Session summary & action plan",
        "Resource recommendations",
        "Secure, confidential booking",
        "Follow-up support email",
      ],
    }
  },
  ar: {
    general: { siteName: "مريم", availability: "أستقبل عملاء جدد" },
    hero: {
      headline: "العلاقة التي تطمحين إليها تبدأ بجلسة واحدة صادقة.",
      highlight: "صادقة",
      subheadline: "كوتشينج بيولوجي ونفسي واجتماعي للأفراد والأزواج المستعدين لشفاء الأنماط وتعميق الروابط.",
    },
    about: {
      imageUrl: "",
      text1: "عملي متجذر في النموذج البيولوجي النفسي الاجتماعي — فهم أن جهازنا العصبي، وقصة طفولتنا، وسياقنا الثقافي كلها تشكل الطريقة التي نحب بها ونتعلق ونصلح.",
      text2: "أنا كوتش علاقات معتمدة مدربة على نظرية التعلق، والوعي الجسدي، وديناميكيات الأسرة النظامية. جلساتي هي مساحة آمنة وغير حكمية حيث يبدأ التغيير الحقيقي.",
    },
    sections: {
      servicesTitle: "مجالات التركيز",
      testimonialsTitle: "قصص التغيير",
      pricingTitle: "الاستثمار",
      pricingFeatures: [
        "جلسة خاصة مدتها 40 دقيقة عبر الفيديو",
        "تقييم بيولوجي نفسي اجتماعي شخصي",
        "ملخص الجلسة وخطة العمل",
        "توصيات بالمصادر والمراجع",
        "حجز آمن وسري",
        "بريد إلكتروني للمتابعة والدعم",
      ],
    }
  }
};

export default function ContentEditor() {
  const [content, setContent] = useState<any>(null);
  const [currentLang, setCurrentLang] = useState<"en" | "ar">("en");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((d) => {
        if (!d.content || (!d.content.en && !d.content.ar)) {
          setContent(DEFAULT_CONTENT);
        } else {
          setContent({
            en: { ...DEFAULT_CONTENT.en, ...d.content.en },
            ar: { ...DEFAULT_CONTENT.ar, ...d.content.ar },
          });
        }
        setLoading(false);
      });
  }, []);

  const handleChange = (section: string, field: string, value: any) => {
    setContent((prev: any) => ({
      ...prev,
      [currentLang]: {
        ...prev[currentLang],
        [section]: {
          ...prev[currentLang][section],
          [field]: value,
        },
      },
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingImage(true);
    setMsg("");
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      handleChange("about", "imageUrl", data.url);
      setMsg("✓ Image uploaded successfully (Remember to save changes!)");
    } catch (err: any) {
      setMsg(`Error uploading image: ${err.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMsg("✓ Content saved successfully!");
    } catch (err: any) {
      setMsg(`Error saving content: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-[#9ca3af]">Loading content...</p>;

  const inputCls = "w-full px-4 py-3 rounded-xl border border-[#e5e0d8] bg-white text-[#1a1a2e] text-sm focus:outline-none focus:border-[#0d7377] transition-all";
  const c = content[currentLang];

  return (
    <div dir={currentLang === "ar" ? "rtl" : "ltr"}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl text-[#1a1a2e] mb-2" style={{ fontFamily: currentLang === "ar" ? "inherit" : "Cormorant Garamond, Georgia, serif" }}>
            {currentLang === "ar" ? "تحرير محتوى الموقع" : "Edit Website Content"}
          </h1>
          <p className="text-sm text-[#6b7280]">
            {currentLang === "ar" ? "قم بتحديث النصوص والصور في صفحة موقعك العامة." : "Update the text and images on your public landing page."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Language Toggle */}
          <div className="flex bg-[#f0ede6] p-1 rounded-xl">
            <button
              onClick={() => setCurrentLang("en")}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${currentLang === "en" ? "bg-white text-[#0d7377] shadow-sm" : "text-[#6b7280]"}`}
            >
              English
            </button>
            <button
              onClick={() => setCurrentLang("ar")}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${currentLang === "ar" ? "bg-white text-[#0d7377] shadow-sm" : "text-[#6b7280]"}`}
            >
              العربية
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
          >
            {saving ? (currentLang === "ar" ? "جاري الحفظ..." : "Saving...") : (currentLang === "ar" ? "حفظ جميع التغييرات" : "Save All Changes")}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mb-6 p-4 rounded-xl text-sm ${msg.includes("Error") ? "bg-red-50 text-red-600" : "bg-[#f0fafa] text-[#0d7377]"}`}>
          {msg}
        </div>
      )}

      <div className="space-y-8">
        {/* GENERAL SETTINGS */}
        <div className="bg-white rounded-2xl p-6 border border-[#e5e0d8]">
          <h2 className="text-xl font-semibold text-[#1a1a2e] mb-5">{currentLang === "ar" ? "الإعدادات العامة" : "General Settings"}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">{currentLang === "ar" ? "اسم الموقع (الشعار)" : "Site Name (Logo)"}</label>
              <input
                type="text"
                value={c.general?.siteName || ""}
                onChange={(e) => handleChange("general", "siteName", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">{currentLang === "ar" ? "حالة التوفر" : "Availability Status"}</label>
              <input
                type="text"
                value={c.general?.availability || ""}
                onChange={(e) => handleChange("general", "availability", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* HERO SECTION */}
        <div className="bg-white rounded-2xl p-6 border border-[#e5e0d8]">
          <h2 className="text-xl font-semibold text-[#1a1a2e] mb-5">{currentLang === "ar" ? "قسم الهيرو (الرئيسي)" : "Hero Section"}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">{currentLang === "ar" ? "العنوان الرئيسي" : "Headline"}</label>
              <input
                type="text"
                value={c.hero?.headline || ""}
                onChange={(e) => handleChange("hero", "headline", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">{currentLang === "ar" ? "الكلمة المراد تمييزها (باللون الذهبي)" : "Word to Highlight (Gold)"}</label>
              <input
                type="text"
                value={c.hero?.highlight || ""}
                onChange={(e) => handleChange("hero", "highlight", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">{currentLang === "ar" ? "العنوان الفرعي" : "Subheadline"}</label>
              <textarea
                rows={3}
                value={c.hero?.subheadline || ""}
                onChange={(e) => handleChange("hero", "subheadline", e.target.value)}
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* SECTION TITLES */}
        <div className="bg-white rounded-2xl p-6 border border-[#e5e0d8]">
          <h2 className="text-xl font-semibold text-[#1a1a2e] mb-5">{currentLang === "ar" ? "عناوين الأقسام والمميزات" : "Section Titles & Features"}</h2>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">{currentLang === "ar" ? "عنوان الخدمات" : "Services Title"}</label>
              <input
                type="text"
                value={c.sections?.servicesTitle || ""}
                onChange={(e) => handleChange("sections", "servicesTitle", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">{currentLang === "ar" ? "عنوان التقييمات" : "Testimonials Title"}</label>
              <input
                type="text"
                value={c.sections?.testimonialsTitle || ""}
                onChange={(e) => handleChange("sections", "testimonialsTitle", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">{currentLang === "ar" ? "عنوان الأسعار" : "Pricing Title"}</label>
              <input
                type="text"
                value={c.sections?.pricingTitle || ""}
                onChange={(e) => handleChange("sections", "pricingTitle", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6b7280] mb-1.5">{currentLang === "ar" ? "مميزات السعر (واحد في كل سطر)" : "Pricing Features (One per line)"}</label>
            <textarea
              rows={6}
              value={c.sections?.pricingFeatures?.join("\n") || ""}
              onChange={(e) => handleChange("sections", "pricingFeatures", e.target.value.split("\n"))}
              className={`${inputCls} resize-none font-mono text-xs`}
              placeholder={currentLang === "ar" ? "جلسة خاصة مدتها 40 دقيقة عبر الفيديو..." : "40-minute private session via video..."}
            />
          </div>
        </div>

        {/* ABOUT SECTION */}
        <div className="bg-white rounded-2xl p-6 border border-[#e5e0d8]">
          <h2 className="text-xl font-semibold text-[#1a1a2e] mb-5">{currentLang === "ar" ? "قسم عن مريم" : "About Maryem Section"}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">{currentLang === "ar" ? "صورة الملف الشخصي" : "Profile Picture"}</label>
              <div className="flex items-center gap-4">
                {c.about?.imageUrl ? (
                  <img src={c.about.imageUrl} alt="Profile" className="w-20 h-20 rounded-xl object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-[#f0ede6] flex items-center justify-center text-xs text-[#9ca3af]">{currentLang === "ar" ? "لا توجد صورة" : "No image"}</div>
                )}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="text-sm text-[#6b7280] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#0d7377]/10 file:text-[#0d7377] hover:file:bg-[#0d7377]/20 transition-all"
                  />
                  {uploadingImage && <p className="text-xs text-[#0d7377] mt-2">{currentLang === "ar" ? "جاري الرفع..." : "Uploading..."}</p>}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">{currentLang === "ar" ? "الفقرة الأولى" : "Paragraph 1"}</label>
              <textarea
                rows={3}
                value={c.about?.text1 || ""}
                onChange={(e) => handleChange("about", "text1", e.target.value)}
                className={`${inputCls} resize-none`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">{currentLang === "ar" ? "الفقرة الثانية" : "Paragraph 2"}</label>
              <textarea
                rows={3}
                value={c.about?.text2 || ""}
                onChange={(e) => handleChange("about", "text2", e.target.value)}
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
