// SharePoint list/library names + promoted (indexed) column names. Never hardcode these in services.
export const SP_CONFIG = {
  site: "https://oceaneering.sharepoint.com/sites/G-OPGSSRBrazilEngineering",
  lists: {
    requests: "prodflow-requests",
    config: "prodflow-config",
    notifications: "prodflow-notifications",
  },
  libraries: {
    attachments: "ProdFlow-docs",
  },
  // Promoted columns on the ProdFlow-docs library so files stay queryable outside the FID JSON.
  libraryFields: {
    fid: "ProdFlowFID",
    docType: "ProdFlowDocType",
    refCode: "ProdFlowRefCode",
  },
  // Promoted columns on prodflow-requests (query without parsing the whole JSON) + the JSON blob.
  fields: {
    fid: "FID",
    os: "OS",
    phase: "Phase",
    status: "Status",
    year: "Year",
    budgetType: "BudgetType",
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
