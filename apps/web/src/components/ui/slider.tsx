"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type SliderProps = {
  className?: string;
  defaultValue?: number[];
  value?: number[];
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onValueChange?: (value: number[]) => void;
};

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  onValueChange,
}: SliderProps) {
  const isControlled = Array.isArray(value);
  const [internalValue, setInternalValue] = React.useState<number>(defaultValue?.[0] ?? min);
  const currentValue = isControlled ? (value?.[0] ?? min) : internalValue;
  const percentage = ((currentValue - min) / Math.max(max - min, 1)) * 100;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    if (!isControlled) setInternalValue(next);
    onValueChange?.([next]);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div className="pointer-events-none absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-muted" />
      <div
        className="pointer-events-none absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary"
        style={{ width: `${percentage}%` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        disabled={disabled}
        onChange={handleChange}
        className="relative z-10 h-6 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[-4px] [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-ring [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-ring [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-sm"
      />
    </div>
  );
}

export { Slider };
