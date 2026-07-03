"use client";

import { useEffect, useRef } from "react";

/** Dev-only mount / effect / rerender detection for gallery route client components. */
export function useGalleryClientInstrument(componentName: string): number {
  const renderCount = useRef(0);
  renderCount.current += 1;

  if (process.env.NODE_ENV === "development") {
    console.log(`[gallery-instrument] Render #${renderCount.current}:`, componentName);
  }

  useEffect(() => {
    console.log("[gallery-instrument] Mounted:", componentName);
    return () => {
      console.log("[gallery-instrument] Unmounted:", componentName);
    };
  }, [componentName]);

  useEffect(() => {
    console.log("[gallery-instrument] Effect:", componentName, { render: renderCount.current });
  });

  if (process.env.NODE_ENV === "development" && renderCount.current > 50) {
    console.warn(
      `[gallery-instrument] WARNING possible rerender loop: ${componentName} render #${renderCount.current}`,
    );
  }

  return renderCount.current;
}
