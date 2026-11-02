import { ClosingCta } from "@/features/marketing/components/ClosingCta";
import { Hero } from "@/features/marketing/components/Hero";
import { HowItWorks } from "@/features/marketing/components/HowItWorks";
import { Promises } from "@/features/marketing/components/Promises";
import { RuleCatalog } from "@/features/marketing/components/RuleCatalog";
import { SampleFinding } from "@/features/marketing/components/SampleFinding";

export default function LandingPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-16 px-4 pb-16 sm:px-6">
      <Hero />
      <SampleFinding />
      <HowItWorks />
      <RuleCatalog />
      <Promises />
      <ClosingCta />
    </main>
  );
}
