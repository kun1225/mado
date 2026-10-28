import { useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';

import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';

import { FEEDBACK_MAX_LENGTH } from '#/features/feedback/feedback-actions';
import { useSendFeedback } from '#/features/feedback/feedback-hooks';
import type { SettingsFeedbackTabProps } from '#/features/settings/settings.type';

const MESSAGE_ID = 'settings-feedback-message';
const EMAIL_ID = 'settings-feedback-email';
const EMAIL_HINT_ID = 'settings-feedback-email-hint';

export function SettingsFeedbackTab({ authUser }: SettingsFeedbackTabProps) {
  const [message, setMessage] = useState('');
  // Prefilled, so a signed-in user can get a reply without typing it.
  const [email, setEmail] = useState(authUser?.email ?? '');
  const send = useSendFeedback();
  const canSend = message.trim().length > 0 && !send.isPending;

  // *** handleSubmit ***
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;
    send.mutate(
      { message: message.trim(), email: email.trim() },
      { onSuccess: () => setMessage('') },
    );
  }

  // *** handleMessageKeyDown ***
  // Enter makes a new line, so Cmd/Ctrl+Enter sends.
  function handleMessageKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  if (send.isSuccess) {
    return (
      <section className="space-y-4">
        <p role="status" className="t-b-3">
          Thanks! Your feedback was sent.
        </p>
        <Button variant="outline" onClick={() => send.reset()}>
          Send more
        </Button>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={send.isPending}
      className="space-y-6"
    >
      <p className="t-b-3 text-muted-fg">
        Tell us what you like, what is broken, or what you wish Mado could do.
      </p>
      <fieldset disabled={send.isPending} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor={MESSAGE_ID} className="t-b-3">
            Message
          </label>
          <textarea
            id={MESSAGE_ID}
            required
            rows={6}
            maxLength={FEEDBACK_MAX_LENGTH}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleMessageKeyDown}
            className="w-full resize-y rounded-md border border-border bg-transparent px-2.5 py-2 t-b-2 transition-colors outline-none placeholder:text-muted-fg focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={EMAIL_ID} className="t-b-3">
            Email <span className="text-muted-fg">(optional)</span>
          </label>
          <Input
            id={EMAIL_ID}
            type="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-describedby={EMAIL_HINT_ID}
            className="h-11"
          />
          <p id={EMAIL_HINT_ID} className="t-b-4 text-muted-fg">
            Only if you want a reply.
          </p>
        </div>
        <Button type="submit" disabled={!canSend} className="h-11 w-full">
          {send.isPending ? 'Sending…' : 'Send feedback'}
        </Button>
      </fieldset>
      {send.error && (
        <p role="alert" className="t-b-3 text-danger">
          {send.error.message}
        </p>
      )}
    </form>
  );
}
