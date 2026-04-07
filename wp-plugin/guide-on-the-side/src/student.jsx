import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import StudentApp from "./StudentApp";
import "./student.css";

// get the root element
const rootElement = document.getElementById("gots-student-root");

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <StudentApp />
    </StrictMode>
  );
}
