import * as React from "react";
import { Input, Dropdown, Option } from "@fluentui/react-components";
import { ISubItem, SubItemStatus } from "../../models";
import { SUB_ITEM_STATUSES } from "../../config/statuses";
import { PatchFn } from "./CrossFidView";

// Commits on blur so typing doesn't fire a SharePoint write per keystroke.
export const TextCell: React.FC<{
  value?: string;
  placeholder?: string;
  field: keyof ISubItem;
  patch: PatchFn;
}> = ({ value, placeholder, field, patch }) => {
  const [draft, setDraft] = React.useState(value ?? "");
  React.useEffect(() => setDraft(value ?? ""), [value]);
  return (
    <Input
      size="small"
      appearance="filled-darker"
      placeholder={placeholder}
      value={draft}
      onChange={(_, d) => setDraft(d.value)}
      onBlur={() => {
        if (draft !== (value ?? ""))
          patch({ [field]: draft || undefined } as Partial<ISubItem>);
      }}
    />
  );
};

export const NumberCell: React.FC<{
  value?: number;
  field: keyof ISubItem;
  patch: PatchFn;
}> = ({ value, field, patch }) => {
  const [draft, setDraft] = React.useState(value ? String(value) : "");
  React.useEffect(() => setDraft(value ? String(value) : ""), [value]);
  return (
    <Input
      size="small"
      type="number"
      min={0}
      appearance="filled-darker"
      value={draft}
      onChange={(_, d) => setDraft(d.value)}
      onBlur={() => {
        const next = draft === "" ? undefined : Math.max(0, Number(draft));
        if (next !== value) patch({ [field]: next } as Partial<ISubItem>);
      }}
    />
  );
};

export const DateCell: React.FC<{
  value?: string;
  field: keyof ISubItem;
  patch: PatchFn;
}> = ({ value, field, patch }) => (
  <Input
    size="small"
    type="date"
    appearance="filled-darker"
    value={value ? value.slice(0, 10) : ""}
    onChange={(_, d) =>
      patch({
        [field]: d.value ? new Date(d.value).toISOString() : undefined,
      } as Partial<ISubItem>)
    }
  />
);

export const StatusCell: React.FC<{
  value: SubItemStatus;
  phase?: 1 | 2;
  patch: PatchFn;
}> = ({ value, phase, patch }) => {
  const options = SUB_ITEM_STATUSES.filter(
    (s) => !phase || s.phase === phase || !s.phase,
  );
  return (
    <Dropdown
      size="small"
      value={value}
      selectedOptions={[value]}
      onOptionSelect={(_, d) => {
        if (d.optionValue) patch({ status: d.optionValue as SubItemStatus });
      }}
    >
      {options.map((s) => (
        <Option key={s.key} value={s.key}>
          {s.label}
        </Option>
      ))}
    </Dropdown>
  );
};
