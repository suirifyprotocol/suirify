import React from "react";

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message }) => {
  return (
    <div style={{ display: "grid", placeItems: "center", padding: 24 }}>
      <div className="spin" style={{
        width: 36,
        height: 36,
        border: "3px solid #e5e7eb",
        borderTopColor: "#2563eb",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        marginBottom: 12,
      }} />
      {message && <p style={{ color: "#6b7280", textAlign: "center" }}>{message}</p>}
      <style>{`@keyframes spin {to {transform: rotate(360deg)}}`}</style>
    </div>
  );
};

export default LoadingSpinner;
