// Mêmes clés que Student::DISABILITY_TYPES côté API.
export const DISABILITY_TYPES = [
  { value: "moteur", label: "Moteur" },
  { value: "visuel", label: "Visuel" },
  { value: "auditif", label: "Auditif" },
  { value: "intellectuel", label: "Intellectuel" },
  { value: "autre", label: "Autre" },
];

export const EMPTY_SITUATION = {
  is_displaced: false,
  displaced_origin: "",
  has_disability: false,
  disability_type: "",
  is_repeating: false,
};
