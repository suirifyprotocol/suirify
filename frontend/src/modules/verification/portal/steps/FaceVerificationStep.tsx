import React, { useState } from "react";
import type { VerificationForm } from "../VerificationPortal.tsx";
import LoadingSpinner from "../../ui/LoadingSpinner";
import WebcamFeed from "../../ui/WebcamFeed";
import { faceMatch } from "@/lib/mockApi";

/**
 * Step 3: Face Verification (Mock)
 * - Shows instructions, simulates webcam capture, calls mock faceMatch.
 * - Auto-advances on success; allows retry on failure.
 */
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
      <h2 className="v-section-title">Face Verification</h2>

      {status === "idle" && (
        <div>
          <h3>Instructions:</h3>
          <ul className="v-muted">
            <li>Ensure good lighting</li>
            <li>Look straight at the camera</li>
            <li>Remove glasses and hats</li>
            <li>We'll compare with your government photo</li>
          </ul>
          <button onClick={startFaceVerification} className="v-btn-primary">
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
        <div className="v-success">
          <div>✓</div>
          <h3>Face Verification Successful!</h3>
          <p>Redirecting to next step...</p>
        </div>
      )}

      {status === "error" && (
        <div className="v-error">
          <div>✗</div>
          <h3>Verification Failed</h3>
          <p>{error}</p>
          <button onClick={() => setStatus("idle")} className="v-btn-secondary">
            Try Again
          </button>
        </div>
      )}

      <button onClick={onBack} className="v-btn-secondary v-margin-top">
        Back
      </button>
    </div>
  );
};

export default FaceVerificationStep;
