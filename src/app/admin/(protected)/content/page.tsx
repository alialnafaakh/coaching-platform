"use client";

import { useState, useEffect } from "react";

const DEFAULT_CONTENT: any = {
  en: {
    general: { siteName: "Maryem", availability: "Accepting New Clients" },
    hero: {
      headline: "The relationship you want starts with one honest session.",
      highlight: "honest",
      subheadline:
        "Biological, psychological, and social coaching for individuals and couples ready to heal patterns and deepen bonds.",
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
    },
    testimonials: [
      {
        name: "Sofia R.",
        role: "Navigating a divorce",
        date: "March 2024",
        quote:
          "I came in completely numb. Maryem helped me understand why I kept shutting down emotionally — and gave me tools to change that. Life-changing.",
        stars: 5,
      },
      {
        name: "James & Laura K.",
        role: "Couple, together 8 years",
        date: "January 2024",
        quote:
          "We were repeating the same argument for years. After just three sessions with Maryem, we finally understood each other's nervous systems. We're different people now.",
        stars: 5,
      },
      {
        name: "Amir T.",
        role: "Single, working on patterns",
        date: "February 2024",
        quote:
          "I kept attracting the same kind of unavailable partner. Maryem helped me trace it back to its root and actually change my attachment style. Incredible work.",
        stars: 5,
      },
    ],
  },
  ar: {
    general: { siteName: "مريم", availability: "أستقبل عملاء جدد" },
    hero: {
      headline: "العلاقة التي تطمحين إليها تبدأ بجلسة واحدة صادقة.",
      highlight: "صادقة",
      subheadline:
        "كوتشينج بيولوجي ونفسي واجتماعي للأفراد والأزواج المستعدين لشفاء الأنماط وتعميق الروابط.",
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
    },
    testimonials: [
      {
        name: "صوفيا ر.",
        role: "تمر بطلاق",
        date: "مارس 2024",
        quote:
          "جئت وأنا أشعر بالخدر تمامًا. ساعدتني مريم في فهم لماذا كنت أغلق عاطفيًا باستمرار — وأعطتني الأدوات لتغيير ذلك. تجربة غيرت حياتي.",
        stars: 5,
      },
      {
        name: "جيمس ولورا ك.",
        role: "زوجان، معًا منذ 8 سنوات",
        date: "يناير 2024",
        quote:
          "كنا نكرر نفس الجدال لسنوات. بعد ثلاث جلسات فقط مع مريم، فهمنا أخيرًا الجهاز العصبي لكل منا. نحن أشخاص مختلفون الآن.",
        stars: 5,
      },
      {
        name: "أمير ت.",
        role: "أعزب، يعمل على أنماط التعلق",
        date: "فبراير 2024",
        quote:
          "كنت أجذب دائمًا نفس النوع من الشركاء غير المتاحين. ساعدتني مريم في تتبع ذلك حتى جذوره وتغيير أسلوب تعلقي بالفعل. عمل لا يصدق.",
        stars: 5,
      },
    ],
  },
};

