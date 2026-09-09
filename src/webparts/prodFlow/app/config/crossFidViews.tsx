import * as React from "react";
import { ICrossFidRow } from "../utils/crossFid";
import { ICrossFidViewProps } from "../components/common/CrossFidView";
import {
  TextCell,
  NumberCell,
  DateCell,
  StatusCell,
} from "../components/common/CrossFidCells";
import FidLink from "../components/common/FidLink";
import StatusBadge from "../components/common/StatusBadge";
import { STRATEGY_OPTIONS } from "./strategyOptions";
import {
  FABRICATION_CHECKLIST,
  checklistProgress,
  buildChecklist,
} from "./checklists";
import { formatCurrencyBRL, formatPercentage } from "../utils/formatters";

type ViewConfig = Omit<ICrossFidViewProps, "actions">;

const isBuyOrSubcon = (r: ICrossFidRow): boolean =>
  r.strategyKey === "buyRaw" ||
  r.strategyKey === "buyCommercial" ||
  r.strategyKey === "makeSubcon";

const isInHouse = (r: ICrossFidRow): boolean => r.strategyKey === "makeInHouse";

// Released for phase 2 (or already there) — both workflows.
const approved = (r: ICrossFidRow): boolean =>
  r.request.phase === 2 ||
  r.request.status === "ReleasedForFabrication" ||
  r.request.status === "ReleasedForProcurement";

const identityCols: ICrossFidViewProps["columns"] = [
  {
    key: "fid",
    header: "FID",
    width: "110px",
    render: (r) => <FidLink fid={r.fid} />,
  },
  {
    key: "pn",
    header: "PN",
    width: "130px",
    render: (r) => r.subItem.pn,
  },
  {
    key: "desc",
    header: "Descrição",
    width: "minmax(180px, 1fr)",
    render: (r) => r.subItem.descricao,
  },
];

const strategyCol: ICrossFidViewProps["columns"][0] = {
  key: "strategy",
  header: "Estratégia",
  width: "150px",
  render: (r) =>
    STRATEGY_OPTIONS.filter((o) => o.key === r.strategyKey)[0]?.label ?? "—",
};

const statusCol = (phase?: 1 | 2): ICrossFidViewProps["columns"][0] => ({
  key: "status",
  header: "Status",
  width: "170px",
  render: (r, patch) => (
    <StatusCell value={r.subItem.status} phase={phase} patch={patch} />
  ),
});

export const SUB_ITEMS_VIEW: ViewConfig = {
  title: "Sub-itens & Delineamento",
  phaseLabel: "Fase 1",
  subtitle: "Itens In-House que dependem de delineamento da Eng. Industrial",
  filter: isInHouse,
  emptyTitle: "Nenhum item In-House",
  emptyDescription:
    "Defina a estratégia Make · In-House nos sub-itens de um FID.",
  columns: identityCols.concat([
    {
      key: "hh",
      header: "HH",
      width: "90px",
      align: "right",
      render: (r) => r.subItem.delineation?.hh ?? "—",
    },
    {
      key: "rev",
      header: "Rev.",
      width: "70px",
      align: "center",
      render: (r) => r.subItem.delineation?.revision ?? "—",
    },
    statusCol(1),
  ]),
};

export const QUOTATIONS_VIEW: ViewConfig = {
  title: "Cotações (SCM)",
  phaseLabel: "Fase 1",
  subtitle: "Itens Buy e SUBCON aguardando ou com cotação registrada",
  filter: isBuyOrSubcon,
  emptyTitle: "Nada para cotar",
  emptyDescription: "Defina estratégias Buy/SUBCON nos sub-itens.",
  columns: identityCols.concat([
    strategyCol,
    {
      key: "supplier",
      header: "Fornecedor",
      width: "160px",
      render: (r) => r.subItem.quotation?.supplier ?? "—",
    },
    {
      key: "value",
      header: "Valor",
      width: "130px",
      align: "right",
      render: (r) =>
        r.subItem.quotation
          ? formatCurrencyBRL(r.subItem.quotation.value)
          : "—",
    },
    {
      key: "lead",
      header: "Lead time",
      width: "100px",
      align: "right",
      render: (r) => r.subItem.quotation?.leadTimeDays ?? "—",
    },
    statusCol(1),
  ]),
};

export const PROCUREMENT_VIEW: ViewConfig = {
  title: "Procurement (RC/PO)",
  phaseLabel: "Fase 2",
  subtitle: "Referências do PeopleSoft por sub-item comprado",
  filter: (r) => isBuyOrSubcon(r) && approved(r),
  emptyTitle: "Nada em compras",
  emptyDescription: "Os itens aparecem aqui após a aprovação do FID.",
  columns: identityCols.concat([
    {
      key: "rc",
      header: "RC / SR",
      width: "130px",
      render: (r, patch) => (
        <TextCell value={r.subItem.rcOrSr} field="rcOrSr" patch={patch} />
      ),
    },
    {
      key: "po",
      header: "PO / WO",
      width: "130px",
      render: (r, patch) => (
        <TextCell value={r.subItem.poOrWo} field="poOrWo" patch={patch} />
      ),
    },
    {
      key: "lead",
      header: "Lead time",
      width: "100px",
      align: "right",
      render: (r) => r.subItem.quotation?.leadTimeDays ?? "—",
    },
    statusCol(2),
  ]),
};

