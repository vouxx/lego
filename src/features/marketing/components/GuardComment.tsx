import { SEVERITY_LABELS } from "@/shared/ui/severity";

const FILE = "src/app/api/orders/[id]/route.ts";
const LINES = [
  { n: 8, text: "+ const { id } = await params;" },
  {
    n: 9,
    text: '+ const order = await db.from("orders").select().eq("id", id);',
    hit: true,
  },
];

/** PR 가드가 추가된 줄에 남긴 코멘트 모형(diff 두 줄 + 코멘트). */
export function GuardComment() {
  return (
    <div className="bg-background overflow-hidden rounded-md border">
      <div className="overflow-x-auto">
        <pre className="min-w-115 py-2.5 font-mono text-xs leading-relaxed">
          <span className="text-muted-foreground block px-4">{FILE}</span>
          {LINES.map((l) => (
            <span
              key={l.n}
              className={
                l.hit
                  ? "bg-diff-add border-l-sev-high block border-l-3 pr-4 pl-3.25"
                  : "bg-diff-add block px-4"
              }
            >
              <span className="text-muted-foreground inline-block w-6">
                {l.n}
              </span>
              {l.text}
            </span>
          ))}
        </pre>
      </div>
      <div className="flex flex-col gap-1.5 border-t px-4 py-3.5">
        <p className="text-sm">
          <b className="font-semibold">lego</b>{" "}
          <span className="text-muted-foreground">
            · {SEVERITY_LABELS.high} ·{" "}
            <span className="font-mono">SEC-009</span>
          </span>
        </p>
        <p className="text-sm leading-relaxed">
          id 로만 주문을 찾고, 로그인한 사람의 주문인지 확인하지 않습니다.
          주소의 id 를 바꾸면 다른 사람의 주문이 보입니다.
        </p>
      </div>
    </div>
  );
}
