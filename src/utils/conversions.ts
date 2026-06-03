export type DimensionType = "WEIGHT" | "VOLUME" | "COUNT";

export const UNIT_FACTORS: Record<string, number> = {
  g: 1,
  kg: 1000,
  mL: 1,
  L: 1000,
  item: 1,
};

export function getUnitsForDimension(dimension: DimensionType): string[] {
  switch (dimension) {
    case "WEIGHT":
      return ["g", "kg"];
    case "VOLUME":
      return ["mL", "L"];
    case "COUNT":
      return ["item"];
    default:
      return [];
  }
}

export function getBaseUnit(dimension: DimensionType): string {
  switch (dimension) {
    case "WEIGHT":
      return "g";
    case "VOLUME":
      return "mL";
    case "COUNT":
      return "item";
    default:
      throw new Error(`Invalid dimension type: ${dimension}`);
  }
}

// Convert from entered display unit to base unit
export function convertToBaseUnit(
  quantity: number | string,
  unit: string
): number {
  const qty = Number(quantity);
  const factor = UNIT_FACTORS[unit];
  if (!factor) {
    throw new Error(`Unknown unit: ${unit}`);
  }
  return qty * factor;
}

// Convert from base unit to display unit
export function convertFromBaseUnit(
  quantityInBase: number | string,
  unit: string
): number {
  const qty = Number(quantityInBase);
  const factor = UNIT_FACTORS[unit];
  if (!factor) {
    throw new Error(`Unknown unit: ${unit}`);
  }
  return qty / factor;
}

// Calculate the total price based on base rate and quantity in base unit
export function calculatePrice(
  quantityInBase: number | string,
  ratePerBaseUnit: number | string
): number {
  const qty = Number(quantityInBase);
  const rate = Number(ratePerBaseUnit);
  return qty * rate;
}

// Convert display unit rate to per base unit rate
// e.g. Rate per Liter (L) to per mL rate
// ₹1000/L = 1000 / 1000 = ₹1/mL
export function convertRateToPerBaseUnit(
  ratePerDisplayUnit: number | string,
  displayUnit: string
): number {
  const rate = Number(ratePerDisplayUnit);
  const factor = UNIT_FACTORS[displayUnit];
  if (!factor) {
    throw new Error(`Unknown unit: ${displayUnit}`);
  }
  return rate / factor;
}

// Convert per base unit rate to display unit rate
// e.g. Rate per mL to per L rate
// ₹1/mL = 1 * 1000 = ₹1000/L
export function convertRateFromPerBaseUnit(
  ratePerBaseUnit: number | string,
  displayUnit: string
): number {
  const rate = Number(ratePerBaseUnit);
  const factor = UNIT_FACTORS[displayUnit];
  if (!factor) {
    throw new Error(`Unknown unit: ${displayUnit}`);
  }
  return rate * factor;
}
