"use client";

import { LEVEL_LABELS, LEVELS, type Level } from "../schemas";

type Props = { value: Level; onChange: (level: Level) => void };

export function LevelSelect({ value, onChange }: Props) {
  return (
    <fieldset className="flex flex-wrap items-center gap-3 text-sm">
      <legend className="sr-only">설명 수준</legend>
      <span className="font-semibold">수준</span>
      {LEVELS.map((level) => (
        <label key={level} className="flex items-center gap-1">
          <input
            type="radio"
            name="level"
            checked={value === level}
            onChange={() => onChange(level)}
          />
          {LEVEL_LABELS[level]}
        </label>
      ))}
    </fieldset>
  );
}
