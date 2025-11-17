import React from "react";
import "./square-loader.css";

const ANIMATION_DELAYS = [
  0,
  -1.4285714286,
  -2.8571428571,
  -4.2857142857,
  -5.7142857143,
  -7.1428571429,
  -8.5714285714,
  -10,
];

export type SquareLoaderProps = {
  message?: string;
  className?: string;
};

const SquareLoader: React.FC<SquareLoaderProps> = ({ message, className }) => {
  return (
    <div className={["square-loader-wrapper", className].filter(Boolean).join(" ")}>
      <div className="square-loader">
        {ANIMATION_DELAYS.map((delay, idx) => (
          <span
            key={idx}
            className="square-loader-square"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>
      {message && <p className="square-loader-message">{message}</p>}
    </div>
  );
};

export default SquareLoader;
