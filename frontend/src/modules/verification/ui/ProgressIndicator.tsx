import React from "react";

/**
 * ProgressIndicator
 * Renders chips for each step with a dot indicating progress.
 * Uses classes: .v-exp-container, .v-step-chip, .v-chip-done/.v-chip-pending, .v-dot-*
 */
const ProgressIndicator: React.FC<{
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
}> = ({ currentStep, totalSteps, stepTitles }) => (
  <div className="v-exp-container">
    {Array.from({ length: totalSteps }).map((_, i) => {
      const chipCls = i <= currentStep ? "v-step-chip v-chip-done" : "v-step-chip v-chip-pending";
      const dotCls = i < currentStep ? "v-dot v-dot-complete" : i === currentStep ? "v-dot v-dot-current" : "v-dot v-dot-upcoming";
      return (
        <div key={i} className={chipCls}>
          <span className={dotCls} />
          <span>{stepTitles[i]}</span>
        </div>
      );
    })}
  </div>
);

export default ProgressIndicator;
