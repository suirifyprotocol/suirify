import { useState } from 'react';

const Index = () => {
  const [country, setCountry] = useState('Nigeria');
  const [ninNumber, setNinNumber] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [fullName, setFullName] = useState('Salama Salam Obinna');
  const [dateOfBirth, setDateOfBirth] = useState('1993 - 12 - 25  ( 32 Years )');
  const [isConsented, setIsConsented] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  const getSteps = () => {
    return [
      { id: 1, label: 'Country & ID', icon: '📍', completed: currentStep > 1 },
      { id: 2, label: 'Face Verification', icon: '👤', completed: currentStep > 2 },
      { id: 3, label: 'Data Verification', icon: '✓', completed: currentStep > 3 },
      { id: 4, label: 'Review & Consent', icon: '📄', completed: currentStep > 4 },
      { id: 5, label: 'Minting', icon: '💎', completed: false },
    ];
  };

  const steps = getSteps();

  const handleNext = () => {
    if (currentStep === 1 && country && ninNumber) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    } else if (currentStep === 4 && isConsented) {
      setIsMinting(true);
      setCurrentStep(5);
    }
  };

  const handleBack = () => {
    if (currentStep > 1 && currentStep < 5) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStartFaceVerification = () => {
    setCurrentStep(2.5); // Camera view
  };

  const handleContinueFromData = () => {
    setCurrentStep(4);
  };

  return (
    <div>
      {/* Header */}
      <header className="header">
        <a href="/" className="logo">
          <div className="logo-icon">S</div>
          Sui
        </a>
        <nav className="nav">
          <ul className="nav-menu">
            <li><a href="#" className="nav-link">How it Works</a></li>
            <li><a href="#" className="nav-link">Developers</a></li>
            <li>
              <a href="#" className="nav-link">
                Resources <span className="dropdown-arrow">▼</span>
              </a>
            </li>
            <li><a href="#" className="nav-link">FAQ'S</a></li>
          </ul>
          <button className="connect-wallet-btn">Connect wallet</button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">Suirify Verification</h1>
        <p className="hero-subtitle">Verify your identity and get started</p>
      </section>

      {/* Main Content */}
      <main className="main-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <ul className="step-list">
            {steps.map((step) => (
              <li
                key={step.id}
                className={`step-item ${
                  currentStep === step.id || (currentStep === 2.5 && step.id === 2) ? 'active' : ''
                } ${step.completed ? 'completed' : ''}`}
                onClick={() => currentStep < 5 && setCurrentStep(step.id)}
              >
                <span className="step-label">{step.label}</span>
                <div className="step-icon">{step.icon}</div>
              </li>
            ))}
          </ul>
        </aside>

        {/* Content Area */}
        <div className="content-area">
          {currentStep === 1 && (
            <>
              <div className="step-header">Step 1/4</div>
              <h2 className="step-title">Select your country & ID</h2>

              <div className="form-container">
                <div className="form-group">
                  <label className="form-label" htmlFor="country">
                    Country
                  </label>
                  <div className="select-wrapper">
                    <select
                      id="country"
                      className="form-select"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    >
                      <option value="Nigeria">Nigeria</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Kenya">Kenya</option>
                      <option value="South Africa">South Africa</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="ninNumber">
                    Nin Number
                  </label>
                  <input
                    type="text"
                    id="ninNumber"
                    className="form-input"
                    placeholder="Enter your 11 - digit NIN"
                    value={ninNumber}
                    onChange={(e) => setNinNumber(e.target.value)}
                    maxLength={11}
                  />
                </div>

                <div className="action-buttons">
                  <button className="next-btn" onClick={handleNext}>
                    NEXT
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
                <p className="instruction-text">we'll compare with your government photo</p>
              </div>

              <div className="action-buttons-dual">
                <button className="back-btn" onClick={handleBack}>
                  Back
                </button>
                <button className="next-btn" onClick={handleStartFaceVerification}>
                  Start face verification
                </button>
              </div>
            </>
          )}

          {currentStep === 2.5 && (
            <>
              <div className="step-header">Step 2/4</div>
              <h2 className="step-title">Face Verification</h2>

              <div className="camera-container">
                <div className="camera-placeholder">
                  {/* Camera feed would go here */}
                </div>
                <p className="camera-instruction">Please look straight at the camera</p>
              </div>

              <div className="action-buttons">
                <button className="back-btn" onClick={handleBack}>
                  Back
                </button>
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              <div className="step-header">Step 3/4</div>
              <h2 className="step-title">Verify Your Identity using NIN</h2>

              <div className="form-container">
                <div className="form-group">
                  <label className="form-label" htmlFor="fullName">
                    Full Name
                  </label>
                  <div className="verified-input-wrapper">
                    <input
                      type="text"
                      id="fullName"
                      className="form-input verified-input"
                      value={fullName}
                      readOnly
                    />
                    <span className="verified-icon">✅</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="dateOfBirth">
                    Date Of Birth
                  </label>
                  <div className="verified-input-wrapper">
                    <input
                      type="text"
                      id="dateOfBirth"
                      className="form-input verified-input"
                      value={dateOfBirth}
                      readOnly
                    />
                    <span className="verified-icon">✅</span>
                  </div>
                </div>

                <div className="action-buttons-dual">
                  <button className="back-btn" onClick={handleBack}>
                    Back
                  </button>
                  <button className="next-btn" onClick={handleContinueFromData}>
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
                <div className="review-item">
                  <span className="review-label">Full Name :</span>
                  <span className="review-value">yaa Osei</span>
                </div>
                <div className="review-item">
                  <span className="review-label">Date of Birth :</span>
                  <span className="review-value">1999-03-12</span>
                </div>
                <div className="review-item">
                  <span className="review-label">Country :</span>
                  <span className="review-value">{country}</span>
                </div>
                <div className="review-item">
                  <span className="review-label">ID Type :</span>
                  <span className="review-value">NIN</span>
                </div>

                <div className="consent-box">
                  <label className="consent-label">
                    <input
                      type="checkbox"
                      checked={isConsented}
                      onChange={(e) => setIsConsented(e.target.checked)}
                      className="consent-checkbox"
                    />
                    <span className="consent-text">
                      <strong>I consent to mint my SUIlify Attestation .</strong><br />
                      I understand that my personal data will be permanently deleted
                      after verification , only Crypto-graphic proofs will be stored on-
                      chain , i can delete my attestation anytime.<br />
                      <strong>This attestation is non-transferable and soul-bound to my wallet</strong>
                    </span>
                  </label>
                </div>

                <div className="action-buttons-dual">
                  <button className="back-btn" onClick={handleBack}>
                    Back
                  </button>
                  <button 
                    className="next-btn" 
                    onClick={handleNext}
                    disabled={!isConsented}
                  >
                    Mint My Attestation
                  </button>
                </div>
              </div>
            </>
          )}

          {currentStep === 5 && (
            <div className="minting-container">
              <div className="minting-icon-wrapper">
                <div className="minting-icon">
                  <svg viewBox="0 0 100 100" className="minting-svg">
                    <path d="M30 50 L45 65 L45 35 Z" fill="#4a9eff" />
                    <path d="M55 35 L55 65 L70 50 Z" fill="#4a9eff" />
                  </svg>
                </div>
              </div>
              <p className="minting-text">This may take a few moments . Please dont close this window .</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
