import { ClosingCta } from "@/features/marketing/components/ClosingCta";
import { FlowStrip } from "@/features/marketing/components/FlowStrip";
import { Hero } from "@/features/marketing/components/Hero";
import { Promises } from "@/features/marketing/components/Promises";
import { ProofStrip } from "@/features/marketing/components/ProofStrip";
import { RuleCatalog } from "@/features/marketing/components/RuleCatalog";
import { ToolGrid } from "@/features/marketing/components/ToolGrid";

export default function LandingPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-20 px-4 pb-20 sm:px-6">
      <Hero />
      <ToolGrid />
      <FlowStrip />
      <ProofStrip />
      <RuleCatalog />
      <Promises />
      <ClosingCta />
    </main>
  );
}
