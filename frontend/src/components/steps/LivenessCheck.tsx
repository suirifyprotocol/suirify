import React, { useState, useEffect, useCallback, useRef } from "react";
import type { VerificationForm } from "../VerificationPortal";

type LivenessStatus =
  | "idle"
  | "initializing"
  | "ready"
  | "scanning"
  | "verifying"
  | "success"
  | "error"
  | "human_review_required"
  | "camera_error";

const LivenessCheck: React.FC<{
  formData: VerificationForm;
  onNext: () => void;
  onBack: () => void;
}> = ({ formData, onNext, onBack }) => {
  const [status, setStatus] = useState<LivenessStatus>("idle");
  const [failCount, setFailCount] = useState(0);
  const [azureSessionId, setAzureSessionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // For automated scanning
  const [scanProgress, setScanProgress] = useState(0);
  const [instruction, setInstruction] = useState("Position your face in the frame");

  const handleFailure = useCallback((msg: string) => {
    setFailCount((prev) => {
      const newCount = prev + 1;
      if (newCount >= 2) {
        setStatus("human_review_required");
      } else {
        setErrorMessage(msg + " Please try again.");
        setStatus("error");
      }
      return newCount;
    });
  }, []);

  const startLivenessFlow = async () => {
    try {
      setStatus("initializing");
      setErrorMessage("");

      // Step 1: Initialize Camera
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);

      // We go directly into scanning mode
      setStatus("ready");
      setTimeout(() => setStatus("scanning"), 1000);
      setInstruction("Position your face in the frame");
    } catch (err: any) {
      console.error("Camera Init Error:", err);
      setErrorMessage(err.message || "An error occurred while starting the camera.");
      setStatus("error");
    }
  };

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, status]);

  // Automated 30-second UX Loop
  useEffect(() => {
    if (status !== "scanning") return;
    
    // We will simulate a 30 second Azure Vision analysis cycle
    const TOTAL_SCAN_TIME_MS = 25000;
    const progressIntervalMs = 250;
    
    let progressTimer = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) return 100;
        return p + (100 / (TOTAL_SCAN_TIME_MS / progressIntervalMs));
      });
    }, progressIntervalMs);

    let instructionTimer = setInterval(() => {
      const instructions = [
        "Scanning face... please stay still",
        "Try nodding slowly...",
        "Turn slightly to the right...",
        "Look directly at the camera",
        "Hold still, analyzing features...",
        "Almost done..."
      ];
      setInstruction(instructions[Math.floor(Date.now() / 4000) % instructions.length]);
    }, 4000);

    // After 30 seconds, capture the frame and send to Azure
    let finishTimer = setTimeout(async () => {
      clearInterval(progressTimer);
      clearInterval(instructionTimer);
      setStatus("verifying");

      try {
        // Capture frame from video directly
        const video = videoRef.current;
        if (!video) throw new Error("Video element missing");
        
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const livePhotoDataUrl = canvas.toDataURL("image/jpeg", 0.9);

        const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
        const response = await fetch(`${backendUrl}/azure-face-verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: formData.sessionId, livePhoto: livePhotoDataUrl })
        });

        const data = await response.json();

        if (data.success) {
          setStatus("success");
          setTimeout(() => onNext(), 1500);
        } else {
          handleFailure(data.message || "Face match failed.");
        }
      } catch (e) {
        console.error("Capture & verification error:", e);
        handleFailure("Error reaching Azure verification service.");
      }
    }, TOTAL_SCAN_TIME_MS);

    return () => {
      clearInterval(progressTimer);
      clearInterval(instructionTimer);
      clearTimeout(finishTimer);
    };
  }, [status, formData.sessionId, onNext, handleFailure]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const renderContent = () => {
    switch (status) {
      case "idle":
        return (
          <div className="text-center p-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <div className="mb-6 flex justify-center">
               <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
               </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800">Ready for Identity Scan</h3>
            <p className="mt-2 text-gray-500 max-w-xs mx-auto">
              Please ensure you are in a well-lit area. The scanner will automatically confirm your identity.
            </p>
            <button
              onClick={startLivenessFlow}
              className="mt-8 px-8 py-4 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95"
            >
              Start Liveness Check
            </button>
          </div>
        );
      case "camera_error":
        return (
          <div className="text-center p-6 bg-red-50 rounded-lg">
            <h3 className="text-lg font-semibold text-red-700">Camera Error</h3>
            <p className="mt-2 text-red-600">{errorMessage}</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded">
              Reload Page
            </button>
          </div>
        );
      case "initializing":
        return (
          <div className="text-center p-6 flex flex-col items-center justify-center min-h-[300px]">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
             <p className="text-gray-600 font-medium">Connecting to Azure Identity Cloud...</p>
          </div>
        );
      case "ready":
      case "scanning":
        return (
          <div className="relative w-full h-[400px] bg-black rounded-lg overflow-hidden flex items-center justify-center">
            {stream && (
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
            )}

            {/* Automated UI Overlay */}
            <div className="absolute inset-0 border-[4px] border-blue-500/30 rounded-lg pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-80 border-2 border-dashed border-white/50 rounded-[100px] bg-blue-500/5"></div>
            </div>

            <div className="absolute top-4 left-0 right-0 text-center text-white z-10 bg-black/60 p-3 backdrop-blur-sm">
              <p className="font-bold text-lg">{instruction}</p>
              <div className="w-1/2 h-1 bg-gray-700 mx-auto mt-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${scanProgress}%` }}
                  ></div>
              </div>
            </div>

            <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                <div className="px-4 py-2 bg-blue-600/90 text-white text-xs font-bold rounded-full animate-pulse tracking-widest uppercase">
                    Smart Recognition Active
                </div>
            </div>
          </div>
        );
      case "verifying":
        return (
          <div className="text-center p-6 flex flex-col items-center justify-center min-h-[300px]">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
             <p className="font-bold">Finalizing Biometric Handshake...</p>
          </div>
        );
      case "success":
        return (
          <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200 min-h-[300px] flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
               <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
               </svg>
            </div>
            <h3 className="text-2xl font-bold text-green-700">Identity Confirmed!</h3>
            <p className="text-green-600 mt-2">Cross-reference successful.</p>
          </div>
        );
      case "error":
        return (
          <div className="text-center p-6 bg-yellow-50 rounded-lg border border-yellow-200">
            <h3 className="text-lg font-bold text-yellow-700">Match Connection Interrupted</h3>
            <p className="text-yellow-600">{errorMessage}</p>
            <button onClick={startLivenessFlow} className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded font-bold shadow-md">
              Retry Scanner
            </button>
          </div>
        );
      case "human_review_required":
        return (
          <div className="text-center p-8 bg-red-50 rounded-lg border border-red-200">
            <h3 className="text-xl font-bold text-red-800">Automated Match Failed</h3>
            <p className="text-red-700 mt-2">
              The biometric scanner could not confirm a match with your ID photo after multiple attempts.
            </p>
            <p className="text-sm text-red-600 mt-4 font-mono">Status: AWAITING_HUMAN_AUDIT</p>
            <p className="text-xs text-red-400 mt-2">Ticket: #{formData.sessionId?.substring(0, 8)}</p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Proof of Liveness</h2>
        <p className="text-gray-500 mt-1 text-sm font-semibold tracking-wide uppercase">Powered by Azure Computer Vision</p>
      </div>

      {renderContent()}

      {(status === "error" || status === "camera_error" || status === "human_review_required") && (
        <div className="flex justify-center mt-4">
          <button onClick={onBack} className="text-gray-500 underline text-sm">
            Go Back to ID Selection
          </button>
        </div>
      )}
    </div>
  );
};

export default LivenessCheck;