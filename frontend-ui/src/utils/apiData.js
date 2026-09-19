export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

export function asObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value.data && typeof value.data === "object" && !Array.isArray(value.data)
      ? value.data
      : value;
  }

  return null;
}

export function getApiErrorMessage(error, fallback = "Une erreur est survenue.") {
  const messages = error?.response?.data?.errors;
  if (messages && typeof messages === "object") {
    return Object.values(messages)
      .flatMap((message) => (Array.isArray(message) ? message : [message]))
      .filter(Boolean)
      .join(" ") || fallback;
  }

  return error?.response?.data?.message || fallback;
}
