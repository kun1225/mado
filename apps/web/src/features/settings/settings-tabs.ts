import { isSignInOn } from '#/features/auth/auth-session';

import type { SettingsTab } from './settings.type';
import { SETTINGS_TABS } from './settings.type';

// A signed-in user keeps the tab, so turning sign-in off never hides their account.
export function visibleSettingsTabs(signedIn: boolean): readonly SettingsTab[] {
  if (signedIn || isSignInOn()) return SETTINGS_TABS;
  return SETTINGS_TABS.filter((tab) => tab !== 'account');
}
