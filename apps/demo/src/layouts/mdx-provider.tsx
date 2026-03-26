import { MDXProvider } from "@mdx-js/react";
import type { ComponentPropsWithoutRef } from "react";
import { isValidElement } from "react";
import { Link } from "react-router";
import { CodeHighlight } from "../components/code-highlight";

function MdxLink(props: ComponentPropsWithoutRef<"a">) {
  const { href, children, ...rest } = props;
  if (href?.startsWith("/")) {
    return (
      <Link to={href} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}

function MdxPre(props: ComponentPropsWithoutRef<"pre">) {
  const child = props.children;
  if (isValidElement(child)) {
    const childProps = child.props as { children?: unknown };
    const text = childProps?.children;
    if (typeof text === "string" && text.trim()) {
      return <CodeHighlight code={text.trimEnd()} className="mb-5" />;
    }
  }
  return <pre {...props} />;
}

const components = { a: MdxLink, pre: MdxPre };

export function MdxProvider(props: { children: React.ReactNode }) {
  return <MDXProvider components={components}>{props.children}</MDXProvider>;
}
