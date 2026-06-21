/**
 * Interpolates string templates like "Hello {name}" with { name: "World" }.
 * If a variable is missing in development mode, it throws.
 * In production, it falls back to empty string or returns the placeholder.
 */
export function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return template.replace(/\{([^}]+)\}/g, (match, key) => {
    if (key in values) {
      return String(values[key]);
    }
    const errorMsg = `I18n: Missing interpolation value for key "${key}" in template "${template}"`;
    if (
      typeof process !== "undefined" &&
      (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test")
    ) {
      throw new Error(errorMsg);
    } else {
      console.warn(errorMsg);
      return ""; // Safe production fallback
    }
  });
}
