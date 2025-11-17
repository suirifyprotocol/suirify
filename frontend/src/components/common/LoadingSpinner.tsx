import React from "react";
import SquareLoader from "./SquareLoader";

const LoadingSpinner: React.FC<{ message?: string }> = ({ message }) => (
  <SquareLoader message={message} />
);

export default LoadingSpinner;
