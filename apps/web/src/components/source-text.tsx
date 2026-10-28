import type { Components } from 'react-markdown';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@repo/ui/cn';

import type { TextSourceContent } from '#/features/sources/text-source.type';

/**
 * Raw HTML in the Markdown stays text: without `rehype-raw`, react-markdown
 * never turns it into elements, and it drops `javascript:` links.
 */
export function SourceTextDocument({
  text,
  className,
}: {
  text: TextSourceContent;
  className?: string;
}) {
  if (text.format === 'plain') {
    return (
      <div className={cn('t-b-2 break-words whitespace-pre-wrap', className)}>
        {text.body}
      </div>
    );
  }

  return (
    <div className={cn('t-b-2 break-words', className)}>
      <Markdown remarkPlugins={REMARK_PLUGINS} components={COMPONENTS}>
        {text.body}
      </Markdown>
    </div>
  );
}

const REMARK_PLUGINS = [remarkGfm];

// The card title is serif, so headings are too: the first line reads the same in both.
const COMPONENTS: Components = {
  h1: ({ node: _node, ...props }) => (
    <h1 className="mt-10 mb-4 t-h-4 text-balance first:mt-0" {...props} />
  ),
  h2: ({ node: _node, ...props }) => (
    <h2 className="mt-8 mb-3 t-h-6 text-balance first:mt-0" {...props} />
  ),
  h3: ({ node: _node, ...props }) => (
    <h3 className="mt-6 mb-2 t-h-7 first:mt-0" {...props} />
  ),
  h4: ({ node: _node, ...props }) => (
    <h4 className="mt-6 mb-2 font-semibold first:mt-0" {...props} />
  ),
  h5: ({ node: _node, ...props }) => (
    <h5 className="mt-6 mb-2 font-semibold first:mt-0" {...props} />
  ),
  h6: ({ node: _node, ...props }) => (
    <h6 className="mt-6 mb-2 font-semibold first:mt-0" {...props} />
  ),
  p: ({ node: _node, ...props }) => (
    <p className="my-4 first:mt-0" {...props} />
  ),
  // GFM adds its own class to task lists, so it is merged rather than spread over ours.
  ul: ({ node: _node, className, ...props }) => (
    <ul
      className={cn('my-4 list-disc pl-6 [&_ol]:my-1 [&_ul]:my-1', className)}
      {...props}
    />
  ),
  ol: ({ node: _node, className, ...props }) => (
    <ol
      className={cn(
        'my-4 list-decimal pl-6 [&_ol]:my-1 [&_ul]:my-1',
        className,
      )}
      {...props}
    />
  ),
  li: ({ node: _node, className, ...props }) => (
    <li
      className={cn(
        'my-1 has-[>input]:-ml-6 has-[>input]:list-none [&>input]:mr-2',
        className,
      )}
      {...props}
    />
  ),
  blockquote: ({ node: _node, ...props }) => (
    <blockquote
      className="my-4 border-l-2 border-border pl-4 text-muted-fg"
      {...props}
    />
  ),
  hr: ({ node: _node, ...props }) => (
    <hr className="my-8 border-border" {...props} />
  ),
  pre: ({ node: _node, ...props }) => (
    <pre
      className="my-4 overflow-x-auto rounded-md bg-muted p-4 t-b-3 font-mono [&>code]:bg-transparent [&>code]:p-0"
      {...props}
    />
  ),
  code: ({ node: _node, ...props }) => (
    <code
      className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.875em]"
      {...props}
    />
  ),
  table: ({ node: _node, ...props }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse t-b-3" {...props} />
    </div>
  ),
  th: ({ node: _node, ...props }) => (
    <th
      className="border border-border px-3 py-1.5 text-left font-medium"
      {...props}
    />
  ),
  td: ({ node: _node, ...props }) => (
    <td className="border border-border px-3 py-1.5" {...props} />
  ),
  a: ({ node: _node, ...props }) => (
    <a
      target="_blank"
      rel="noreferrer"
      className="underline decoration-muted-fg underline-offset-4 hover:decoration-fg"
      {...props}
    />
  ),
  // Loading a remote image would tell its server what the user opened, and Mado is local-first.
  img: ({ src, alt }) => {
    const label = alt || 'Image';
    return typeof src === 'string' && /^https?:\/\//i.test(src) ? (
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="underline decoration-muted-fg underline-offset-4"
      >
        {label}
      </a>
    ) : (
      <span className="text-muted-fg">{label}</span>
    );
  },
};
