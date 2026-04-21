import React, { useEffect, useMemo, useState } from "react";
import type { StepComponentProps } from "../VerificationPortal";
import { VerificationProgress } from "@/modules/verification/components";
import { mockVerificationProgressRunning } from "@/data/mock";
import type { VerificationProgressPayload, VerificationStageStatus } from "@/types";

const STAGE_ADVANCE_MS = 850;

export const VerificationProgressStep: React.FC<StepComponentProps> = ({ onNext, onBack }) => {
  const [started, setStarted] = useState(false);
  const [cursor, setCursor] = useState(0);

  const basePayload = useMemo<VerificationProgressPayload>(() => {
    return {
      ...mockVerificationProgressRunning,
      stages: mockVerificationProgressRunning.stages.map((stage) => ({
        ...stage,
        status: "pending" as VerificationStageStatus,
      })),
      rulesEngineResult: undefined,
      updatedAt: Date.now(),
    };
  }, []);

  const payload = useMemo<VerificationProgressPayload>(() => {
    const stages = basePayload.stages.map((stage, index) => {
      if (!started) {
        return { ...stage, status: "pending" as VerificationStageStatus };
      }
      if (index < cursor) {
        return { ...stage, status: "pass" as VerificationStageStatus };
      }
      if (index === cursor) {
        return { ...stage, status: "running" as VerificationStageStatus };
      }
      return { ...stage, status: "pending" as VerificationStageStatus };
    });

    const isDone = started && cursor >= basePayload.stages.length;
    return {
      ...basePayload,
      stages,
      rulesEngineResult: isDone ? "PASS" : undefined,
      updatedAt: Date.now(),
    };
  }, [basePayload, cursor, started]);

  useEffect(() => {
    if (!started) return;
    if (cursor > basePayload.stages.length) return;

    const timer = window.setTimeout(() => {
      setCursor((prev) => prev + 1);
    }, STAGE_ADVANCE_MS);

    return () => window.clearTimeout(timer);
  }, [basePayload.stages.length, cursor, started]);

  useEffect(() => {
    if (!started) return;
    if (cursor === basePayload.stages.length + 1) {
      onNext();
    }
  }, [basePayload.stages.length, cursor, onNext, started]);

  return (
    <div className="v-grid">
      <h2 className="v-section-title">AI Verification Pipeline</h2>
      <p className="v-muted">
        NIN check, face match, liveness, PII purge, and deterministic rules decision are executed in sequence.
      </p>

      <VerificationProgress payload={payload} />

      <div className="v-row v-margin-top">
        <button type="button" className="v-btn-secondary" onClick={onBack} aria-label="Go back to consent step">
          Back
        </button>

        {!started ? (
          <button
            type="button"
            className="v-btn-primary"
            onClick={() => {
              setCursor(0);
              setStarted(true);
            }}
            aria-label="Run verification pipeline"
          >
            Run Verification Checks
          </button>
        ) : (
          <button
            type="button"
            className="v-btn-primary"
            disabled
            aria-label="Verification pipeline is running"
          >
            Running...
          </button>
        )}
      </div>
    </div>
  );
};

export default VerificationProgressStep;
