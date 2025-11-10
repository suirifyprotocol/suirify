import { Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Compliance from "./pages/Compliance";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/compliance" element={<Compliance />} />
    </Routes>
  );
};

export default App;
