import { AccuracySection } from "@/features/marketing/components/AccuracySection";
import { CaseTimeline } from "@/features/marketing/components/CaseTimeline";
import { DataPolicy } from "@/features/marketing/components/DataPolicy";
import { Hero } from "@/features/marketing/components/Hero";

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <AccuracySection />
      <CaseTimeline />
      <DataPolicy />
    </main>
  );
}
