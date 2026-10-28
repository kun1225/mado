import { useMutation } from '@tanstack/react-query';

import { sendFeedback } from './feedback-actions';

export function useSendFeedback() {
  return useMutation({
    // The default pauses offline and sends later without a word; an error is clearer.
    networkMode: 'always',
    mutationFn: sendFeedback,
  });
}
