import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders an LLM/markdown string with proper headings, bold text,
 * bullet/numbered lists, tables and code. Colors inherit from the
 * surrounding chat bubble (currentColor) so it works on both the
 * light assistant bubble and the dark user bubble.
 */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed break-words space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-bold mt-3 mb-1">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold mt-3 mb-1">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold mt-2 mb-1">{children}</h4>
          ),
          p: ({ children }) => <p className="my-1">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-1 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-1 space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-snug">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline hover:opacity-80"
            >
              {children}
            </a>
          ),
          code: ({ className, children }) => {
            const isBlock = (className || "").includes("language-");
            if (isBlock) {
              return (
                <pre className="bg-black/10 rounded-md p-3 my-2 overflow-x-auto text-xs">
                  <code>{children}</code>
                </pre>
              );
            }
            return (
              <code className="bg-black/10 rounded px-1 py-0.5 text-[0.85em] font-mono">
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-current/30 pl-3 my-2 opacity-90">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-current/20 px-2 py-1 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-current/20 px-2 py-1">{children}</td>
          ),
          hr: () => <hr className="my-3 border-current/20" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
