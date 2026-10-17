import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

/**
 * Renders assistant answers as readable markdown (tables, lists, code, links)
 * in the chat panel's dark theme. Raw HTML in the answer is never executed:
 * react-markdown only renders plain markdown, and default urlTransform only
 * allows safe link protocols.
 */
const components: Components = {
  p: ({ children }) => <p className="mb-1.5 leading-relaxed last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-1.5 list-disc space-y-0.5 pl-4 marker:text-neutral-500 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-1.5 list-decimal space-y-0.5 pl-4 marker:text-neutral-500 last:mb-0">{children}</ol>
  ),
  strong: ({ children }) => <strong className="font-semibold text-neutral-50">{children}</strong>,
  a: ({ children, ...props }) => (
    <a className="text-indigo-300 underline decoration-neutral-600 underline-offset-2" target="_blank" rel="noreferrer" {...props}>
      {children}
    </a>
  ),
  code: ({ children }) => {
    // Heuristic: fenced code blocks carry newlines; inline code does not.
    const block = typeof children === "string" && children.includes("\n");
    return block ? (
      <code className="block overflow-x-auto font-mono text-xs leading-relaxed">{children}</code>
    ) : (
      <code className="rounded bg-neutral-950/70 px-1 py-0.5 font-mono text-[11px] text-indigo-200">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-neutral-950/70 p-2 last:mb-0">{children}</pre>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-neutral-700 bg-neutral-950/50 px-2 py-1 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => <td className="border border-neutral-700 px-2 py-1 align-top">{children}</td>,
  h1: ({ children }) => <h1 className="mb-1 mt-1.5 text-sm font-semibold text-neutral-50">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-1 mt-1.5 text-sm font-semibold text-neutral-50">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1 mt-1.5 text-sm font-medium text-neutral-50">{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className="my-1.5 border-l-2 border-neutral-600 pl-2 text-neutral-300">{children}</blockquote>
  ),
  hr: () => <hr className="my-2 border-neutral-700" />,
};

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
      {children}
    </ReactMarkdown>
  );
}