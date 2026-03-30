import { Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Traffic from "./pages/Traffic.jsx";
import Attacks from "./pages/Attacks.jsx";
import AttackDetail from "./pages/AttackDetail.jsx";
import Insights from "./pages/Insights.jsx";
import Simulation from "./pages/Simulation.jsx";
import Timeline from "./pages/Timeline.jsx";
import Upload from "./pages/Upload.jsx";

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="traffic" element={<Traffic />} />
          <Route path="attacks" element={<Attacks />} />
          <Route path="attacks/:id" element={<AttackDetail />} />
          <Route path="insights" element={<Insights />} />
          <Route path="simulation" element={<Simulation />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="upload" element={<Upload />} />
          <Route index element={<Dashboard />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
