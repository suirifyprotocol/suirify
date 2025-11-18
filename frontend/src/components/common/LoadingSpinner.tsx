import React from "react";
import SquareLoader from "./SquareLoader";

const LoadingSpinner: React.FC<{ message?: string }> = ({ message }) => (
  <div className="square-loader-screen">
    <SquareLoader message={message} />
  </div>
);

export default LoadingSpinner;
