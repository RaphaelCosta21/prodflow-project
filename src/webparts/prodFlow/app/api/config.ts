import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import { IMembersData, ITeamMember } from "../models";
import { MembersService } from "../services/MembersService";
import { ConfigService } from "../services/ConfigService";
import { IAppConfig } from "../stores/useConfigStore";
import { queryKeys } from "./queryKeys";

const APP_CONFIG_KEY = "appConfig";

export function useMembers(): UseQueryResult<IMembersData> {
  return useQuery({
    queryKey: queryKeys.members,
    queryFn: () => MembersService.getAll(),
  });
}

type MemberAction =
  | { kind: "add"; member: ITeamMember }
  | { kind: "update"; member: ITeamMember }
  | { kind: "remove"; memberId: string };

export function useSaveMember(): UseMutationResult<
  void,
  unknown,
  MemberAction
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (action: MemberAction) => {
      if (action.kind === "add") return MembersService.addMember(action.member);
      if (action.kind === "update")
        return MembersService.updateMember(action.member);
      return MembersService.removeMember(action.memberId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.members }),
  });
}

export function useAppConfig(): UseQueryResult<IAppConfig | undefined> {
  return useQuery({
    queryKey: queryKeys.config,
    queryFn: () => ConfigService.getJson<IAppConfig>(APP_CONFIG_KEY),
  });
}

export function useSaveAppConfig(): UseMutationResult<
  void,
  unknown,
  IAppConfig
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: IAppConfig) =>
      ConfigService.setJson<IAppConfig>(APP_CONFIG_KEY, config, "appConfig"),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.config }),
  });
}
