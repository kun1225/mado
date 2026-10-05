import { toast, Toaster as Sonner, type ToasterProps } from 'sonner';

// The app sets its theme with a `.dark` class, so the toast colors come from
// the theme tokens instead of sonner's own light/dark switch.
const TOASTER_STYLE = {
  '--normal-bg': 'var(--color-bg)',
  '--normal-text': 'var(--color-fg)',
  '--normal-border': 'var(--color-border)',
  '--border-radius': 'var(--radius-md)',
} as React.CSSProperties;

function Toaster(props: ToasterProps) {
  return <Sonner style={TOASTER_STYLE} position="bottom-center" {...props} />;
}

export { toast, Toaster };
