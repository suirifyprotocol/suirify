import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import {
  fetchCountries,
  startVerification,
  verifyFace,
  completeVerification,
  fetchMintConfig,
  lookupMintRequest,
  finalizeMint,
  type CountryOption,
} from "@/lib/apiService";
import { calculateAge } from "@/lib/identityUtils";
import "./verifyingportal.css";
import locationIcon from "@/modules/icons/location.png";
import faceIcon from "@/modules/icons/face.png";
import docIcon from "@/modules/icons/doc.png";
import reviewIcon from "@/modules/icons/review.png";
import mintingIcon from "@/modules/icons/minting.png";
import markIcon from "@/modules/icons/mark.png";
import SquareLoader from "@/components/common/SquareLoader";

type Step = 1 | 2 | 2.5 | 3 | 4 | 5;

type VerificationForm = {
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

const initialForm: VerificationForm = {
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

const idValidation: Record<string, { placeholder: string; pattern: RegExp }> = {
  Nigeria: { placeholder: "Enter your 11-digit NIN", pattern: /^\d{11}$/ },
  Ghana: { placeholder: "Enter Ghana Card number", pattern: /^GHA-\w{9}$/ },
  Kenya: { placeholder: "Enter National ID", pattern: /^\d{8}$/ },
};

const ConnectedVerifyingPortal: React.FC = () => {
  const account = useCurrentAccount();
  const signAndExecute = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [form, setForm] = useState<VerificationForm>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [faceVerifying, setFaceVerifying] = useState(false);
  const faceVerifyingRef = useRef(false);
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);

  // camera refs for face capture
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetchCountries();
        if (mounted && Array.isArray(res.countries)) setCountries(res.countries);
      } catch (e) {
        // fallback silently; UI still shows static options
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.add("vp-theme");
    return () => {
      document.body.classList.remove("vp-theme");
    };
  }, []);

  const availableCountries = useMemo(() => {
    const list = countries.filter((c) => !!idValidation[c.name]);
    if (list.length) return list.map((c) => ({ name: c.name, label: c.label || c.name }));
    return Object.keys(idValidation).map((name) => ({ name, label: name }));
  }, [countries]);

  useEffect(() => {
    if (form.country) return;
    const defaultCountry = availableCountries[0]?.name || Object.keys(idValidation)[0] || "";
    if (defaultCountry) {
      setForm((prev) => ({ ...prev, country: defaultCountry }));
    }
  }, [availableCountries, form.country]);

  const validateId = useCallback((country: string, idNumber: string) => {
    const cfg = idValidation[country];
    if (!cfg) return false;
    return cfg.pattern.test(idNumber);
  }, []);

  // cleanup camera stream
  const cleanupStream = useCallback(() => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    } catch {}
  }, []);

  useEffect(() => () => cleanupStream(), [cleanupStream]);

  const clearPreviewTimer = useCallback(() => {
    if (previewTimerRef.current) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearPreviewTimer(), [clearPreviewTimer]);

  useEffect(() => {
    if (currentStep !== 2.5) {
      clearPreviewTimer();
      setCapturedFrame(null);
    }
  }, [clearPreviewTimer, currentStep]);

  const ensureCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera not supported in this browser.");
    if (!streamRef.current) {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    }
    const video = videoRef.current;
    if (video) {
      if (video.srcObject !== streamRef.current) video.srcObject = streamRef.current;
      video.muted = true;
      video.playsInline = true;
      await video.play().catch(() => undefined);
    }
  }, []);

  const resumeCamera = useCallback(async () => {
    const stream = streamRef.current;
    const video = videoRef.current;
    if (!stream || !video) return;
    if (video.srcObject !== stream) video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play().catch(() => undefined);
  }, []);

  const captureLivePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) throw new Error("Camera not ready.");
    if (!video.videoWidth || !video.videoHeight) throw new Error("Camera feed not ready yet.");
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Unable to capture image.");
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.9);
  }, []);

  // Step handlers
  const handleNextFromStep1 = async () => {
    if (!form.country || !validateId(form.country, form.idNumber)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await startVerification({ country: form.country, idNumber: form.idNumber });
      setForm((prev) => ({
        ...prev,
        sessionId: res.sessionId,
        fullName: "",
        dateOfBirth: "",
        photoReference: null,
        walletAddress: null,
        livePhoto: null,
        faceVerified: false,
        faceSimilarity: null,
        faceDiffPercent: null,
        mintDigest: null,
        mintRequestId: null,
        mintRequestDigest: null,
      }));
      setCurrentStep(2);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to start verification.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const startFaceStep = () => {
    if (!form.sessionId) {
      setError("No active verification session. Please restart the process.");
      return;
    }
    setError(null);
    setCurrentStep(2.5);
  };

  const captureAndVerify = async () => {
    if (faceVerifyingRef.current) return;
    if (!form.sessionId) {
      setError("No active verification session. Go back and retry.");
      return;
    }
    faceVerifyingRef.current = true;
    setFaceVerifying(true);
    setLoading(true);
    setError(null);
    let shouldResumeStream = true;
    let releaseLockInFinally = true;
    try {
      await ensureCamera();
      const livePhoto = captureLivePhoto();
      setCapturedFrame(livePhoto);
      const result = await verifyFace({ sessionId: form.sessionId, livePhoto });
      setForm((prev) => ({
        ...prev,
        livePhoto,
        faceVerified: result.match,
        faceSimilarity: result.similarity,
        faceDiffPercent: result.diffPercent,
      }));

      if (result.match) {
        shouldResumeStream = false;
        releaseLockInFinally = false;
        cleanupStream();
        clearPreviewTimer();
        previewTimerRef.current = window.setTimeout(() => {
          setCapturedFrame(null);
          faceVerifyingRef.current = false;
          setFaceVerifying(false);
          setCurrentStep(3);
        }, 3000);
      } else {
        setError("Face verification failed. Please try again.");
        setCapturedFrame(null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Face verification failed.";
      setError(msg);
      setCapturedFrame(null);
    } finally {
      if (releaseLockInFinally) {
        faceVerifyingRef.current = false;
        setFaceVerifying(false);
      }
      setLoading(false);
      if (shouldResumeStream) {
        await resumeCamera();
      }
    }
  };

  useEffect(() => {
    if (currentStep !== 2.5 && faceVerifyingRef.current) {
      faceVerifyingRef.current = false;
      setFaceVerifying(false);
    }
  }, [currentStep]);

  useEffect(() => {
    if (currentStep !== 2.5 || !form.sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        await ensureCamera();
      } catch (e) {
        if (cancelled) return;
        cleanupStream();
        const msg = e instanceof Error ? e.message : "Unable to access your camera.";
        setError(msg.includes("denied") ? "Camera permission was denied. Please allow access to continue." : msg);
        setCurrentStep(2);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cleanupStream, currentStep, ensureCamera, form.sessionId]);

  const fetchVerifiedData = useCallback(async () => {
    if (!form.sessionId || !account?.address) return;
    setLoading(true);
    setError(null);
    try {
      const res = await completeVerification({ sessionId: form.sessionId, walletAddress: account.address });
      const data = res.consentData;
      if (data) {
        setForm((prev) => ({
          ...prev,
          fullName: data.fullName || prev.fullName,
          dateOfBirth: data.dateOfBirth || prev.dateOfBirth,
          photoReference: data.photoReference || prev.photoReference,
          walletAddress: account.address,
        }));
      } else {
        setError("No verification data returned for this session.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to fetch verified data.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [account?.address, form.sessionId]);

  useEffect(() => {
    if (currentStep === 3 && form.faceVerified && !form.fullName && form.sessionId && account?.address) {
      void fetchVerifiedData();
    }
  }, [account?.address, currentStep, fetchVerifiedData, form.faceVerified, form.fullName, form.sessionId]);

  const onConsentToggle = (v: boolean) => setForm((p) => ({ ...p, consentGiven: v }));

  const runMintFlow = useCallback(async () => {
    if (!form.sessionId) {
      setError("Verification session missing or already consumed. Restart the process.");
      return;
    }
    if (!account?.address) {
      setError("Connect your wallet to sign the transaction.");
      return;
    }

    try {
      setError(null);

      let currentRequestId = form.mintRequestId;
      let currentRequestDigest = form.mintRequestDigest;

      if (!currentRequestId) {
        try {
          const existing = await lookupMintRequest(account.address);
          if (existing?.hasRequest && existing.requestId) {
            currentRequestId = existing.requestId;
            currentRequestDigest = existing.requestTxDigest || null;
            setForm((prev) => ({ ...prev, mintRequestId: currentRequestId!, mintRequestDigest: currentRequestDigest || null }));
          }
        } catch (e) {
          // ignore lookup errors and continue to create request
        }
      }

      let config: Awaited<ReturnType<typeof fetchMintConfig>> | null = null;
      if (!currentRequestId) {
        config = await fetchMintConfig();
        if (!config?.packageId || !config.attestationRegistryId) throw new Error("Protocol configuration is incomplete.");
        const mintFeeMist = config.mintFeeMist ?? config.mintFee;
        if (!mintFeeMist) throw new Error("Mint fee not available.");

        const tx = new Transaction();
        tx.setSender(account.address);
        const mintFee = BigInt(mintFeeMist).toString();
        const [feeCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(mintFee)]);
        tx.moveCall({
          target: `${config.packageId}::protocol::create_mint_request`,
          arguments: [tx.object(config.attestationRegistryId), feeCoin],
        });

        const requestResult = await signAndExecute.mutateAsync({ transaction: tx });
        const digest = requestResult.digest;
        if (!digest) throw new Error("Mint request transaction did not return a digest.");

        const txDetails: any = await suiClient.waitForTransaction({ digest, options: { showEvents: true } });
        const mintEvent = (txDetails.events || []).find((evt: any) => evt.type === `${config!.packageId}::protocol::MintRequestCreated`);
        const eventRequestId = mintEvent?.parsedJson?.request_id || mintEvent?.parsedJson?.requestId || null;
        const eventRequester = mintEvent?.parsedJson?.requester || mintEvent?.parsedJson?.requester_address || null;
        if (!eventRequestId) throw new Error("Mint request transaction did not emit a request id.");
        if (eventRequester && String(eventRequester).toLowerCase() !== account.address.toLowerCase()) throw new Error("Mint request was created for a different wallet.");

        currentRequestId = eventRequestId;
        currentRequestDigest = digest;
        setForm((prev) => ({ ...prev, mintRequestId: currentRequestId, mintRequestDigest: currentRequestDigest }));
      }

      if (!currentRequestId) throw new Error("Mint request not available. Please retry.");

      const finalizeResult = await finalizeMint({ sessionId: form.sessionId, requestId: currentRequestId, requestTxDigest: currentRequestDigest || undefined });
      const digestValue = finalizeResult.digest;
      if (!digestValue) throw new Error("Mint finalisation did not return a digest.");

      setForm((prev) => ({ ...prev, sessionId: null, mintDigest: digestValue, mintRequestId: null, mintRequestDigest: null }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to mint attestation.";
      setError(msg);
    }
  }, [account?.address, form.mintRequestDigest, form.mintRequestId, form.sessionId, setForm, signAndExecute, suiClient]);

  const handleMintClick = async () => {
    setCurrentStep(5);
    await runMintFlow();
  };

  useEffect(() => {
    if (currentStep === 5 && form.mintDigest) {
      const t = setTimeout(() => {
        try { window.location.href = "/dashboard"; } catch {}
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [currentStep, form.mintDigest]);

  const steps = useMemo(
    () =>
      (
        [
          { id: 1, label: "Country & ID", icon: locationIcon, completed: currentStep > 1 },
          { id: 2, label: "Face Verification", icon: faceIcon, completed: currentStep > 2 },
          { id: 3, label: "Data Verification", icon: docIcon, completed: currentStep > 3 },
          { id: 4, label: "Review & Consent", icon: reviewIcon, completed: currentStep > 4 },
          { id: 5, label: "Minting", icon: mintingIcon, completed: false },
        ] as const
      ),
    [currentStep]
  );

  const age = form.dateOfBirth ? calculateAge(form.dateOfBirth) : null;

  return (
    <div className="vp-root">
      {/* Navbar is rendered by VerificationTopNavPortal to remain unchanged */}

      {/* Hero */}
      {/*<section className="hero-section">
        <h1 className="hero-title">Suirify Verification</h1>
        <p className="hero-subtitle">Verify your identity and get started</p>
      </section>*/}

      {/* Main */}
      <main className="main-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <ul className="step-list">
            {steps.map((s) => (
              <li
                key={s.id}
                className={`step-item ${currentStep === s.id || (currentStep === 2.5 && s.id === 2) ? "active" : ""} ${
                  s.completed ? "completed" : ""
                }`}
                aria-current={currentStep === s.id ? "step" : undefined}
              >
                <span className="step-label">
                  <span className="step-label-text">{s.label}</span>
                  <img src={s.icon} alt={`${s.label} icon`} className="step-label-icon" />
                </span>
              </li>
            ))}
          </ul>
        </aside>

        {/* Content */}
        <div className="content-area">
          {error && <div className="vp-error">{error}</div>}

          {currentStep === 1 && (
            <>
              <div className="step-header">Step 1/4</div>
              <h2 className="step-title">Select your country & ID</h2>

              <div className="form-container">
                <div className="form-group">
                  <label className="form-label" htmlFor="country">Country</label>
                  <div className="select-wrapper">
                    <select id="country" className="form-select"
                            value={form.country || (availableCountries[0]?.name ?? "")}
                            onChange={(e) => setForm((p) => ({ ...p, country: e.target.value, idNumber: "", sessionId: null }))}
                            disabled={loading}>
                      {(availableCountries.length ? availableCountries : [{ name: "Nigeria", label: "Nigeria" }]).map((c) => (
                        <option key={c.name} value={c.name}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="ninNumber">{form.country || "NIN"} ID Number</label>
                  <input id="ninNumber" className="form-input" type="text"
                         placeholder={idValidation[form.country || "Nigeria"]?.placeholder || "Enter ID"}
                         value={form.idNumber}
                         onChange={(e) => setForm((p) => ({ ...p, idNumber: e.target.value }))}
                         maxLength={32} />
                </div>

                <div className="action-buttons">
                  <button className="next-btn" onClick={handleNextFromStep1} disabled={loading || !form.country || !validateId(form.country, form.idNumber)}>
                    {loading ? "Please wait..." : "NEXT"}
                  </button>
                </div>
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <div className="step-header">Step 2/4</div>
              <h2 className="step-title">Face Verification Instructions :</h2>

              <div className="instructions-container">
                <p className="instruction-text">Ensure good lighting</p>
                <p className="instruction-text">Look straight at the camera</p>
                <p className="instruction-text">Remove glasses and hats</p>
              </div>

              <div className="action-buttons-dual">
                <button className="back-btn" onClick={() => setCurrentStep(1)}>Back</button>
                <button className="next-btn" onClick={startFaceStep} disabled={!form.sessionId || loading}>Start face verification</button>
              </div>
            </>
          )}

          {currentStep === 2.5 && (
            <>
              <div className="step-header">Step 2/4</div>
              <h2 className="step-title">Face Verification</h2>

              <div className="camera-container">
                <div className="camera-placeholder">
                  <video
                    ref={videoRef}
                    className="camera-feed"
                    autoPlay
                    playsInline
                    muted
                    style={{ opacity: capturedFrame ? 0 : 1 }}
                  />
                  {capturedFrame && (
                    <img src={capturedFrame} alt="Captured preview" className="camera-feed capture-preview" />
                  )}
                </div>
                <p className="camera-instruction">
                  {capturedFrame ? "Hold on, processing your capture..." : "Please look straight at the camera"}
                </p>
              </div>

              <div className="action-buttons-dual">
                <button
                  className="back-btn"
                  onClick={() => {
                    clearPreviewTimer();
                    setCapturedFrame(null);
                    cleanupStream();
                    setCurrentStep(2);
                  }}
                >
                  Back
                </button>
                <button className="next-btn" onClick={captureAndVerify} disabled={loading || faceVerifying}>
                  {faceVerifying ? "Verifying..." : "Capture & Verify"}
                </button>
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              <div className="step-header">Step 3/4</div>
              <h2 className="step-title">Verify Your Identity using {form.country || "ID"}</h2>

              <div className="form-container">
                <div className="form-group">
                  <label className="form-label" htmlFor="fullName">Full Name</label>
                  <div className="verified-input-wrapper">
                    <input id="fullName" className="form-input verified-input" value={form.fullName} readOnly />
                    {form.fullName && (
                      <span className="verified-icon">
                        <img src={markIcon} alt="Verified" />
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="dateOfBirth">Date Of Birth</label>
                  <div className="verified-input-wrapper">
                    <input id="dateOfBirth" className="form-input verified-input" value={form.dateOfBirth} readOnly />
                    {form.dateOfBirth && (
                      <span className="verified-icon">
                        <img src={markIcon} alt="Verified" />
                      </span>
                    )}
                  </div>
                </div>

                {age !== null && (
                  <div className={`form-group age-status ${age >= 18 ? "age-valid" : "age-invalid"}`}>
                    {age >= 18 ? `✓ Age verified (${age} years)` : `✗ Must be 18 or older (${age} years)`}
                  </div>
                )}

                <div className="action-buttons-dual">
                  <button className="back-btn" onClick={() => setCurrentStep(2)}>Back</button>
                  <button className="next-btn" onClick={() => setCurrentStep(4)} disabled={!form.fullName || !form.dateOfBirth || (age !== null && age < 18)}>
                    Continue
                  </button>
                </div>
              </div>
            </>
          )}

          {currentStep === 4 && (
            <>
              <div className="step-header">Step 4/4</div>
              <h2 className="step-title">Review and consent to your verified information</h2>

              <div className="review-container">
                <div className="Review">
                  <div className="review-item"><span className="review-label">Full Name :</span><span className="review-value">{form.fullName || "—"}</span></div>
                  <div className="review-item"><span className="review-label">Date of Birth :</span><span className="review-value">{form.dateOfBirth || "—"}</span></div>
                  <div className="review-item"><span className="review-label">Country :</span><span className="review-value">{form.country || "—"}</span></div>
                  <div className="review-item"><span className="review-label">ID Type :</span><span className="review-value">{form.country === "Nigeria" ? "NIN" : "ID"}</span></div>
                </div>

                <div className="consent-box">
                  <label className="consent-label">
                    <input type="checkbox" checked={!!form.consentGiven} onChange={(e) => onConsentToggle(e.target.checked)} className="consent-checkbox" />
                    <span className="consent-text">
                      <strong>I consent to mint my Suirify Attestation .</strong><br />
                      I understand that my personal data will be permanently deleted after verification , only Crypto-graphic proofs will be stored on-chain , i can delete my attestation anytime.<br />
                      <strong>This attestation is non-transferable and soul-bound to my wallet</strong>
                    </span>
                  </label>
                </div>

                <div className="action-buttons-dual">
                  <button className="back-btn" onClick={() => setCurrentStep(3)}>Back</button>
                  <button className="next-btn" onClick={handleMintClick} disabled={!form.consentGiven || !form.sessionId}>
                    Mint My Attestation
                  </button>
                </div>
              </div>
            </>
          )}

          {currentStep === 5 && (
            <div className="minting-container">
              <div className="minting-icon-wrapper">
                <SquareLoader />
              </div>
              <p className="minting-text">
                {form.mintDigest ? "Mint complete! Redirecting..." : "This may take a few moments . Please dont close this window ."}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ConnectedVerifyingPortal;
