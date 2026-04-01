/**
 * Normalizes a payment method name for use as SVG asset filename (without .svg extension).
 * Icon filenames match payment method names: lowercase, hyphens converted to underscores.
 */
export const getPaymentIconAssetName = (name: string): string => {
  return name.toLowerCase().trim().replace(/-/g, '_');
};
