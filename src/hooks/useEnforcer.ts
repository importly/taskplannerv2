import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useTimerStore } from "../stores/timerStore";

export const useEnforcer = () => {
  const handleBlur = useTimerStore((state) => state.handleBlur);
  const handleFocus = useTimerStore((state) => state.handleFocus);
  const tick = useTimerStore((state) => state.tick);
  const status = useTimerStore((state) => state.status);
  const penaltyCountdown = useTimerStore((state) => state.penaltyCountdown);

  useEffect(() => {
    let unlistenBlur: (() => void) | undefined;
    let unlistenFocus: (() => void) | undefined;

    const setupListeners = async () => {
      unlistenBlur = await listen("window-blur", () => {
        handleBlur();
      });

      unlistenFocus = await listen("window-focus", () => {
        handleFocus();
      });
    };

    setupListeners();

    return () => {
      if (unlistenBlur) unlistenBlur();
      if (unlistenFocus) unlistenFocus();
    };
  }, [handleBlur, handleFocus]);

  useEffect(() => {
    let interval: number | undefined;

    if (status === "ACTIVE" && penaltyCountdown !== null) {
      interval = window.setInterval(() => {
        tick();
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, penaltyCountdown, tick]);
};
