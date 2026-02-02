import { Routes, Route } from "react-router-dom";
import LandingDashboard from "./pages/LandingDashboard";
import TutorialListPage from "./pages/TutorialListPage";
import CreateTutorialPage from "./pages/CreateTutorialPage";
import TutorialEditorPage from "./pages/TutorialEditorPage";
import PublishedListPage from "./pages/PublishedListPage";
import ArchivedListPage from "./pages/ArchivedListPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingDashboard />} />
      <Route path="/tutorials" element={<TutorialListPage />} />
      <Route path="/tutorials/published" element={<PublishedListPage />} />
      <Route path="/tutorials/archived" element={<ArchivedListPage />} />
      <Route path="/tutorials/new" element={<CreateTutorialPage />} />
      <Route path="/tutorials/:id/edit" element={<TutorialEditorPage />} />
    </Routes>
  );
}