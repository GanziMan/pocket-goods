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
      <div className="pointer-events-none absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-100 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800" />
      <div
        className="pointer-events-none absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-primary via-primary/90 to-primary shadow-[0_0_16px_hsl(var(--primary)/0.45)]"
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
        className="relative z-10 h-8 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[-6px] [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_6px_14px_rgba(0,0,0,0.25)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-200 [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-track]:h-2 [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:shadow-[0_6px_14px_rgba(0,0,0,0.25)]"
      />
    </div>
  );
}

export { Slider };
