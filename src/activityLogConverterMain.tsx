import { createRoot } from "react-dom/client";
import ActivityLogConverter from "./ActivityLogConverter.tsx";

const root = document.getElementById("root");
if (root) createRoot(root).render(<ActivityLogConverter />);
