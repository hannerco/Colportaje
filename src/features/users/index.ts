// API pública de Admin · Usuarios (ronda 34, #43).
export { useAuthorizeEmail, useRemovePendingEmail, useSetUserActive, userQueryKeys, useUsers } from './hooks';
export { authorizeEmail, listUsers, removePendingEmail, setUserActive } from './use-cases/manage-users';
export { AdminUsersScreen, type AdminUsersScreenProps } from './screens/AdminUsersScreen';
