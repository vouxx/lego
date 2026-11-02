import { PROMISES } from "../content";

export function Promises() {
  return (
    <section aria-labelledby="promise-title" className="flex flex-col gap-4">
      <h2 id="promise-title" className="text-2xl font-semibold">
        코드는 이렇게 다룹니다
      </h2>
      <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
        {PROMISES.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
    </section>
  );
}
