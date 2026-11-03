import type { Rule } from "../types";
import { sec001 } from "./sec-001";
import { sec002 } from "./sec-002";
import { sec003 } from "./sec-003";
import { sec004 } from "./sec-004";
import { sec005 } from "./sec-005";
import { sec006 } from "./sec-006";
import { sec007 } from "./sec-007";
import { sec008 } from "./sec-008";
import { sec009 } from "./sec-009";
import { sec010 } from "./sec-010";
import { sec011 } from "./sec-011";
import { sec012 } from "./sec-012";
import { sec013 } from "./sec-013";
import { sec015 } from "./sec-015";
import { sec016 } from "./sec-016";
import { sec017 } from "./sec-017";
import { sec018 } from "./sec-018";
import { sec019 } from "./sec-019";
import { sec020 } from "./sec-020";
import { sec021 } from "./sec-021";
import { sec022 } from "./sec-022";

/** 리포 파일만 보고 판단하는 규칙. SEC-014 는 네트워크가 필요해 auditDependencies 로 따로 돈다. */
export const STATIC_RULES: Rule[] = [
  sec001,
  sec002,
  sec003,
  sec004,
  sec005,
  sec006,
  sec007,
  sec008,
  sec009,
  sec010,
  sec011,
  sec012,
  sec013,
  sec015,
  sec016,
  sec017,
  sec018,
  sec019,
  sec020,
  sec021,
  sec022,
];
