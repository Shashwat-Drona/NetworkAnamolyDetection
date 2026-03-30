import { useCallback, useEffect, useMemo, useState } from "react";
import { armAudio, isAudioArmed, playAlertBeep } from "../utils/sound";
import { normalizeSeverity } from "../utils/alerting";

export function useAlertAudio() {
  const [armed, setArmed] = useState(() => (typeof window !== "undefined" ? isAudioArmed() : false));
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const AudioContextImpl = window.AudioContext || window.webkitAudioContext;
    setSupported(Boolean(AudioContextImpl));
  }, []);

  const arm = useCallback(async () => {
    const ok = await armAudio();
    setArmed(ok);
    return ok;
  }, []);

  const play = useCallback((severity) => {
    const s = normalizeSeverity(severity);
    if (s !== "Critical" && s !== "High") return false;
    return playAlertBeep(s);
  }, []);

  return useMemo(
    () => ({
      supported,
      armed,
      arm,
      play,
    }),
    [supported, armed, arm, play]
  );
}

