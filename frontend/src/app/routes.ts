import { createBrowserRouter } from "react-router";
import { Home } from "./pages/Home";
import { DataDashboard } from "./pages/DataDashboard";
import { DocumentExtraction } from "./pages/DocumentExtraction";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/data-dashboard",
    Component: DataDashboard,
  },
  {
    path: "/document-extraction",
    Component: DocumentExtraction,
  },
]);
