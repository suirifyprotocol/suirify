import React from "react";

/**
 * LoadingSpinner
 * Shows a small spinner with an optional message.
 * Styling is defined in index.css (.v-spinner*, @keyframes v-spin)
 */
const LoadingSpinner: React.FC<{ message?: string }> = ({ message }) => (
  <div className="v-spinner-container">
    <div className="v-spinner" />
    {message && <p className="v-muted" style={{ textAlign: "center" }}>{message}</p>}
  </div>
);

export default LoadingSpinner;
