import {
  BrandVariants,
  createLightTheme,
  createDarkTheme,
  Theme,
} from "@fluentui/react-components";

// ProdFlow brand ramp built around Engineering Blue #0072CE (step 80 = Fluent's primary brand
// background) and anchored at Ocean Navy #00263E on the dark end.
const prodflowBrand: BrandVariants = {
  10: "#00101a",
  20: "#001a29",
  30: "#00263e",
  40: "#003b5c",
  50: "#004a73",
  60: "#005ba6",
  70: "#0066ba",
  80: "#0072ce",
  90: "#1b82d8",
  100: "#3893df",
  110: "#55a4e6",
  120: "#72b5ec",
  130: "#8fc6f1",
  140: "#acd7f6",
  150: "#cbe7fa",
  160: "#eaf4fd",
};

export const oceaneeringLightTheme: Theme = createLightTheme(prodflowBrand);
export const oceaneeringDarkTheme: Theme = createDarkTheme(prodflowBrand);
