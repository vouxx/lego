import { RULE_GROUPS } from "../content";

export function RuleCatalog() {
  return (
    <section
      id="rules"
      aria-labelledby="rules-title"
      className="flex scroll-mt-20 flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <h2 id="rules-title" className="text-2xl font-semibold">
          14가지를 점검합니다
        </h2>
        <p className="text-muted-foreground text-sm">
          AI 코딩 도구로 만든 Next.js·Supabase 앱에서 실제로 자주 나오는 실수만
          골랐습니다.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {RULE_GROUPS.map((group) => (
          <div
            key={group.title}
            className="flex flex-col gap-3 rounded-lg border p-5"
          >
            <h3 className="font-medium">{group.title}</h3>
            <ul className="flex flex-col gap-2">
              {group.rules.map((rule) => (
                <li key={rule.id} className="flex gap-3 text-sm">
                  <code className="text-muted-foreground shrink-0 text-xs leading-5">
                    {rule.id}
                  </code>
                  <span>{rule.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
