import * as React from "react";
import { useParams } from "react-router-dom";
import {
  TabList,
  Tab,
  SelectTabData,
  SelectTabEvent,
} from "@fluentui/react-components";
import { IFabricationRequest } from "../models";
import { useFid } from "../api/fids";
import GlassCard from "../components/common/GlassCard";
import SkeletonLoader from "../components/common/SkeletonLoader";
import EmptyState from "../components/common/EmptyState";
import StatusBadge from "../components/common/StatusBadge";
import PhaseBadge from "../components/common/PhaseBadge";
import BomImport from "../components/budgeting/BomImport";
import SubItemTree from "../components/budgeting/SubItemTree";
import { formatCurrencyBRL, formatDate } from "../utils/formatters";
import styles from "./FidDetailPage.module.scss";

type TabKey =
  | "overview"
  | "subitems"
  | "budget"
  | "approval"
  | "production"
  | "quality"
  | "attachments";

const InfoRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className={styles.infoRow}>
    <span className={styles.infoLabel}>{label}</span>
    <span className={styles.infoValue}>{value}</span>
  </div>
);

const OverviewTab: React.FC<{ data: IFabricationRequest }> = ({ data }) => (
  <div className={styles.overviewGrid}>
    <GlassCard title="Identificação">
      <InfoRow
        label="OS / OM"
        value={`${data.osNumber} (${data.osType ?? "OS"})`}
      />
      <InfoRow label="Projeto" value={data.projeto} />
      <InfoRow
        label="Desenho"
        value={`${data.drawing.code} ${data.drawing.revision}`.trim()}
      />
      <InfoRow label="Tipo de Orçamento" value={data.tipoOrcamento} />
      <InfoRow label="Descrição" value={data.descricao} />
    </GlassCard>
    <GlassCard title="Complexidade & SLA">
      <InfoRow label="Usinagem" value={data.complexidadeUsinagem} />
      <InfoRow
        label="Caldeiraria/Soldagem"
        value={data.complexidadeCaldeiraria}
      />
      <InfoRow label="Geral" value={data.complexidadeGeral} />
      <InfoRow label="Atendimento" value={data.atendimento} />
      <InfoRow
        label="Prazo SLA (dias úteis)"
        value={String(data.dates.prazoDiasUteis ?? "—")}
      />
      <InfoRow
        label="Prazo p/ envio"
        value={formatDate(data.dates.prazoEnvioPetrobras)}
      />
    </GlassCard>
    <GlassCard title="Financeiro">
      <InfoRow
        label="Custo total"
        value={formatCurrencyBRL(data.financials.custoTotal)}
      />
      <InfoRow
        label="Orçamento Oceaneering"
        value={formatCurrencyBRL(data.financials.orcamentoOceaneering)}
      />
      <InfoRow
        label="Receita"
        value={formatCurrencyBRL(data.financials.receita)}
      />
      <InfoRow
        label="Exposição de multa (30%)"
        value={formatCurrencyBRL(data.financials.multaExposicao30)}
      />
    </GlassCard>
  </div>
);

const PlaceholderTab: React.FC<{ label: string }> = ({ label }) => (
  <GlassCard>
    <div className={styles.placeholder}>{label}</div>
  </GlassCard>
);

export const FidDetailPage: React.FC = () => {
  const params = useParams();
  const fid = params.fid ?? "";
  const { data, isLoading, isError, error } = useFid(fid);
  const [tab, setTab] = React.useState<TabKey>("overview");

  if (isLoading) {
    return (
      <div className={styles.page}>
        <SkeletonLoader rows={8} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={styles.page}>
        <EmptyState
          title="FID não encontrado"
          description={String(error ?? fid)}
        />
      </div>
    );
  }

  const onTab = (_: SelectTabEvent, d: SelectTabData): void =>
    setTab(d.value as TabKey);

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{data.fid}</h1>
          <PhaseBadge phase={data.phase} />
          <StatusBadge kind="request" status={data.status} />
        </div>
        <div className={styles.sub}>
          OS {data.osNumber} · {data.descricao}
        </div>
      </div>

      <TabList selectedValue={tab} onTabSelect={onTab}>
        <Tab value="overview">Visão Geral</Tab>
        <Tab value="subitems">Sub-itens</Tab>
        <Tab value="budget">Orçamento</Tab>
        <Tab value="approval">Aprovação</Tab>
        <Tab value="production">Produção</Tab>
        <Tab value="quality">Qualidade</Tab>
        <Tab value="attachments">Anexos</Tab>
      </TabList>

      <div className={styles.tabBody}>
        {tab === "overview" && <OverviewTab data={data} />}
        {tab === "subitems" && (
          <div className={styles.stack}>
            <div className={styles.toolbar}>
              <span className={styles.count}>
                {data.subItems.length} sub-itens
              </span>
              <BomImport fid={data.fid} attendance={data.atendimento} />
            </div>
            <GlassCard noBodyPadding>
              {data.subItems.length === 0 ? (
                <EmptyState
                  title="Sem BOM ainda"
                  description="Importe a BOM (CSV do PLM) para explodir os sub-itens."
                />
              ) : (
                <SubItemTree subItems={data.subItems} fid={data.fid} />
              )}
            </GlassCard>
          </div>
        )}
        {tab === "budget" && (
          <PlaceholderTab label="Máscara de orçamento — próxima etapa (F2c)." />
        )}
        {tab === "approval" && (
          <PlaceholderTab label="Aprovação Petrobras — próxima etapa." />
        )}
        {tab === "production" && (
          <PlaceholderTab label="Produção & Montagem — Fase 2." />
        )}
        {tab === "quality" && (
          <PlaceholderTab label="Qualidade & Databook — Fase 2." />
        )}
        {tab === "attachments" && (
          <PlaceholderTab label="Anexos & Timeline — próxima etapa." />
        )}
      </div>
    </div>
  );
};

export default FidDetailPage;
