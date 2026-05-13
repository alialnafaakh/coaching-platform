import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/landing/HeroSection";
import AboutSection from "@/components/landing/AboutSection";
import ServicesSection from "@/components/landing/ServicesSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import PricingCard from "@/components/landing/PricingCard";
import CTASection from "@/components/landing/CTASection";

import { getSupabase } from "@/lib/supabase";

// Fallback content to ensure the site always loads
const DEFAULT_CONTENT = {
  general: {
    siteName: "Maryem",
    availability: "Accepting New Clients",
  },
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
  }
};

export const revalidate = 0; 

export default async function HomePage() {
  const supabase = getSupabase();
  const { data } = await supabase.from("site_content").select("content").limit(1).single();
  const content = data?.content || DEFAULT_CONTENT;

  return (
    <>
      <Navbar siteName={content.general?.siteName || DEFAULT_CONTENT.general.siteName} />
      <main>
        <HeroSection 
          content={content.hero || DEFAULT_CONTENT.hero} 
          availability={content.general?.availability || DEFAULT_CONTENT.general.availability}
        />
        <AboutSection content={content.about || DEFAULT_CONTENT.about} />
        <ServicesSection title={content.sections?.servicesTitle || DEFAULT_CONTENT.sections.servicesTitle} />
        <TestimonialsSection title={content.sections?.testimonialsTitle || DEFAULT_CONTENT.sections.testimonialsTitle} />
        <PricingCard 
          title={content.sections?.pricingTitle || DEFAULT_CONTENT.sections.pricingTitle} 
          features={content.sections?.pricingFeatures}
        />
        <CTASection />
      </main>
      <Footer siteName={content.general?.siteName || DEFAULT_CONTENT.general.siteName} />
    </>
  );
}
