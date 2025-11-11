import React from "react";

// Stub webcam feed. In a full implementation, use getUserMedia and capture frames.
const WebcamFeed: React.FC = () => {
  return (
    <div
      style={{
        width: 280,
        height: 200,
        borderRadius: 12,
        background: "#111827",
        display: "grid",
        placeItems: "center",
        color: "#9ca3af",
        marginBottom: 12,
      }}
    >
      <span>Webcam preview (stub)</span>
    </div>
  );
};

export default WebcamFeed;
