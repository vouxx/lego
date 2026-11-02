import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const feature = "./src/features/*";

// 의존 방향: app → components → hooks/actions → services → repository
// target 파일은 from 경로를 import 할 수 없다. 디렉터리는 /** 로 끝나야 glob 이 파일과 일치한다.
const dependencyZones = [
  {
    target: "./src/features/**",
    from: "./src/app/**",
    message: "features 는 app 을 import 할 수 없습니다.",
  },
  {
    target: "./src/shared/**",
    from: ["./src/app/**", "./src/features/**"],
    message: "shared 는 app/features 를 import 할 수 없습니다.",
  },
  {
    target: "./packages/**",
    from: "./src/**",
    message: "packages 는 src 를 import 할 수 없습니다.",
  },
  {
    target: `${feature}/components/**`,
    from: [`${feature}/repository.ts`, "./src/lib/supabase/**"],
    message:
      "컴포넌트에서 Supabase 를 직접 호출하지 마세요. hooks/actions 를 거치세요.",
  },
  {
    target: [`${feature}/hooks/**`, `${feature}/actions.ts`],
    from: `${feature}/components/**`,
    message: "hooks/actions 는 components 를 import 할 수 없습니다.",
  },
  {
    target: `${feature}/services/**`,
    from: [
      `${feature}/components/**`,
      `${feature}/hooks/**`,
      `${feature}/actions.ts`,
    ],
    message: "services 는 components/hooks/actions 를 import 할 수 없습니다.",
  },
  {
    target: `${feature}/repository.ts`,
    from: [
      `${feature}/components/**`,
      `${feature}/hooks/**`,
      `${feature}/actions.ts`,
      `${feature}/services/**`,
    ],
    message: "repository 는 상위 계층을 import 할 수 없습니다.",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "import/no-restricted-paths": ["error", { zones: dependencyZones }],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "supabase/functions/**",
  ]),
]);

export default eslintConfig;
