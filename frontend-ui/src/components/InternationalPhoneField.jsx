import { Box } from "@mui/material";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import "./InternationalPhoneInput.css";
import { useThemeMode } from "../context/ThemeModeContext.jsx";

export default function InternationalPhoneField({
  label = "Téléphone",
  value = "",
  onChange,
  name = "phone",
  id = name,
  defaultCountry = "bf",
  required = false,
  disabled = false,
}) {
  const { mode } = useThemeMode();

  return (
    <Box
      className={`international-phone-input international-phone-input--${mode}`}
    >
      <Box
        component="label"
        className="international-phone-input__label"
        htmlFor={id}
      >
        {label}
      </Box>
      <PhoneInput
        defaultCountry={defaultCountry}
        value={value}
        onChange={onChange}
        disabled={disabled}
        inputProps={{ id, name, required }}
      />
    </Box>
  );
}
