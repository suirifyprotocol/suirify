import React, { useState } from "react";
import type { VerificationForm } from "../VerificationPortal";
import LoadingSpinner from "../common/LoadingSpinner";
import WebcamFeed from "../common/WebcamFeed";
import { faceMatch } from "../../lib/mockApi";

const FaceVerificationStep: React.FC<{
  formData: VerificationForm;
  setFormData: React.Dispatch<React.SetStateAction<VerificationForm>>;
  onNext: () => void;
  onBack: () => void;
}> = ({ formData, setFormData, onNext, onBack }) => {
  const [status, setStatus] = useState<"idle" | "capturing" | "verifying" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const generateSessionId = () => Math.random().toString(36).slice(2);

  const captureLivePhoto = async (): Promise<string> => {
    // Stub: this would capture an image from webcam; we simulate a data URL
    await new Promise((r) => setTimeout(r, 700));
    return formData.photoReference || "data:image/png;base64,stub";
  };

  const startFaceVerification = async () => {
    setStatus("capturing");
    try {
      const livePhoto = await captureLivePhoto();
      setStatus("verifying");
      const result = await faceMatch({
        livePhoto,
        referencePhoto: formData.photoReference || "",
        sessionId: generateSessionId(),
      });
      if (result.match) {
        setFormData((p) => ({ ...p, faceVerified: true }));
        setStatus("success");
        setTimeout(() => onNext(), 1200);
      } else {
        setStatus("error");
        setError("Face verification failed. Please ensure good lighting and try again.");
      }
    } catch (e) {
      setStatus("error");
      setError("Face verification failed. Please try again.");
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Face Verification</h2>

      {status === "idle" && (
        <div>
          <h3>Instructions:</h3>
          <ul style={{ marginBottom: 12, color: "#9ca3af" }}>
            <li>Ensure good lighting</li>
            <li>Look straight at the camera</li>
            <li>Remove glasses and hats</li>
            <li>We'll compare with your government photo</li>
          </ul>
          <button onClick={startFaceVerification} style={{ padding: "10px 14px", borderRadius: 8, background: "#2563eb", color: "white" }}>
            Start Face Verification
          </button>
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
