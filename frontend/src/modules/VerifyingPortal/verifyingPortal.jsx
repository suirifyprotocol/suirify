import { useState } from 'react';
import SquareLoader from '@/components/common/SquareLoader';
import markIcon from '@/modules/icons/mark.png';

const Index = () => {
  const [country, setCountry] = useState('Nigeria');
  const [ninNumber, setNinNumber] = useState('');
  // Map of country to ID type and placeholder
  const countryIdInfo = {
    'Nigeria': { idType: 'NIN', placeholder: 'Enter your 11-digit NIN', maxLength: 11 },
    'United States': { idType: 'SSN', placeholder: 'Enter your 9-digit SSN (AAA-GG-SSSS)', maxLength: 11 },
    'South Africa': { idType: 'National ID', placeholder: 'Enter your 13-digit ID (YYMMDDSSSSCAZ)', maxLength: 13 },
    'India': { idType: 'Aadhaar', placeholder: 'Enter your 12-digit Aadhaar', maxLength: 12 },
    'Ghana': { idType: 'Ghana Card', placeholder: 'Enter your Ghana Card Number', maxLength: 12 },
    'Canada': { idType: 'SIN', placeholder: 'Enter your 9-digit SIN', maxLength: 9 },
    'United Kingdom (UK)': { idType: 'NINO', placeholder: 'Enter your NINO (AB123456C)', maxLength: 9 },
    'China': { idType: 'Resident ID', placeholder: 'Enter your 18-digit Resident ID', maxLength: 18 },
    'Japan': { idType: 'My Number', placeholder: 'Enter your 12-digit My Number', maxLength: 12 },
    'Germany': { idType: 'ID Card', placeholder: 'Enter your German ID (alphanumeric)', maxLength: 12 },
    'France': { idType: 'CNI', placeholder: 'Enter your French ID', maxLength: 15 },
    'Brazil': { idType: 'CPF', placeholder: 'Enter your 11-digit CPF', maxLength: 11 },
    'Australia': { idType: 'TFN/Medicare', placeholder: 'Enter your TFN or Medicare number', maxLength: 12 },
  };
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
                      <option value="United States">United States</option>
                      <option value="South Africa">South Africa</option>
                      <option value="India">India</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Canada">Canada</option>
                      <option value="United Kingdom (UK)">United Kingdom (UK)</option>
                      <option value="China">China</option>
                      <option value="Japan">Japan</option>
                      <option value="Germany">Germany</option>
                      <option value="France">France</option>
                      <option value="Brazil">Brazil</option>
                      <option value="Australia">Australia</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="ninNumber">
                    {countryIdInfo[country]?.idType || 'ID Number'}
                  </label>
                  <input
                    type="text"
                    id="ninNumber"
                    className="form-input"
                    placeholder={countryIdInfo[country]?.placeholder || 'Enter your ID number'}
                    value={ninNumber}
                    onChange={(e) => setNinNumber(e.target.value)}
                    maxLength={countryIdInfo[country]?.maxLength || 20}
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
              <h2 className="step-title">Verify Your Identity</h2>

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
                    <span className="verified-icon">
                      <img src={markIcon} alt="Verified" />
                    </span>
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
                    <span className="verified-icon">
                      <img src={markIcon} alt="Verified" />
                    </span>
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
                      <strong>I consent to mint my Suirify Attestation .</strong><br />
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
                <SquareLoader />
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
