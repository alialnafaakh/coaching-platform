"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const DEFAULT_CONTENT = {
  hero: {
    headline: "The relationship you want starts with one honest session.",
    highlight: "honest",
    subheadline: "Biological, psychological, and social coaching for individuals and couples ready to heal patterns and deepen bonds.",
  },
  about: {
    imageUrl: "", // We will upload this
    text1: "My work is grounded in the biopsychosocial model — the understanding that our nervous system, our childhood story, and our cultural context all shape the way we love, attach, and repair.",
    text2: "I am a certified relationship coach trained in attachment theory, somatic awareness, and systemic family dynamics. My sessions are a safe, non-judgmental space where real change begins.",
  }
};

export default function ContentEditor() {
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((d) => {
        if (!d.content || Object.keys(d.content).length === 0) {
          setContent(DEFAULT_CONTENT);
        } else {
          setContent(d.content);
        }
        setLoading(false);
      });
  }, []);

  const handleChange = (section: string, field: string, value: string) => {
    setContent((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
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

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl text-[#1a1a2e] mb-2" style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}>
            Edit Website Content
          </h1>
          <p className="text-sm text-[#6b7280]">Update the text and images on your public landing page.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #0d7377, #14a3a8)" }}
        >
          {saving ? "Saving..." : "Save All Changes"}
        </button>
      </div>

      {msg && (
        <div className={`mb-6 p-4 rounded-xl text-sm ${msg.includes("Error") ? "bg-red-50 text-red-600" : "bg-[#f0fafa] text-[#0d7377]"}`}>
          {msg}
        </div>
      )}

      <div className="space-y-8">
        {/* HERO SECTION */}
        <div className="bg-white rounded-2xl p-6 border border-[#e5e0d8]">
          <h2 className="text-xl font-semibold text-[#1a1a2e] mb-5">Hero Section</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">Headline</label>
              <input
                type="text"
                value={content.hero?.headline || ""}
                onChange={(e) => handleChange("hero", "headline", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">Word to Highlight (Gold)</label>
              <input
                type="text"
                value={content.hero?.highlight || ""}
                onChange={(e) => handleChange("hero", "highlight", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">Subheadline</label>
              <textarea
                rows={3}
                value={content.hero?.subheadline || ""}
                onChange={(e) => handleChange("hero", "subheadline", e.target.value)}
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* ABOUT SECTION */}
        <div className="bg-white rounded-2xl p-6 border border-[#e5e0d8]">
          <h2 className="text-xl font-semibold text-[#1a1a2e] mb-5">About Maryem Section</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">Profile Picture</label>
              <div className="flex items-center gap-4">
                {content.about?.imageUrl ? (
                  <img src={content.about.imageUrl} alt="Profile" className="w-20 h-20 rounded-xl object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-[#f0ede6] flex items-center justify-center text-xs text-[#9ca3af]">No image</div>
                )}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="text-sm text-[#6b7280] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#0d7377]/10 file:text-[#0d7377] hover:file:bg-[#0d7377]/20 transition-all"
                  />
                  {uploadingImage && <p className="text-xs text-[#0d7377] mt-2">Uploading...</p>}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">Paragraph 1</label>
              <textarea
                rows={3}
                value={content.about?.text1 || ""}
                onChange={(e) => handleChange("about", "text1", e.target.value)}
                className={`${inputCls} resize-none`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] mb-1.5">Paragraph 2</label>
              <textarea
                rows={3}
                value={content.about?.text2 || ""}
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
