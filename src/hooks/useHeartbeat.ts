import { useEffect, useRef } from "react";

interface UseHeartbeatOptions {
  token: string | null;
  sessionId: string | null;
  apiBaseUrl: string; // e.g. "https://api.intelliviq.com/api"
  intervalMs?: number;
}

export default function useHeartbeat({
  token,
  sessionId,
  apiBaseUrl,
  intervalMs = 60000, // 60 seconds default
}: UseHeartbeatOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inFlightRef = useRef(false);
  const isVisibleRef = useRef(true);

  const stop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const sendHeartbeat = async () => {
    if (!token || !sessionId) return;
    if (inFlightRef.current) return; // prevent overlaps
    if (!isVisibleRef.current) return; // don't send if tab is hidden

    inFlightRef.current = true;

    try {
      await fetch(`${apiBaseUrl}/analytics/heartbeat.php`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch (e) {
      // ignore network errors (user offline)
      console.debug("Heartbeat failed (user may be offline):", e);
    } finally {
      inFlightRef.current = false;
    }
  };

  const start = () => {
    if (timerRef.current) return; // already running
    if (!token || !sessionId) return;

    // send one immediately, then repeat
    sendHeartbeat();
    timerRef.current = setInterval(sendHeartbeat, intervalMs);
  };

  useEffect(() => {
    if (!token || !sessionId) {
      stop();
      return;
    }

    // Handle visibility changes
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      isVisibleRef.current = isVisible;

      if (isVisible) {
        // Tab became visible - resume heartbeat
        start();
      } else {
        // Tab became hidden - pause heartbeat
        stop();
      }
    };

    // Start heartbeat initially
    start();

    // Listen for visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [token, sessionId, apiBaseUrl, intervalMs]);
}

