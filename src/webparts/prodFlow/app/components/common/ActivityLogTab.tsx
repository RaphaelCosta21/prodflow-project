import * as React from "react";
import { Dropdown, Option, SearchBox } from "@fluentui/react-components";
import { IFabricationRequest } from "../../models";
import GlassCard from "./GlassCard";
import HistoryTimeline from "./HistoryTimeline";
import styles from "./ActivityLogTab.module.scss";

export interface IActivityLogTabProps {
  data: IFabricationRequest;
}

const ALL = "__all__";

export const ActivityLogTab: React.FC<IActivityLogTabProps> = ({ data }) => {
  const [type, setType] = React.useState(ALL);
  const [query, setQuery] = React.useState("");

  const types = React.useMemo(() => {
    const seen: { [key: string]: true } = {};
    for (const e of data.history) seen[e.type.split(":")[0]] = true;
    return Object.keys(seen).sort();
  }, [data.history]);

  const events = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.history.filter((e) => {
      if (type !== ALL && e.type.split(":")[0] !== type) return false;
      if (!q) return true;
      return (
        e.message.toLowerCase().indexOf(q) >= 0 ||
        e.by.toLowerCase().indexOf(q) >= 0
      );
    });
  }, [data.history, type, query]);

  return (
    <GlassCard
      title="Log de atividades"
      subtitle={`${events.length} de ${data.history.length} evento(s)`}
      actions={
        <div className={styles.filters}>
          <Dropdown
            size="small"
            value={type === ALL ? "Todos os tipos" : type}
            selectedOptions={[type]}
            onOptionSelect={(_, d) => setType(String(d.optionValue))}
          >
            <Option value={ALL} text="Todos os tipos">
              Todos os tipos
            </Option>
            {types.map((t) => (
              <Option key={t} value={t} text={t}>
                {t}
              </Option>
            ))}
          </Dropdown>
          <SearchBox
            size="small"
            placeholder="Buscar…"
            value={query}
            onChange={(_, d) => setQuery(d.value)}
          />
        </div>
      }
    >
      <HistoryTimeline events={events} />
    </GlassCard>
  );
};

export default ActivityLogTab;
