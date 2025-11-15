import React, { useMemo, useState } from "react";
import ProgressIndicator from "@/modules/verification/ui/ProgressIndicator";
import "@/modules/verification/verify.css";
import CountryIDStep from "./steps/CountryIDStep";
import FaceVerificationStep from "./steps/FaceVerificationStep";
import DataFetchStep from "./steps/DataFetchStep";
import ReviewConsentStep from "./steps/ReviewConsentStep";
import MintingStep from "./steps/MintingStep";

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
  consentGiven: boolean;
  mintDigest: string | null;
  mintRequestId: string | null;
  mintRequestDigest: string | null;
};

export type StepComponentProps = {
  formData: VerificationForm;
  setFormData: React.Dispatch<React.SetStateAction<VerificationForm>>;
  onNext: () => void;
  onBack: () => void;
  goToStep: (index: number) => void;
  resetForm: () => void;
};

type StepDefinition = {
  title: string;
  component: React.ComponentType<StepComponentProps>;
};

const initialFormData: VerificationForm = {
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
  consentGiven: false,
  mintDigest: null,
  mintRequestId: null,
  mintRequestDigest: null,
};

/**
 * VerificationPortal orchestrates the full verification journey:
 * 1. Collect government ID
 * 2. Capture & verify face
 * 3. Pull verified data
 * 4. Capture consent
 * 5. Mint the attestation
 */
const VerificationPortal: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<VerificationForm>(initialFormData);

  const steps: StepDefinition[] = useMemo(
    () => [
      { title: "Government ID", component: CountryIDStep },
      { title: "Face Capture", component: FaceVerificationStep },
      { title: "Verified Data", component: DataFetchStep },
      { title: "Consent", component: ReviewConsentStep },
      { title: "Mint", component: MintingStep },
    ],
    []
  );

  const goToStep = (index: number) => {
    setCurrentStep((prev) => {
      if (index < 0) return 0;
      if (index >= steps.length) return steps.length - 1;
      return index;
    });
  };

  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 0));
  const resetForm = () => {
    setFormData(initialFormData);
    setCurrentStep(0);
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="v-container">
  <h1 className="v-title">Suirify Verification</h1>
      <ProgressIndicator
        currentStep={currentStep}
        totalSteps={steps.length}
        stepTitles={steps.map((step) => step.title)}
      />

      <div className="v-card">
        <CurrentStepComponent
          formData={formData}
          setFormData={setFormData}
          onNext={handleNext}
          onBack={handleBack}
          goToStep={goToStep}
          resetForm={resetForm}
        />
      </div>
    </div>
  );
};

export default VerificationPortal;
