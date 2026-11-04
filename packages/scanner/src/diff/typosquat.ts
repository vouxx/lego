// 이름을 비슷하게 만든 악성 패키지가 자주 노리는 인기 패키지
const POPULAR = [
  "react",
  "react-dom",
  "next",
  "vue",
  "svelte",
  "express",
  "axios",
  "lodash",
  "zod",
  "dotenv",
  "typescript",
  "eslint",
  "prettier",
  "jest",
  "vitest",
  "tailwindcss",
  "postcss",
  "autoprefixer",
  "webpack",
  "vite",
  "esbuild",
  "@supabase/supabase-js",
  "@supabase/ssr",
  "stripe",
  "openai",
  "@anthropic-ai/sdk",
  "prisma",
  "@prisma/client",
  "drizzle-orm",
  "mongoose",
  "pg",
  "mysql2",
  "redis",
  "jsonwebtoken",
  "bcrypt",
  "bcryptjs",
  "cors",
  "helmet",
  "body-parser",
  "date-fns",
  "dayjs",
  "moment",
  "uuid",
  "nanoid",
  "chalk",
  "commander",
  "node-fetch",
  "cross-env",
  "nodemon",
  "ts-node",
  "tsx",
  "socket.io",
  "@tanstack/react-query",
  "swr",
  "zustand",
  "redux",
  "framer-motion",
  "clsx",
  "class-variance-authority",
  "lucide-react",
  "react-hook-form",
  "sharp",
  "multer",
  "nodemailer",
  "puppeteer",
  "playwright",
  "colors",
  "request",
  "yargs",
  "debug",
  "ws",
  "graphql",
  "@octokit/rest",
];

// 인기 패키지와 한 글자 차이지만 실제로 널리 쓰는 정상 패키지
const KNOWN = new Set([
  "preact",
  "color",
  "dotenvx",
  "nuxt",
  "mysql",
  "uid",
  "tslint",
  "react-is",
  "nest",
  "axe",
  "jest-dom",
  "ioredis",
  "graphql-ws",
  "chalk-template",
]);

function distance(a: string, b: string) {
  const dp = Array.from(
    { length: a.length + 1 },
    (_, i) => [i, ...Array(b.length).fill(0)] as number[],
  );
  for (let j = 1; j <= b.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
      // 앞뒤 글자를 바꾼 경우(raect)도 한 글자 차이로 본다.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        dp[i]![j] = Math.min(dp[i]![j]!, dp[i - 2]![j - 2]! + 1);
    }
  return dp[a.length]![b.length]!;
}

const normalize = (name: string) => name.replace(/[-_.]/g, "");

/** 인기 패키지와 한 글자 정도만 다른 이름이면 그 인기 패키지 이름을 돌려준다. */
export function lookalikeOf(name: string): string | null {
  if (POPULAR.includes(name) || KNOWN.has(name)) return null;
  for (const popular of POPULAR) {
    if (popular.length < 4) continue;
    if (normalize(popular) === normalize(name)) return popular;
    if (distance(popular, name) === 1) return popular;
    // @scope 를 빼고 같은 이름을 쓴 경우(supabase-js)
    if (
      popular.startsWith("@") &&
      popular.split("/")[1] === name &&
      !name.includes("/")
    )
      return popular;
  }
  return null;
}
