import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VerificationForm } from "../VerificationPortal";
import LoadingSpinner from "../common/LoadingSpinner";
import WebcamFeed from "../common/WebcamFeed";
import { verifyFace } from "../../lib/apiService";
import { requestCameraStream } from "../../lib/camera";
import { toUserFacingMessage } from "../../lib/errorMessages";

type CaptureState = "idle" | "preparing" | "capturing" | "verifying" | "success" | "error";

const FaceVerificationStep: React.FC<{
  formData: VerificationForm;
  setFormData: React.Dispatch<React.SetStateAction<VerificationForm>>;
  onNext: () => void;
  onBack: () => void;
}> = ({ formData, setFormData, onNext, onBack }) => {
  const [status, setStatus] = useState<CaptureState>("idle");
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {}
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => () => cleanupStream(), [cleanupStream]);

  const ensureCamera = useCallback(async () => {
    if (!streamRef.current) {
      streamRef.current = await requestCameraStream();
    }

    const video = videoRef.current;
    if (!video) return;

    if (video.srcObject !== streamRef.current) {
      video.srcObject = streamRef.current;
    }

    video.muted = true;
    video.playsInline = true;

    if (video.readyState < 2) {
      await new Promise<void>((resolve) => {
        const handleLoaded = () => {
          video.removeEventListener("loadeddata", handleLoaded);
          resolve();
        };
        video.addEventListener("loadeddata", handleLoaded, { once: true });
      });
    }

    await video.play().catch(() => undefined);
  }, []);

  useEffect(() => {
    if ((status !== "capturing" && status !== "error") || !streamRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    if (video.srcObject !== streamRef.current) {
      video.srcObject = streamRef.current;
    }
    video.muted = true;
    video.playsInline = true;
    video.play().catch(() => undefined);
  }, [status]);

  const captureLivePhoto = useCallback((): string => {
    const video = videoRef.current;
    if (!video) {
      throw new Error("Camera not ready.");
    }
    if (!video.videoWidth || !video.videoHeight) {
      throw new Error("Camera feed is not ready yet. Please wait a moment.");
    }

    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;

    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to access drawing context for capture.");
    }

    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    return canvas.toDataURL("image/jpeg", 0.9);
  }, []);

  const startFaceVerification = async () => {
    if (!formData.sessionId) {
      setError("Verification session missing. Please go back and restart the process.");
      setStatus("error");
      return;
    }
    setError("");
    setStatus("preparing");
    try {
      await ensureCamera();
      setStatus("capturing");
    } catch (e) {
      cleanupStream();
      const rawMessage = e instanceof Error ? e.message : "";
      const friendlyMessage = toUserFacingMessage(e, "Unable to access your camera.");
      setError(rawMessage.toLowerCase().includes("denied") ? "Camera permission was denied. Please allow access to continue." : friendlyMessage);
      setStatus("error");
    }
  };

  const captureAndVerify = useCallback(async () => {
    if (!formData.sessionId) {
      setError("Verification session missing. Please restart the process.");
      setStatus("error");
      return;
    }

    try {
      await ensureCamera();
      const livePhoto = captureLivePhoto();
      setStatus("verifying");

      const result = await verifyFace({
        sessionId: formData.sessionId,
        livePhoto,
      });
      const bypassed = Boolean(result.bypassed);

      setFormData((prev) => ({
        ...prev,
        livePhoto,
        faceVerified: result.match,
        faceSimilarity: result.similarity,
        faceDiffPercent: result.diffPercent,
      }));

      if (result.match) {
        cleanupStream();
        setStatus("success");
        const nextDelay = bypassed ? 600 : 1200;
        setTimeout(() => onNext(), nextDelay);
      } else {
        setStatus("error");
        setError("Face verification failed. Please ensure good lighting and try again.");
      }
    } catch (e) {
      const message = toUserFacingMessage(e, "Face verification failed. Please try again.");
      setError(message);
      setStatus("error");
    }
  }, [captureLivePhoto, cleanupStream, ensureCamera, formData.sessionId, onNext, setFormData]);

  const handleRetry = useCallback(async () => {
    setError("");
    if (!formData.sessionId) {
      cleanupStream();
      setStatus("idle");
      return;
    }
    try {
      await ensureCamera();
      setStatus("capturing");
    } catch (e) {
      const message = toUserFacingMessage(e, "Unable to access your camera.");
      setError(message);
      setStatus("error");
    }
  }, [cleanupStream, ensureCamera, formData.sessionId]);

  const handleBack = useCallback(() => {
    cleanupStream();
    onBack();
  }, [cleanupStream, onBack]);

  const metrics = useMemo(() => {
    if (formData.faceSimilarity == null || formData.faceDiffPercent == null) return null;
    return {
      similarity: `${(formData.faceSimilarity * 100).toFixed(1)}%`,
      diff: `${(formData.faceDiffPercent * 100).toFixed(1)}%`,
    };
  }, [formData.faceDiffPercent, formData.faceSimilarity]);

  const hintSet = useMemo(() => {
    switch (status) {
      case "capturing":
        return [
          "Center your face in the circle",
          "Keep eyes level and shoulders visible",
          "Maintain a neutral expression",
        ];
      case "error":
        return [
          "Check your lighting",
          "Ensure your entire face fits inside the guide",
          "Remove hats or glasses",
        ];
      default:
        return [];
    }
  }, [status]);

  const isStreamActive = Boolean(streamRef.current);

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Face Verification</h2>

      {!formData.sessionId && (
        <div style={{ color: "#ef4444", marginBottom: 12 }}>
          No active verification session was found. Please go back to the previous step.
        </div>
      )}

      {status === "idle" && (
        <div>
          <h3>Instructions:</h3>
          <ul style={{ marginBottom: 12, color: "#9ca3af" }}>
            <li>Ensure good lighting</li>
            <li>Look straight at the camera</li>
            <li>Remove glasses and hats</li>
            <li>We'll compare with your government photo</li>
          </ul>
          <button
            onClick={startFaceVerification}
            disabled={!formData.sessionId}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: formData.sessionId ? "#2563eb" : "#6b7280",
              color: "white",
              cursor: formData.sessionId ? "pointer" : "not-allowed",
            }}
          >
            Start Face Verification
          </button>
          {metrics && (
            <div style={{ marginTop: 8, color: "#9ca3af" }}>
              <div>Last similarity: {metrics.similarity}</div>
              <div>Pixel difference: {metrics.diff}</div>
            </div>
          )}
        </div>
      )}

      {status === "preparing" && <LoadingSpinner message="Accessing your camera..." />}

      {status === "capturing" && (
        <div style={{ display: "grid", gap: 16 }}>
          <WebcamFeed status="capturing" hints={hintSet} videoRef={videoRef} isActive={isStreamActive} />
          <p style={{ color: "#9ca3af", textAlign: "center" }}>Align your face within the guide, then capture when ready.</p>
          <button
            onClick={captureAndVerify}
            style={{ padding: "10px 14px", borderRadius: 8, background: "#2563eb", color: "white" }}
          >
            Capture &amp; Verify
          </button>
          {metrics && (
            <div style={{ color: "#9ca3af", textAlign: "center" }}>
              <div>Last similarity: {metrics.similarity}</div>
              <div>Pixel difference: {metrics.diff}</div>
            </div>
          )}
        </div>
      )}

      {status === "verifying" && <LoadingSpinner message="Verifying your face match..." />}

      {status === "success" && (
        <div style={{ color: "#10b981" }}>
          <div style={{ fontSize: 36 }}>✓</div>
          <h3>Face Verification Successful!</h3>
          <p>Redirecting to next step...</p>
        </div>
      )}

      {status === "error" && (
        <div style={{ color: "#ef4444", display: "grid", gap: 12 }}>
          <WebcamFeed status="error" hints={hintSet} videoRef={videoRef} isActive={isStreamActive} />
          <div>
            <div style={{ fontSize: 36 }}>✗</div>
            <h3>Verification Failed</h3>
            <p>{error}</p>
          </div>
          {metrics && (
            <div style={{ color: "#9ca3af" }}>
              <div>Last similarity: {metrics.similarity}</div>
              <div>Pixel difference: {metrics.diff}</div>
            </div>
          )}
          <button onClick={handleRetry} style={{ padding: "8px 12px", borderRadius: 8, background: "#374151", color: "white" }}>
            Try Again
          </button>
        </div>
      )}

      <button onClick={handleBack} style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "#374151", color: "white" }}>
        Back
      </button>
    </div>
  );
};

export default FaceVerificationStep;
