"use client";

import {
  AppShowcase,
  FeatureGrid,
  Footer,
  HeroSection,
  PricingCard,
} from "@/components/LandingComponents";

export default function Home() {
  return (
    <main className="min-h-screen bg-black selection:bg-white/20 selection:text-white">
      <HeroSection />
      <AppShowcase />
      <FeatureGrid />
      <PricingCard />
      <Footer />
    </main>
  );
}
