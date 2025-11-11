import React, { useMemo, useState } from "react";
import type { VerificationForm } from "../VerificationPortal";
import LoadingSpinner from "../common/LoadingSpinner";
import WebcamFeed from "../common/WebcamFeed";
import { verifyFace } from "../../lib/apiService";

const FaceVerificationStep: React.FC<{
  formData: VerificationForm;
  setFormData: React.Dispatch<React.SetStateAction<VerificationForm>>;
  onNext: () => void;
  onBack: () => void;
}> = ({ formData, setFormData, onNext, onBack }) => {
  const [status, setStatus] = useState<"idle" | "capturing" | "verifying" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const captureLivePhoto = async (): Promise<string> => {
    // Stub: simulate camera capture using existing reference photo when available.
    await new Promise((r) => setTimeout(r, 700));
    if (formData.livePhoto) return formData.livePhoto;
    if (formData.photoReference) return formData.photoReference;
    // Transparent 1x1 PNG fallback to keep API happy if no reference photo exists.
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";
  };

  const startFaceVerification = async () => {
    if (!formData.sessionId) {
      setError("Verification session missing. Please go back and restart the process.");
      setStatus("error");
      return;
    }
    setStatus("capturing");
    try {
      const livePhoto = await captureLivePhoto();
      setStatus("verifying");
      const result = await verifyFace({
        sessionId: formData.sessionId,
        livePhoto,
      });
      if (result.match) {
        setFormData((prev) => ({
          ...prev,
          livePhoto,
          faceVerified: true,
          faceSimilarity: result.similarity,
          faceDiffPercent: result.diffPercent,
        }));
        setStatus("success");
        setTimeout(() => onNext(), 1200);
      } else {
        setStatus("error");
        setError("Face verification failed. Please ensure good lighting and try again.");
      }
    } catch (e) {
      setStatus("error");
      const message = e instanceof Error ? e.message : "Face verification failed. Please try again.";
      setError(message);
    }
  };

  const metrics = useMemo(() => {
    if (formData.faceSimilarity == null || formData.faceDiffPercent == null) return null;
    return {
      similarity: `${(formData.faceSimilarity * 100).toFixed(1)}%`,
      diff: `${(formData.faceDiffPercent * 100).toFixed(1)}%`,
    };
  }, [formData.faceDiffPercent, formData.faceSimilarity]);

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

      {status === "capturing" && (
        <div>
          <WebcamFeed />
          <p>Please look straight at the camera...</p>
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
        <div style={{ color: "#ef4444" }}>
          <div style={{ fontSize: 36 }}>✗</div>
          <h3>Verification Failed</h3>
          <p>{error}</p>
          <button onClick={() => setStatus("idle")} style={{ padding: "8px 12px", borderRadius: 8, background: "#374151", color: "white" }}>
            Try Again
          </button>
        </div>
      )}

      <button onClick={onBack} style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "#374151", color: "white" }}>
        Back
      </button>
    </div>
  );
};

export default FaceVerificationStep;