const isAr = (lang: string) => lang === "ar";

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
            en: {
              ...DEFAULT_CONTENT.en,
              ...d.content.en,
              testimonials: d.content.en?.testimonials ?? DEFAULT_CONTENT.en.testimonials,
            },
            ar: {
              ...DEFAULT_CONTENT.ar,
              ...d.content.ar,
              testimonials: d.content.ar?.testimonials ?? DEFAULT_CONTENT.ar.testimonials,
            },
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

  // ── Testimonial helpers ──────────────────────────────────────────
  const testimonials: any[] = content?.[currentLang]?.testimonials ?? [];

  const updateTestimonial = (index: number, field: string, value: any) => {
    const updated = testimonials.map((t: any, i: number) =>
      i === index ? { ...t, [field]: value } : t
    );
    setContent((prev: any) => ({
      ...prev,
      [currentLang]: { ...prev[currentLang], testimonials: updated },
    }));
  };

  const addTestimonial = () => {
    const blank = { name: "", role: "", date: "", quote: "", stars: 5 };
    setContent((prev: any) => ({
      ...prev,
      [currentLang]: {
        ...prev[currentLang],
        testimonials: [...(prev[currentLang].testimonials ?? []), blank],
      },
    }));
  };

  const removeTestimonial = (index: number) => {
    const updated = testimonials.filter((_: any, i: number) => i !== index);
    setContent((prev: any) => ({
      ...prev,
      [currentLang]: { ...prev[currentLang], testimonials: updated },
    }));
  };

  const moveTestimonial = (index: number, dir: -1 | 1) => {
    const arr = [...testimonials];
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    setContent((prev: any) => ({
      ...prev,
      [currentLang]: { ...prev[currentLang], testimonials: arr },
    }));
  };
  // ────────────────────────────────────────────────────────────────

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingImage(true);
    setMsg("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
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

  const inputCls =
    "w-full px-4 py-3 rounded-xl border border-[#e5e0d8] bg-white text-[#1a1a2e] text-sm focus:outline-none focus:border-[#0d7377] transition-all";
  const c = content[currentLang];
  const ar = isAr(currentLang);

  return (
    <div dir={ar ? "rtl" : "ltr"}>
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1
            className="text-3xl text-[#1a1a2e] mb-2"
            style={{ fontFamily: ar ? "inherit" : "Cormorant Garamond, Georgia, serif" }}
          >
            {ar ? "تحرير محتوى الموقع" : "Edit Website Content"}
          </h1>
          <p className="text-sm text-[#6b7280]">
            {ar
              ? "قم بتحديث النصوص والصور في صفحة موقعك العامة."
              : "Update the text and images on your public landing page."}
          </p>
        </div>
        <div className="flex items-center gap-3">
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
            {saving
              ? ar ? "جاري الحفظ..." : "Saving..."
              : ar ? "حفظ جميع التغييرات" : "Save All Changes"}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mb-6 p-4 rounded-xl text-sm ${msg.includes("Error") ? "bg-red-50 text-red-600" : "bg-[#f0fafa] text-[#0d7377]"}`}>
          {msg}
        </div>
      )}

      <div className="space-y-8">
        {/* ── GENERAL ── */}
        <div className="bg-white rounded-2xl p-6 border border-[#e5e0d8]">
          <h2 className="text-xl font-semibold text-[#1a1a2e] mb-5">
            {ar ? "الإعدادات العامة" : "General Settings"}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">
                {ar ? "اسم الموقع (الشعار)" : "Site Name (Logo)"}
              </label>
              <input type="text" value={c.general?.siteName || ""} onChange={(e) => handleChange("general", "siteName", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">
                {ar ? "حالة التوفر" : "Availability Status"}
              </label>
              <input type="text" value={c.general?.availability || ""} onChange={(e) => handleChange("general", "availability", e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* ── HERO ── */}
        <div className="bg-white rounded-2xl p-6 border border-[#e5e0d8]">
          <h2 className="text-xl font-semibold text-[#1a1a2e] mb-5">
            {ar ? "قسم الهيرو (الرئيسي)" : "Hero Section"}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">{ar ? "العنوان الرئيسي" : "Headline"}</label>
              <input type="text" value={c.hero?.headline || ""} onChange={(e) => handleChange("hero", "headline", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">{ar ? "الكلمة المراد تمييزها (باللون الذهبي)" : "Word to Highlight (Gold)"}</label>
              <input type="text" value={c.hero?.highlight || ""} onChange={(e) => handleChange("hero", "highlight", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">{ar ? "العنوان الفرعي" : "Subheadline"}</label>
              <textarea rows={3} value={c.hero?.subheadline || ""} onChange={(e) => handleChange("hero", "subheadline", e.target.value)} className={`${inputCls} resize-none`} />
            </div>
          </div>
        </div>

        {/* ── SECTION TITLES ── */}
        <div className="bg-white rounded-2xl p-6 border border-[#e5e0d8]">
          <h2 className="text-xl font-semibold text-[#1a1a2e] mb-5">
            {ar ? "عناوين الأقسام والمميزات" : "Section Titles & Features"}
          </h2>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">{ar ? "عنوان الخدمات" : "Services Title"}</label>
              <input type="text" value={c.sections?.servicesTitle || ""} onChange={(e) => handleChange("sections", "servicesTitle", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">{ar ? "عنوان التقييمات" : "Testimonials Title"}</label>
              <input type="text" value={c.sections?.testimonialsTitle || ""} onChange={(e) => handleChange("sections", "testimonialsTitle", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">{ar ? "عنوان الأسعار" : "Pricing Title"}</label>
              <input type="text" value={c.sections?.pricingTitle || ""} onChange={(e) => handleChange("sections", "pricingTitle", e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6b7280] mb-1.5">{ar ? "مميزات السعر (واحد في كل سطر)" : "Pricing Features (One per line)"}</label>
            <textarea
              rows={6}
              value={c.sections?.pricingFeatures?.join("\n") || ""}
              onChange={(e) => handleChange("sections", "pricingFeatures", e.target.value.split("\n"))}
              className={`${inputCls} resize-none font-mono text-xs`}
            />
          </div>
        </div>

        {/* ── TESTIMONIALS ── */}
        <div className="bg-white rounded-2xl p-6 border border-[#e5e0d8]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-[#1a1a2e]">
                {ar ? "قصص التغيير — آراء العملاء" : "Stories of Change — Testimonials"}
              </h2>
              <p className="text-xs text-[#9ca3af] mt-1">
                {ar
                  ? "عدّل الاسم والدور والتاريخ والتعليق والتقييم لكل بطاقة."
                  : "Edit the name, role, date, comment and star rating for each card."}
              </p>
            </div>
            <button
              onClick={addTestimonial}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
            >
              <span className="text-lg leading-none">+</span>
              {ar ? "إضافة تقييم" : "Add Testimonial"}
            </button>
          </div>

          {testimonials.length === 0 && (
            <div className="text-center py-10 text-[#9ca3af] text-sm border-2 border-dashed border-[#e5e0d8] rounded-2xl">
              {ar ? "لا توجد تقييمات بعد. اضغط «إضافة تقييم» للبدء." : "No testimonials yet. Click \"Add Testimonial\" to get started."}
            </div>
          )}

          <div className="space-y-5">
            {testimonials.map((t: any, i: number) => (
              <div
                key={i}
                className="border border-[#e5e0d8] rounded-2xl p-5 bg-[#faf9f6] relative group"
              >
                {/* Card header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                      style={{ background: "linear-gradient(135deg, #0d7377, #d4a843)" }}
                    >
                      {t.name ? t.name.charAt(0) : "?"}
                    </div>
                    <span className="text-sm font-medium text-[#1a1a2e]">
                      {t.name || (ar ? "عميل جديد" : "New Client")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Move up */}
                    <button
                      onClick={() => moveTestimonial(i, -1)}
                      disabled={i === 0}
                      title={ar ? "تحريك لأعلى" : "Move up"}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9ca3af] hover:text-[#0d7377] hover:bg-white transition-all disabled:opacity-30 text-xs"
                    >
                      {ar ? "↓" : "↑"}
                    </button>
                    {/* Move down */}
                    <button
                      onClick={() => moveTestimonial(i, 1)}
                      disabled={i === testimonials.length - 1}
                      title={ar ? "تحريك لأسفل" : "Move down"}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9ca3af] hover:text-[#0d7377] hover:bg-white transition-all disabled:opacity-30 text-xs"
                    >
                      {ar ? "↑" : "↓"}
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => removeTestimonial(i)}
                      title={ar ? "حذف" : "Delete"}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9ca3af] hover:text-red-500 hover:bg-red-50 transition-all text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Fields grid */}
                <div className="grid md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-[#6b7280] mb-1">
                      {ar ? "الاسم" : "Name"}
                    </label>
                    <input
                      type="text"
                      value={t.name || ""}
                      onChange={(e) => updateTestimonial(i, "name", e.target.value)}
                      placeholder={ar ? "اسم العميل" : "Client name"}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6b7280] mb-1">
                      {ar ? "الدور / الوصف" : "Role / Description"}
                    </label>
                    <input
                      type="text"
                      value={t.role || ""}
                      onChange={(e) => updateTestimonial(i, "role", e.target.value)}
                      placeholder={ar ? "مثل: تمر بطلاق" : "e.g. Navigating a divorce"}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#6b7280] mb-1">
                      {ar ? "التاريخ" : "Date"}
                    </label>
                    <input
                      type="text"
                      value={t.date || ""}
                      onChange={(e) => updateTestimonial(i, "date", e.target.value)}
                      placeholder={ar ? "مثل: مارس 2024" : "e.g. March 2024"}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-[#6b7280] mb-1">
                    {ar ? "التعليق / الرأي" : "Comment / Quote"}
                  </label>
                  <textarea
                    rows={3}
                    value={t.quote || ""}
                    onChange={(e) => updateTestimonial(i, "quote", e.target.value)}
                    placeholder={ar ? "اكتب تعليق العميل هنا..." : "Write the client's testimonial here..."}
                    className={`${inputCls} resize-none`}
                  />
                </div>

                {/* Star rating */}
                <div>
                  <label className="block text-xs font-medium text-[#6b7280] mb-2">
                    {ar ? "التقييم (النجوم)" : "Star Rating"}
                  </label>
                  <div className={`flex gap-1 ${ar ? "flex-row-reverse" : ""}`}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => updateTestimonial(i, "stars", star)}
                        className="text-2xl transition-transform hover:scale-110 focus:outline-none"
                        title={`${star} ${ar ? "نجوم" : "stars"}`}
                      >
                        <span className={star <= (t.stars || 5) ? "text-[#d4a843]" : "text-[#e5e0d8]"}>
                          ★
                        </span>
                      </button>
                    ))}
                    <span className="text-xs text-[#9ca3af] self-center ms-2">
                      {t.stars || 5}/5
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {testimonials.length > 0 && (
            <p className="text-xs text-[#9ca3af] mt-4 text-center">
              {ar
                ? `${testimonials.length} تقييم — لا تنسَ حفظ التغييرات`
                : `${testimonials.length} testimonial${testimonials.length !== 1 ? "s" : ""} — remember to save changes`}
            </p>
          )}
        </div>

        {/* ── ABOUT ── */}
        <div className="bg-white rounded-2xl p-6 border border-[#e5e0d8]">
          <h2 className="text-xl font-semibold text-[#1a1a2e] mb-5">
            {ar ? "قسم عن مريم" : "About Maryem Section"}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">
                {ar ? "صورة الملف الشخصي" : "Profile Picture"}
              </label>
              <div className="flex items-center gap-4">
                {c.about?.imageUrl ? (
                  <img src={c.about.imageUrl} alt="Profile" className="w-20 h-20 rounded-xl object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-[#f0ede6] flex items-center justify-center text-xs text-[#9ca3af]">
                    {ar ? "لا توجد صورة" : "No image"}
                  </div>
                )}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="text-sm text-[#6b7280] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#0d7377]/10 file:text-[#0d7377] hover:file:bg-[#0d7377]/20 transition-all"
                  />
                  {uploadingImage && (
                    <p className="text-xs text-[#0d7377] mt-2">{ar ? "جاري الرفع..." : "Uploading..."}</p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">{ar ? "الفقرة الأولى" : "Paragraph 1"}</label>
              <textarea rows={3} value={c.about?.text1 || ""} onChange={(e) => handleChange("about", "text1", e.target.value)} className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">{ar ? "الفقرة الثانية" : "Paragraph 2"}</label>
              <textarea rows={3} value={c.about?.text2 || ""} onChange={(e) => handleChange("about", "text2", e.target.value)} className={`${inputCls} resize-none`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
