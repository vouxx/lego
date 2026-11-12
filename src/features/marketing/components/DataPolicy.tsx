import { POLICIES } from "../content";
import { LandingSection } from "./LandingSection";
import { SectionTitle } from "./SectionTitle";

/** 리포를 맡기기 전에 알아야 할 것: 대상 / 하는 일 / 하지 않는 일. */
export function DataPolicy() {
  return (
    <LandingSection id="data" titleId="data-title">
      <SectionTitle id="data-title">
        리포를 맡기기 전에 알아야 할 것
      </SectionTitle>
      <p className="text-muted-foreground mt-4 max-w-150 leading-relaxed">
        점검 도구가 새 구멍이 되지 않도록, 하는 일과 하지 않는 일을 나눠
        적었습니다.
      </p>
      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-160 border-collapse text-sm leading-relaxed">
          <thead>
            <tr className="text-muted-foreground border-foreground border-t text-left text-xs">
              <th
                scope="col"
                className="w-1/6 border-b py-2.5 pr-6 font-medium"
              >
                대상
              </th>
              <th
                scope="col"
                className="w-1/2 border-b py-2.5 pr-6 font-medium"
              >
                하는 일
              </th>
              <th scope="col" className="border-b py-2.5 font-medium">
                하지 않는 일
              </th>
            </tr>
          </thead>
          <tbody>
            {POLICIES.map((p) => (
              <tr key={p.what} className="border-b align-top">
                <th scope="row" className="py-4 pr-6 text-left font-medium">
                  {p.what}
                </th>
                <td className="py-4 pr-6">{p.does}</td>
                <td className="text-muted-foreground py-4">{p.never}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LandingSection>
  );
}
