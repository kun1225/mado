import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from '@tanstack/react-router';

import { Toaster } from '@repo/ui/sonner';

import { SETTINGS_THEME_SCRIPT } from '#/features/settings/settings-theme';
import { useSettingsTheme } from '#/features/settings/settings-theme-hooks';

import appCss from '../styles.css?url';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        {
          charSet: 'utf-8',
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
        {
          title: 'Mado',
        },
      ],
      links: [
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: '/favicon.svg',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossOrigin: 'anonymous',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap',
        },
        {
          rel: 'stylesheet',
          href: appCss,
        },
      ],
    }),
    shellComponent: RootDocument,
  },
);

const TOAST_OFFSET = { bottom: 88 };

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    // The startup script adds the theme class before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SETTINGS_THEME_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        <SettingsThemeSync />
        {children}
        <Toaster offset={TOAST_OFFSET} mobileOffset={TOAST_OFFSET} />
        <Scripts />
      </body>
    </html>
  );
}

// *** SettingsThemeSync ***
// Keeps System following the device while the settings panel is closed.
function SettingsThemeSync() {
  useSettingsTheme();
  return null;
}
