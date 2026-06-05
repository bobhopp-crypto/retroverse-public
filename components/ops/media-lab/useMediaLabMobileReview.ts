"use client";

import { useEffect, useState } from "react";

const MOBILE_REVIEW_MAX_WIDTH = 899;

export function useMediaLabMobileReview(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_REVIEW_MAX_WIDTH}px)`);
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return mobile;
}

export const MEDIA_LAB_MOBILE_REVIEW_PX = MOBILE_REVIEW_MAX_WIDTH + 1;
