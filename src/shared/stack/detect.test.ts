import { describe, expect, it } from "vitest";
import { detectStack, topLevelEntries } from "./detect";

describe("detectStack", () => {
  it("src/app 이 있는 Next.js + Supabase + Tailwind 리포를 판별한다", () => {
    const stack = detectStack({
      rootEntries: [
        "package.json",
        "pnpm-lock.yaml",
        "tsconfig.json",
        "src",
        "supabase",
      ],
      srcEntries: ["app", "features"],
      packageJson: {
        dependencies: {
          next: "16.4.3",
          react: "19.3.0",
          "@supabase/ssr": "^0.12.0",
        },
        devDependencies: { typescript: "^5", tailwindcss: "^4", vitest: "^5" },
      },
    });

    expect(stack.tags).toEqual(
      expect.arrayContaining([
        "nextjs-app-router",
        "react",
        "typescript",
        "supabase",
        "tailwind",
        "vitest",
      ]),
    );
    expect(stack.tags).not.toContain("nextjs-pages-router");
    expect(stack.packageManager).toBe("pnpm");
    expect(stack.versions).toMatchObject({ next: "16.4.3", tailwindcss: "^4" });
  });

  it("Vite + React 리포는 Next.js 태그를 붙이지 않는다", () => {
    const stack = detectStack({
      rootEntries: ["package.json", "package-lock.json", "src"],
      srcEntries: ["App.tsx"],
      packageJson: {
        dependencies: { react: "^19" },
        devDependencies: { vite: "^7" },
      },
    });

    expect(stack.tags.sort()).toEqual(["react", "vite"]);
    expect(stack.packageManager).toBe("npm");
  });

  it("package.json 이 없거나 형식이 달라도 실패하지 않는다", () => {
    expect(
      detectStack({
        rootEntries: ["README.md"],
        srcEntries: [],
        packageJson: null,
      }),
    ).toEqual({
      tags: [],
      packageManager: null,
      versions: {},
    });
    expect(
      detectStack({
        rootEntries: [],
        srcEntries: [],
        packageJson: { dependencies: "oops" },
      }).tags,
    ).toEqual([]);
  });
});

describe("topLevelEntries", () => {
  it("최상위와 src 바로 아래 항목을 뽑는다", () => {
    expect(
      topLevelEntries([
        "package.json",
        "src/app/page.tsx",
        "src/lib/a.ts",
        "supabase/x.sql",
      ]),
    ).toEqual({
      rootEntries: ["package.json", "src", "supabase"],
      srcEntries: ["app", "lib"],
    });
  });
});
