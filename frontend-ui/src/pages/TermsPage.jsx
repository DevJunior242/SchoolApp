import LegalDocument from "../components/LegalDocument.jsx";
import { TERMS } from "../legal/content.js";

export default function TermsPage() {
  return <LegalDocument content={TERMS} filename="IntellIno-Edu-Conditions-generales-d-utilisation.pdf" />;
}
