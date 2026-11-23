'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthorizeEmailInput } from '@/domain/app-user';
import { useRepositories } from '../shared/repositories-provider';
import { unwrap } from '../shared/app-failure';
import { authorizeEmail, listUsers, removePendingEmail, setUserActive } from './use-cases/manage-users';

export const userQueryKeys = { all: ['users'] as const };

/** Admin · Usuarios: la lista (solo con `enabled`, p. ej. si el perfil es admin). */
export function useUsers(enabled: boolean) {
  const { users } = useRepositories();
  return useQuery({
    queryKey: userQueryKeys.all,
    queryFn: async () => unwrap(await listUsers({ users })),
    enabled,
  });
}

function useUsersMutation<TInput>(
  run: (deps: ReturnType<typeof useRepositories>, input: TInput) => ReturnType<typeof authorizeEmail>,
) {
  const repositories = useRepositories();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: TInput) => run(repositories, input),
    onSuccess: (result) => {
      if (result.ok) void queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
    },
  });
  return mutation.mutateAsync;
}

export function useAuthorizeEmail() {
  return {
    authorizeEmail: useUsersMutation((deps, input: AuthorizeEmailInput) => authorizeEmail(deps, input)),
  };
}

export function useRemovePendingEmail() {
  return { removePendingEmail: useUsersMutation((deps, email: string) => removePendingEmail(deps, email)) };
}

export function useSetUserActive() {
  return {
    setUserActive: useUsersMutation((deps, input: { userId: string; active: boolean }) =>
      setUserActive(deps, input),
    ),
  };
}
