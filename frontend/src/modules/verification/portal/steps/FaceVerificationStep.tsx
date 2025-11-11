import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StepComponentProps } from "../VerificationPortal";
import LoadingSpinner from "@/modules/verification/ui/LoadingSpinner";
import { verifyFace } from "@/lib/apiService";

type CaptureState = "idle" | "initializing" | "ready" | "capturing" | "verifying" | "success" | "error";

const CAPTURE_TONES: Record<CaptureState, { label: string; color: string }> = {
  idle: { label: "Start the camera to continue", color: "#60a5fa" },
  initializing: { label: "Requesting camera access", color: "#38bdf8" },
  ready: { label: "Align your face with the guide", color: "#34d399" },
  capturing: { label: "Hold still — capturing", color: "#facc15" },
  verifying: { label: "Comparing your capture", color: "#a855f7" },
  success: { label: "Face match confirmed", color: "#34d399" },
  error: { label: "Adjust your position and retry", color: "#f87171" },
};

/**
 * Step 2: Face Verification
 * Handles camera permissions, captures a high-quality snapshot, and submits it to the backend.
 */
const FaceVerificationStep: React.FC<StepComponentProps> = ({ formData, setFormData, onNext, onBack, goToStep }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownTimer = useRef<number | null>(null);
  const autoStartTimer = useRef<number | null>(null);

  const [status, setStatus] = useState<CaptureState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(3);
  const [similarity, setSimilarity] = useState<number | null>(formData.faceSimilarity);
  const [diffPercent, setDiffPercent] = useState<number | null>(formData.faceDiffPercent);

  const sessionId = formData.sessionId;
  const tone = CAPTURE_TONES[status] ?? CAPTURE_TONES.idle;
  const hasActiveStream = Boolean(streamRef.current);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const clearCountdownTimer = useCallback(() => {
    if (countdownTimer.current) {
      window.clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
  }, []);

  const resetCountdown = useCallback(() => {
    clearCountdownTimer();
    setCountdown(3);
  }, [clearCountdownTimer]);

  const startCamera = useCallback(async () => {
    if (!sessionId) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera access is not supported in this browser.");
      setHint(null);
      setStatus("error");
      return;
    }

    try {
      setStatus("initializing");
      setHint("Requesting camera access...");
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }

      setStatus("ready");
      setHint("Align your face within the frame and click capture when ready.");
    } catch (err) {
      cleanupStream();
      setStatus("error");
      setHint(null);
      const message = err instanceof Error ? err.message : "Unable to access your camera.";
      setError(message.includes("denied") ? "Camera permission was denied. Please allow access to continue." : message);
    }
  }, [cleanupStream, sessionId]);

  const stopAll = useCallback(() => {
    if (autoStartTimer.current) {
      window.clearTimeout(autoStartTimer.current);
      autoStartTimer.current = null;
    }
    clearCountdownTimer();
    cleanupStream();
  }, [cleanupStream, clearCountdownTimer]);

  useEffect(() => {
    if (!sessionId) return () => undefined;
    autoStartTimer.current = window.setTimeout(() => {
      if (!streamRef.current) startCamera();
    }, 250);
    return () => stopAll();
  }, [sessionId, startCamera, stopAll]);

  useEffect(() => () => stopAll(), [stopAll]);

  useEffect(() => {
    setSimilarity(formData.faceSimilarity);
    setDiffPercent(formData.faceDiffPercent);
  }, [formData.faceSimilarity, formData.faceDiffPercent]);

  const captureSnapshot = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) throw new Error("Camera is not ready.");
    if (!video.videoWidth || !video.videoHeight) throw new Error("Unable to read camera stream. Please retry.");

    const TARGET_SIZE = 480;
    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Unable to access drawing context.");

    const { videoWidth, videoHeight } = video;
    const aspect = videoWidth / videoHeight;
    let sx = 0;
    let sy = 0;
    let sWidth = videoWidth;
    let sHeight = videoHeight;

    if (aspect > 1) {
      // Wider than tall – crop horizontally
      sHeight = videoHeight;
      sWidth = sHeight;
      sx = (videoWidth - sWidth) / 2;
    } else if (aspect < 1) {
      // Taller than wide – crop vertically
      sWidth = videoWidth;
      sHeight = sWidth;
      sy = (videoHeight - sHeight) / 2;
    }

    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, TARGET_SIZE, TARGET_SIZE);
    return canvas.toDataURL("image/jpeg", 0.85);
  }, []);

  const runCountdown = useCallback(async (seconds: number) => {
    resetCountdown();
    return new Promise<void>((resolve) => {
      let value = seconds;
      setCountdown(value);
      countdownTimer.current = window.setInterval(() => {
        value -= 1;
        if (value <= 0) {
          clearCountdownTimer();
          setCountdown(0);
          resolve();
        } else {
          setCountdown(value);
        }
      }, 700);
    });
  }, [clearCountdownTimer, resetCountdown]);

  const handleVerification = useCallback(async () => {
    if (!sessionId) {
      setError("Verification session missing. Please restart the flow.");
      setStatus("error");
      return;
    }
    if (!streamRef.current) {
      setError("Camera feed not active. Restarting camera...");
      await startCamera();
      return;
    }

    try {
      setStatus("capturing");
      setHint("Hold still — capturing in 3…");
      await runCountdown(3);
      const livePhoto = captureSnapshot();
      setHint("Checking for a face match...");
      setStatus("verifying");

      const result = await verifyFace({ sessionId, livePhoto });
      const bypassed = Boolean(result.bypassed);
      setSimilarity(result.similarity);
      setDiffPercent(result.diffPercent);

      if (!result.match) {
        setFormData((prev) => ({
          ...prev,
          livePhoto,
          faceVerified: false,
          faceSimilarity: result.similarity,
          faceDiffPercent: result.diffPercent,
        }));
        setHint(null);
        setError("Face comparison did not meet the similarity threshold. Adjust lighting and retry.");
        setStatus("error");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        livePhoto,
        faceVerified: true,
        faceSimilarity: result.similarity,
        faceDiffPercent: result.diffPercent,
      }));

      setHint(bypassed ? "Face check bypassed for testing. Moving to the next step..." : "Face match confirmed! Moving to the next step...");
      setError(null);
      setStatus("success");
      cleanupStream();

      window.setTimeout(() => {
        onNext();
      }, 900);
    } catch (err) {
      setStatus("error");
      setHint(null);
      const message = err instanceof Error ? err.message : "Face verification failed. Please try again.";
      setError(message);
    } finally {
      resetCountdown();
    }
  }, [captureSnapshot, cleanupStream, onNext, resetCountdown, runCountdown, sessionId, setFormData, startCamera]);

  const handleRetry = async () => {
    setError(null);
    setHint("Reinitializing camera...");
    await startCamera();
  };

  const faceMetrics = useMemo(() => {
    if (similarity === null || diffPercent === null) return null;
    return {
      similarity: (similarity * 100).toFixed(1),
      diff: (diffPercent * 100).toFixed(1),
    };
  }, [similarity, diffPercent]);

  if (!sessionId) {
    return (
      <div className="v-grid">
        <h2 className="v-section-title">Face Verification</h2>
        <div className="v-error">
          No active verification session was found. Please start again from the first step.
        </div>
        <button className="v-btn-primary" onClick={() => goToStep(0)}>
          Restart Verification
        </button>
      </div>
    );
  }

  return (
    <div className="v-grid">
      <h2 className="v-section-title">Face Verification</h2>

      <div className="v-grid-lg">
        <div className="v-webcam-column">
          <div
            className="v-webcam-frame"
            style={{
              borderColor: `${tone.color}55`,
              boxShadow: `0 24px 60px rgba(15, 23, 42, 0.55), 0 0 0 1px ${tone.color}22`,
            }}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              className="v-webcam-feed"
              style={{
                opacity: hasActiveStream ? 1 : 0,
                filter: status === "error" ? "grayscale(0.35)" : "none",
              }}
            />

            <div className="v-webcam-overlay" aria-hidden="true" />
            <div className="v-webcam-ring" aria-hidden="true" />

            {!hasActiveStream && (
              <div className="v-webcam-placeholder">
                {status === "success"
                  ? "Face captured successfully."
                  : status === "initializing"
                  ? "Starting camera..."
                  : "Camera preview will appear here when ready."}
              </div>
            )}

            {status === "capturing" && (
              <div className="v-webcam-countdown" aria-live="polite">
                {countdown > 0 ? countdown : "Hold steady"}
              </div>
            )}

            {status === "verifying" && hasActiveStream && (
              <div className="v-webcam-countdown v-webcam-countdown--small" aria-live="polite">
                Checking...
              </div>
            )}
          </div>

          <div
            className="v-webcam-status"
            style={{
              color: tone.color,
              borderColor: `${tone.color}55`,
              background: `${tone.color}18`,
            }}
          >
            {tone.label}
          </div>

          <canvas ref={canvasRef} hidden aria-hidden="true" />
        </div>

        <div className="v-grid">
          <div className="v-card" style={{ background: "#0f172a" }}>
            <h3 className="v-card-title">Capture tips</h3>
            <ul className="v-grid-narrow v-muted">
              <li>Use a well-lit environment. Avoid backlighting.</li>
              <li>Keep your face centered and remove hats or sunglasses.</li>
              <li>Hold still during the 3-second countdown.</li>
            </ul>
          </div>

          {hint && <div className="v-muted">{hint}</div>}
          {faceMetrics && (
            <div className="v-grid-narrow v-small v-muted">
              <span>Similarity: {faceMetrics.similarity}%</span>
              <span>Pixel diff: {faceMetrics.diff}%</span>
            </div>
          )}

          {error && <div className="v-error">{error}</div>}

          <div className="v-row v-margin-top">
            <button
              type="button"
              className={`v-btn-primary ${status === "verifying" ? "v-btn-disabled" : ""}`}
              disabled={status === "verifying" || status === "initializing"}
              onClick={handleVerification}
            >
              {status === "verifying" ? "Checking..." : "Capture & Verify"}
            </button>
            <button type="button" className="v-btn-secondary" onClick={handleRetry} disabled={status === "initializing"}>
              Restart Camera
            </button>
          </div>

          <button type="button" className="v-btn-secondary" onClick={onBack}>
            Back
          </button>

          {status === "verifying" && <LoadingSpinner message="Comparing your capture to the ID photo..." />}
        </div>
      </div>
    </div>
  );
};

export default FaceVerificationStep;
