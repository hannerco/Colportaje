// API pública del armazón de la app (HU-PAN-BASE-01).
export { AppShellProvider, useAppShell, type AppShell, type AppShellProviderProps } from './app-shell';
export {
  APP_NAV_ITEMS,
  appNavItems,
  COMING_SOON,
  NAV_HREFS,
  navIdForPath,
  PREFETCH_ROUTES,
  ROUTES,
} from './navigation';
export { ComingSoonRoute, ShellRoute, ShellScreenRoute } from './shell-route';
export { ShellScreen, type ShellScreenProps } from './screens/ShellScreen';
export { setAdminMode, useAdminMode } from './admin-mode';
export { BootScreen } from './screens/BootScreen';
export { FailureScreen, type FailureScreenProps } from './screens/FailureScreen';
export { InstallGate, InstallPrompt, type InstallPromptProps } from './components/InstallPrompt';
export { useInstallPrompt } from './install-prompt';
