import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Compliance from "./pages/compliance";
import VerificationRouter from "./modules/verification/Router.tsx";
import Dashboard from "./modules/verification/dashboard/Dashboard.tsx";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/compliance" element={<Compliance />} />
      <Route path="/verify" element={<VerificationRouter />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
};

export default App;
