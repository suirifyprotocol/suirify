import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import HomePage from "@/routes/HomePage";

const AppRoutes = () => (
  <Layout>
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  </Layout>
);

export default AppRoutes;
