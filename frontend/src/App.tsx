import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Compliance from "./pages/compliance";
import VerificationRouter from "./modules/verification/Router.tsx";
import Dashboard from "./modules/verification/dashboard/Dashboard.tsx";
import VerificationTopNavPortal from "./components/VerificationTopNavPortal.tsx";
import { VerificationUIProvider } from "./modules/verification/context/VerificationUIContext";
import ComplianceDashboard from "./pages/dashboard/ComplianceDashboard";
import RegulatorDashboard from "./pages/dashboard/RegulatorDashboard";
import ExtensionPreview from "./pages/dashboard/ExtensionPreview";
import VerificationQaHarness from "./pages/dashboard/VerificationQaHarness";

const App = () => {
  return (
    <VerificationUIProvider>
      <VerificationTopNavPortal />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/verify" element={<VerificationRouter />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/compliance" element={<ComplianceDashboard />} />
        <Route path="/dashboard/regulator" element={<RegulatorDashboard />} />
        <Route path="/dashboard/extension" element={<ExtensionPreview />} />
        <Route path="/dashboard/qa" element={<VerificationQaHarness />} />
      </Routes>
    </VerificationUIProvider>
  );
};

export default App;
