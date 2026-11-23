"use client";

import React, { useEffect, useState, useRef } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export default function AnimatedCounter({
  value,
  duration = 600,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}: AnimatedCounterProps) {
  const safeVal = typeof value === "number" && !isNaN(value) ? value : 0;
  const [displayValue, setDisplayValue] = useState(safeVal);
  const startValRef = useRef(safeVal);

  useEffect(() => {
    let startTime: number | null = null;
    const startVal = startValRef.current;
    const endVal = safeVal;

    if (startVal === endVal) return;

    let animId: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * easeProgress;
      setDisplayValue(current);
      startValRef.current = current;

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setDisplayValue(endVal);
        startValRef.current = endVal;
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [safeVal, duration]);

  const safeDisplay = typeof displayValue === "number" && !isNaN(displayValue) ? displayValue : safeVal;
  const formatted = decimals > 0 ? safeDisplay.toFixed(decimals) : Math.round(safeDisplay).toLocaleString();

  return (
    <span className={`font-tabular transition-colors ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
