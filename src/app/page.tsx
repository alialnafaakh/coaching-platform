"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/landing/HeroSection";
import AboutSection from "@/components/landing/AboutSection";
import ServicesSection from "@/components/landing/ServicesSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import PricingCard from "@/components/landing/PricingCard";
import CTASection from "@/components/landing/CTASection";

import { useLanguage } from "@/context/LanguageContext";

// Fallback content to ensure the site always loads
export const DEFAULT_CONTENT: any = {
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

export default function HomePage() {
  const { lang } = useLanguage();
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    fetch("/api/content")
      .then((r) => r.json())
      .then((d) => {
        setContent(d.content || DEFAULT_CONTENT);
      })
      .catch(() => setContent(DEFAULT_CONTENT));
  }, []);

  if (!content) return <div className="min-h-screen bg-[#faf9f6]" />;

  const c = content[lang] || DEFAULT_CONTENT[lang];

  return (
    <>
      <Navbar siteName={c.general?.siteName || DEFAULT_CONTENT[lang].general.siteName} />
      <main>
        <HeroSection 
          content={c.hero || DEFAULT_CONTENT[lang].hero} 
          availability={c.general?.availability || DEFAULT_CONTENT[lang].general.availability}
        />
        <AboutSection content={c.about || DEFAULT_CONTENT[lang].about} />
        <ServicesSection title={c.sections?.servicesTitle || DEFAULT_CONTENT[lang].sections.servicesTitle} />
        <TestimonialsSection title={c.sections?.testimonialsTitle || DEFAULT_CONTENT[lang].sections.testimonialsTitle} />
        <PricingCard 
          title={c.sections?.pricingTitle || DEFAULT_CONTENT[lang].sections.pricingTitle} 
          features={c.sections?.pricingFeatures}
        />
        <CTASection />
      </main>
      <Footer siteName={c.general?.siteName || DEFAULT_CONTENT[lang].general.siteName} />
    </>
  );
}
