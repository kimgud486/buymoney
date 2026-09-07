import { useModalScrollLock } from "./useModalScrollLock";

export function useBodyScrollLock(isLocked: boolean) {
  useModalScrollLock(isLocked);
}
