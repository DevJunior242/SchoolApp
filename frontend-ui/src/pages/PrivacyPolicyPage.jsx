import LegalDocument from "../components/LegalDocument.jsx";
import { PRIVACY } from "../legal/content.js";

export default function PrivacyPolicyPage() {
  return <LegalDocument content={PRIVACY} filename="IntellIno-Edu-Politique-de-confidentialite.pdf" />;
}
