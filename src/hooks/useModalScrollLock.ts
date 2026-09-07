import { useEffect } from "react";

let activeModalCount = 0;

/**
 * Custom hook to prevent background scrolling when a modal or overlay is open.
 * Safely controls body overflow without breaking touch interactions or page flow.
 */
export function useModalScrollLock(isOpen: boolean = false) {
  useEffect(() => {
    if (!isOpen) return;

    activeModalCount += 1;
    if (activeModalCount === 1) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      activeModalCount = Math.max(0, activeModalCount - 1);
      if (activeModalCount === 0) {
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        document.body.style.touchAction = "";
        document.body.style.overscrollBehavior = "";
        document.documentElement.style.overflow = "";
        document.documentElement.style.overscrollBehavior = "";
      }
    };
  }, [isOpen]);
}


