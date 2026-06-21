export const BUILDING_UTILITY_TYPES = ["ELECTRICITY", "GAS", "CLEANING"] as const;

export type BuildingUtilityType = (typeof BUILDING_UTILITY_TYPES)[number];

export const BUILDING_UTILITY_LABELS: Record<BuildingUtilityType, string> = {
  ELECTRICITY: "Electricity",
  GAS: "Gas (LPG)",
  CLEANING: "Cleaning charges",
};

export const BUILDING_UTILITY_RATE_HINTS: Record<BuildingUtilityType, string> = {
  ELECTRICITY: "Per unit above baseline",
  GAS: "Per unit above baseline",
  CLEANING: "Fixed charge per rent bill",
};

export const REQUIRED_BUILDING_UTILITY_TYPES: BuildingUtilityType[] = [
  "ELECTRICITY",
  "GAS",
  "CLEANING",
];

export type BuildingUtilityRateSnapshot = {
  electricityUnitRate: number;
  gasUnitRate: number;
  cleaningCharge: number;
};
