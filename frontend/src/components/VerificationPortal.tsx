import React, { useState } from "react";
import ProgressIndicator from "./common/ProgressIndicator";
import CountryIDStep from "./steps/CountryIDStep.tsx";
import DataFetchStep from "./steps/DataFetchStep.tsx";
import FaceVerificationStep from "./steps/FaceVerificationStep.tsx";
import ReviewConsentStep from "./steps/ReviewConsentStep.tsx";
import MintingStep from "./steps/MintingStep.tsx";

export type VerificationForm = {
  sessionId: string | null;
  country: string;
  idNumber: string;
  fullName: string;
  dateOfBirth: string;
  photoReference: string | null;
  walletAddress: string | null;
  livePhoto: string | null;
  faceVerified: boolean;
  faceSimilarity: number | null;
  faceDiffPercent: number | null;
  mintDigest: string | null;
};

const VerificationPortal: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<VerificationForm>({
    sessionId: null,
    country: "",
    idNumber: "",
    fullName: "",
    dateOfBirth: "",
    photoReference: null,
    walletAddress: null,
    livePhoto: null,
    faceVerified: false,
    faceSimilarity: null,
    faceDiffPercent: null,
    mintDigest: null,
  });

  const steps = [
    { component: CountryIDStep, title: "Country & ID" },
    { component: DataFetchStep, title: "Data Verification" },
    { component: FaceVerificationStep, title: "Face Check" },
    { component: ReviewConsentStep, title: "Review & Consent" },
    { component: MintingStep, title: "Minting" },
  ];

  const CurrentStepComponent: any = steps[currentStep].component;

  return (
    <div style={{ maxWidth: 760, margin: "24px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>SUIrify Verification</h1>
      <ProgressIndicator
        currentStep={currentStep}
        totalSteps={steps.length}
        stepTitles={steps.map((s) => s.title)}
      />

      <div style={{ background: "#0b1220", color: "#e5e7eb", padding: 16, borderRadius: 12 }}>
        <CurrentStepComponent
          formData={formData}
          setFormData={setFormData}
          onNext={() => setCurrentStep((p: number) => Math.min(p + 1, steps.length - 1))}
          onBack={() => setCurrentStep((p: number) => Math.max(p - 1, 0))}
        />
      </div>
    </div>
  );
};

export default VerificationPortal;
