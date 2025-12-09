import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { fetchCsrfToken } from "./lib/csrf";

fetchCsrfToken();

createRoot(document.getElementById("root")!).render(<App />);
