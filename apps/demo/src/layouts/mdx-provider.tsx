import { MDXProvider } from "@mdx-js/react";
import type { ComponentPropsWithoutRef } from "react";
import { Link } from "react-router";

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

const components = { a: MdxLink };

export function MdxProvider(props: { children: React.ReactNode }) {
  return <MDXProvider components={components}>{props.children}</MDXProvider>;
}
