import { toast, Toaster as Sonner, type ToasterProps } from 'sonner';

// The app uses a `.dark` class, so toasts use our theme tokens, not sonner's own light/dark switch.
const TOASTER_STYLE = {
  '--normal-bg': 'var(--color-bg)',
  '--normal-text': 'var(--color-fg)',
  '--normal-border': 'var(--color-border)',
  '--border-radius': 'var(--radius-md)',
} as React.CSSProperties;

const TOAST_OPTIONS: ToasterProps['toastOptions'] = {
  style: { paddingBlock: '10px' },
};

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      style={TOASTER_STYLE}
      toastOptions={TOAST_OPTIONS}
      position="bottom-center"
      {...props}
    />
  );
}

export { toast, Toaster };
