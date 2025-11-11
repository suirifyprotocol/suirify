import React from "react";

type WebcamFeedStatus = "idle" | "preparing" | "capturing" | "ok" | "error";

type WebcamFeedProps = {
  status?: WebcamFeedStatus;
  hints?: string[];
  videoRef?: React.RefObject<HTMLVideoElement>;
  isActive?: boolean;
};

const statusCopy: Record<WebcamFeedStatus, { label: string; color: string }> = {
  idle: { label: "Align your face", color: "#f59e0b" },
  preparing: { label: "Starting camera", color: "#6366f1" },
  capturing: { label: "Hold still", color: "#2563eb" },
  ok: { label: "Great position", color: "#10b981" },
  error: { label: "Adjust your pose", color: "#ef4444" },
};

const WebcamFeed: React.FC<WebcamFeedProps> = ({ status = "idle", hints = [], videoRef, isActive }) => {
  const tone = statusCopy[status] ?? statusCopy.idle;
  const active = typeof isActive === "boolean" ? isActive : status === "capturing" || status === "ok";
  const containerSize = "clamp(200px, 55vw, 320px)";

  return (
    <div
      style={{
        width: containerSize,
        maxWidth: 320,
        display: "grid",
        placeItems: "center",
        gap: 12,
        color: "#e5e7eb",
        margin: "0 auto 16px",
      }}
    >
      <div style={{ width: "100%", position: "relative" }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            paddingTop: "100%",
            borderRadius: "50%",
            background: "radial-gradient(circle at 50% 42%, rgba(37, 99, 235, 0.45), rgba(15, 23, 42, 0.85))",
            border: `3px solid ${tone.color}`,
            boxShadow: "0 20px 40px rgba(37, 99, 235, 0.25)",
            overflow: "hidden",
          }}
        >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              transform: "scaleX(-1)",
              opacity: active ? 1 : 0,
              transition: "opacity 0.3s ease",
              filter: status === "error" ? "grayscale(0.4)" : "none",
            }}
          />

          {!active && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                color: "rgba(226, 232, 240, 0.75)",
                fontSize: 14,
                textAlign: "center",
                padding: "0 16px",
                background: "linear-gradient(180deg, rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.9))",
              }}
            >
              <span>{status === "preparing" ? "Requesting camera access..." : "Waiting for camera..."}</span>
            </div>
          )}

          <div
            style={{
              position: "absolute",
              inset: "10%",
              borderRadius: "50%",
              border: "2px dashed rgba(148, 163, 184, 0.45)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(15, 23, 42, 0.85)",
              borderRadius: 999,
              padding: "4px 12px",
              fontSize: 12,
              color: tone.color,
              pointerEvents: "none",
            }}
          >
            {tone.label}
          </div>
        </div>
      </div>

      {hints.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
          {hints.map((hint) => (
            <li key={hint} style={{ marginTop: 4 }}>
              {hint}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default WebcamFeed;