export const WORK_ORDERS_VIEW: ViewConfig = {
  title: "Work Orders",
  phaseLabel: "Fase 2",
  subtitle: "WO por sub-item In-House, com datas e nº de série",
  filter: (r) => isInHouse(r) && approved(r),
  emptyTitle: "Nenhuma WO",
  emptyDescription: "Os itens In-House aparecem aqui após o Go Live.",
  columns: identityCols.concat([
    {
      key: "wo",
      header: "PO / WO",
      width: "130px",
      render: (r, patch) => (
        <TextCell value={r.subItem.poOrWo} field="poOrWo" patch={patch} />
      ),
    },
    {
      key: "inicio",
      header: "Início",
      width: "140px",
      render: (r, patch) => (
        <DateCell
          value={r.subItem.dataInicioFab}
          field="dataInicioFab"
          patch={patch}
        />
      ),
    },
    {
      key: "fim",
      header: "Fim",
      width: "140px",
      render: (r, patch) => (
        <DateCell
          value={r.subItem.dataFimFab}
          field="dataFimFab"
          patch={patch}
        />
      ),
    },
    {
      key: "sn",
      header: "SN",
      width: "120px",
      render: (r, patch) => (
        <TextCell
          value={r.subItem.serialNumber}
          field="serialNumber"
          patch={patch}
        />
      ),
    },
    statusCol(2),
  ]),
};

export const WORKSHOP_VIEW: ViewConfig = {
  title: "Workshop / Fabricação",
  phaseLabel: "Fase 2",
  subtitle: "Progresso do checklist de fabricação",
  filter: (r) => isInHouse(r) && approved(r),
  emptyTitle: "Nada em fabricação",
  emptyDescription: "Os itens In-House aparecem aqui após o Go Live.",
  columns: identityCols.concat([
    {
      key: "progress",
      header: "Checklist",
      width: "110px",
      align: "right",
      render: (r) =>
        formatPercentage(
          checklistProgress(
            buildChecklist(FABRICATION_CHECKLIST, r.subItem.fabChecklist),
          ),
        ),
    },
    {
      key: "termino",
      header: "Término real",
      width: "140px",
      render: (r, patch) => (
        <DateCell
          value={r.subItem.dataTerminoReal}
          field="dataTerminoReal"
          patch={patch}
        />
      ),
    },
    statusCol(2),
  ]),
};

export const QUALITY_VIEW: ViewConfig = {
  title: "Qualidade & Databook",
  phaseLabel: "Fase 2",
  subtitle: "Inspeções, certificados e rastreabilidade",
  filter: approved,
  emptyTitle: "Nada para inspecionar",
  emptyDescription: "Os itens aparecem aqui após a aprovação do FID.",
  columns: identityCols.concat([
    {
      key: "qualityCode",
      header: "Cód. qualidade",
      width: "140px",
      render: (r, patch) => (
        <TextCell
          value={r.subItem.qualityCode}
          field="qualityCode"
          patch={patch}
        />
      ),
    },
    {
      key: "certs",
      header: "Certif.",
      width: "80px",
      align: "right",
      render: (r) => (r.subItem.certificates ?? []).length,
    },
    {
      key: "docRso",
      header: "DOC / RSO",
      width: "130px",
      render: (r, patch) => (
        <TextCell value={r.subItem.docRso} field="docRso" patch={patch} />
      ),
    },
    statusCol(2),
  ]),
};

export const WAREHOUSE_VIEW: ViewConfig = {
  title: "Almoxarifado",
  phaseLabel: "Fase 2",
  subtitle: "Recebimento e estoque por sub-item",
  filter: approved,
  emptyTitle: "Nada no almoxarifado",
  emptyDescription: "Os itens aparecem aqui após a aprovação do FID.",
  columns: identityCols.concat([
    {
      key: "po",
      header: "PO / WO",
      width: "130px",
      render: (r) => r.subItem.poOrWo ?? "—",
    },
    {
      key: "qtd",
      header: "Qtd",
      width: "90px",
      align: "right",
      render: (r) =>
        `${r.subItem.qtd}${r.subItem.unit ? ` ${r.subItem.unit}` : ""}`,
    },
    {
      key: "prazo",
      header: "Prazo (dias)",
      width: "120px",
      align: "right",
      render: (r, patch) => (
        <NumberCell
          value={r.subItem.prazoFabricacaoDias}
          field="prazoFabricacaoDias"
          patch={patch}
        />
      ),
    },
    statusCol(2),
  ]),
};

export const SERVICE_EXCELLENCE_VIEW: ViewConfig = {
  title: "Service Excellence",
  phaseLabel: "Fase 2",
  subtitle: "Serialização (SN = nº da WO) e atualização do MPT",
  filter: approved,
  emptyTitle: "Nada para serializar",
  emptyDescription: "Os itens aparecem aqui após a aprovação do FID.",
  columns: identityCols.concat([
    {
      key: "sn",
      header: "Serial Number",
      width: "150px",
      render: (r, patch) => (
        <TextCell
          value={r.subItem.serialNumber}
          field="serialNumber"
          patch={patch}
        />
      ),
    },
    {
      key: "termino",
      header: "Término real",
      width: "140px",
      render: (r) =>
        r.subItem.dataTerminoReal
          ? new Date(r.subItem.dataTerminoReal).toLocaleDateString("pt-BR")
          : "—",
    },
    {
      key: "reqStatus",
      header: "Status do FID",
      width: "160px",
      render: (r) => <StatusBadge kind="request" status={r.request.status} />,
    },
    statusCol(2),
  ]),
};
