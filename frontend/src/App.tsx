import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Compliance from "./pages/compliance";
import VerificationRouter from "./modules/verification/Router.tsx";
import Dashboard from "./modules/verification/dashboard/Dashboard.tsx";
import VerificationTopNavPortal from "./components/VerificationTopNavPortal.tsx";
import { VerificationUIProvider } from "./modules/verification/context/VerificationUIContext";

const App = () => {
  return (
    <VerificationUIProvider>
      <VerificationTopNavPortal />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/verify" element={<VerificationRouter />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </VerificationUIProvider>
  );
};

export default App;
