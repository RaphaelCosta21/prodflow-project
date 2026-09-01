import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import { INotification } from "../models/notification";
import { NotificationService } from "../services/NotificationService";

const NOTIFICATIONS_KEY = ["notifications"] as const;

export function useNotifications(): UseQueryResult<INotification[]> {
  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: () => NotificationService.getAll(),
  });
}

export function useEnqueueNotification(): UseMutationResult<
  void,
  unknown,
  Omit<INotification, "id" | "status" | "created">
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (n: Omit<INotification, "id" | "status" | "created">) =>
      NotificationService.enqueue(n),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}
