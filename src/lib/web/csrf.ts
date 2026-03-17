export function getCsrfToken() {
  if (typeof document === "undefined") {
    return "";
  }

  const value = document.cookie
    .split("; ")
    .find((item) => item.startsWith("cuee_csrf="))
    ?.split("=")[1];

  return value ?? "";
}
