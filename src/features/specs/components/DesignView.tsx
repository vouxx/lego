import type { SpecScreen, SpecTable } from "../schemas";

type Props = { tables: SpecTable[]; screens: SpecScreen[] };

export function DesignView({ tables, screens }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="font-semibold">데이터 모델 ({tables.length})</h3>
        {tables.map((table) => (
          <div key={table.name} className="rounded-md border p-3 text-sm">
            <p className="font-mono font-semibold">{table.name}</p>
            <p className="text-muted-foreground text-xs">{table.purpose}</p>
            <table className="mt-2 w-full text-xs">
              <tbody>
                {table.columns.map((c) => (
                  <tr key={c.name} className="border-t">
                    <td className="py-1 pr-2 font-mono">{c.name}</td>
                    <td className="text-muted-foreground py-1 pr-2 font-mono">
                      {c.type}
                    </td>
                    <td className="py-1">{c.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {table.relations.length > 0 ? (
              <p className="text-muted-foreground mt-2 text-xs">
                관계: {table.relations.join(" · ")}
              </p>
            ) : null}
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="font-semibold">화면 ({screens.length})</h3>
        <ul className="flex flex-col gap-1 text-sm">
          {screens.map((s) => (
            <li key={s.path}>
              <span className="font-mono">{s.path}</span> — {s.name}
              <span className="text-muted-foreground">: {s.purpose}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
