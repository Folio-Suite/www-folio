/** @param {string} value */
export function normalizeSiteURL(value) {
  return new URL(value.includes('://') ? value : `https://${value}`).origin
}
