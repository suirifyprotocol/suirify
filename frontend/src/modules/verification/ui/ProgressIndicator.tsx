import React from "react";

const ProgressIndicator: React.FC<{
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
}> = ({ currentStep, totalSteps, stepTitles }) => {
  return (
    <div style={{ display: "flex", gap: 8, margin: "16px 0", flexWrap: "wrap" }}>
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            borderRadius: 8,
            background: i <= currentStep ? "#e0f2fe" : "#f3f4f6",
            color: i <= currentStep ? "#0369a1" : "#6b7280",
            fontSize: 12,
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              background: i < currentStep ? "#10b981" : i === currentStep ? "#2563eb" : "#e5e7eb",
              display: "inline-block",
            }}
          />
          <span>{stepTitles[i]}</span>
        </div>
      ))}
    </div>
  );
};

export default ProgressIndicator;
