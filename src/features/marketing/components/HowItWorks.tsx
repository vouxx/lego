import { STEPS } from "../content";

export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="flex flex-col gap-6">
      <h2 id="how-title" className="text-2xl font-semibold">
        이렇게 동작합니다
      </h2>
      <ol className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="flex flex-col gap-2 rounded-lg border p-5"
          >
            <span className="text-muted-foreground text-sm">{i + 1}</span>
            <h3 className="font-medium">{step.title}</h3>
            <p className="text-muted-foreground text-sm">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
