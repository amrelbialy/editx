import type { ComponentType } from "react";
import { DocsLayout } from "../layouts/docs-layout";
import { MdxProvider } from "../layouts/mdx-provider";

export function DocsPage(props: { component: ComponentType }) {
  const { component: Content } = props;
  return (
    <DocsLayout>
      <MdxProvider>
        <Content />
      </MdxProvider>
    </DocsLayout>
  );
}
