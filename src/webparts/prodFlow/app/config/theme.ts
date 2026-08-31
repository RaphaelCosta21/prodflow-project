import {
  BrandVariants,
  createLightTheme,
  createDarkTheme,
  Theme,
} from "@fluentui/react-components";

// Oceaneering blue brand ramp — PLACEHOLDER pending the official brand hex (plan open item #6).
// When confirmed, adjust these 16 steps; nothing else needs to change.
const oceaneeringBrand: BrandVariants = {
  10: "#020305",
  20: "#0d1a2d",
  30: "#122a4a",
  40: "#153762",
  50: "#17457b",
  60: "#175495",
  70: "#1463b0",
  80: "#2f74d0",
  90: "#4a86dc",
  100: "#6498e6",
  110: "#7faaef",
  120: "#99bcf5",
  130: "#b4cef9",
  140: "#cee0fc",
  150: "#e7effe",
  160: "#f5f9ff",
};

export const oceaneeringLightTheme: Theme = createLightTheme(oceaneeringBrand);
export const oceaneeringDarkTheme: Theme = createDarkTheme(oceaneeringBrand);
