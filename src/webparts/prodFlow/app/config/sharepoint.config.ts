// SharePoint list/library names + promoted (indexed) column names. Never hardcode these in services.
export const SP_CONFIG = {
  site: "https://oceaneering.sharepoint.com/sites/G-OPGSSRBrazilEngineering",
  lists: {
    requests: "prodflow-requests",
    config: "prodflow-config",
    notifications: "prodflow-notifications",
  },
  libraries: {
    attachments: "ProdFlow",
  },
  // Promoted columns on prodflow-requests (query without parsing the whole JSON) + the JSON blob.
  fields: {
    fid: "FID",
    os: "OS",
    phase: "Phase",
    status: "Status",
    year: "Year",
    jsonData: "jsondata",
  },
  // prodflow-config generic columns + the atomic FID counter key.
  config: {
    typeField: "ConfigType",
    keyField: "Key",
    valueField: "Value",
    regionField: "Region",
    fidCounterKey: "fidCounter",
  },
} as const;
