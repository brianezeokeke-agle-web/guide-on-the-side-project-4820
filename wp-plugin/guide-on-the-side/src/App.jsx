import { Routes, Route } from "react-router-dom";
import LandingDashboard from "./pages/LandingDashboard";
import TutorialListPage from "./pages/TutorialListPage";
import CreateTutorialPage from "./pages/CreateTutorialPage";
import TutorialEditorPage from "./pages/TutorialEditorPage";
import TutorialAnalyticsPage from "./pages/TutorialAnalyticsPage";
import CertificateTemplatesPage from "./pages/CertificateTemplatesPage";
import CertificateVerifyPage from "./pages/CertificateVerifyPage";
import TutorialThemesPage from "./pages/TutorialThemesPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingDashboard />} />
      <Route path="/tutorials" element={<TutorialListPage />} />
      <Route path="/tutorials/new" element={<CreateTutorialPage />} />
      <Route path="/tutorials/:id/edit" element={<TutorialEditorPage />} />
      <Route path="/tutorials/:id/analytics" element={<TutorialAnalyticsPage />} />
      <Route path="/certificate-templates" element={<CertificateTemplatesPage />} />
      <Route path="/certificate-verify" element={<CertificateVerifyPage />} />
      <Route path="/tutorial-themes" element={<TutorialThemesPage />} />
    </Routes>
  );
}
