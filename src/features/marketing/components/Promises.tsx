import { PROMISES } from "../content";
import { SectionHeading } from "./SectionHeading";

export function Promises() {
  return (
    <section aria-labelledby="promises-title" className="flex flex-col gap-6">
      <SectionHeading
        id="promises-title"
        eyebrow="05 · 코드 다루는 방식"
        title="내 코드는 이렇게 다룹니다"
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {PROMISES.map((text) => (
          <li
            key={text}
            className="flex gap-3 rounded-lg border p-4 text-sm break-keep"
          >
            <span className="text-ok font-mono" aria-hidden="true">
              ✓
            </span>
            {text}
          </li>
        ))}
      </ul>
    </section>
  );
}
