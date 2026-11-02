import type { Rule } from "../types";
import { sec001 } from "./sec-001";
import { sec002 } from "./sec-002";
import { sec003 } from "./sec-003";
import { sec004 } from "./sec-004";
import { sec005 } from "./sec-005";
import { sec006 } from "./sec-006";
import { sec007 } from "./sec-007";
import { sec008 } from "./sec-008";

/** 2주차까지 구현된 정적 규칙. SEC-009~014 는 3주차. */
export const STATIC_RULES: Rule[] = [
  sec001,
  sec002,
  sec003,
  sec004,
  sec005,
  sec006,
  sec007,
  sec008,
];
