import { unified } from "unified";
import remarkStringify from "remark-stringify";
import remarkGfm from "remark-gfm";
import { u } from "unist-builder";
import type { Root, Content } from "mdast";
import { type Program } from "./schema";

export function renderSkillBody(
  program: Program,
  rawHelpText: string,
  references: { name: string; url: string }[] = [],
): string {
  const treeChildren: Content[] = [];

  // Title
  treeChildren.push(u("heading", { depth: 1 as const }, [u("text", program.name)]));

  // Description
  // Split description by newlines to handle multi-line descriptions nicely
  const descParagraphs = program.description.split(/\n\s*\n/);
  for (const para of descParagraphs) {
    if (para.trim()) {
      treeChildren.push(u("paragraph", [u("text", para.trim())]));
    }
  }

  // Raw Help Text
  treeChildren.push(u("code", { lang: "bash", value: rawHelpText.trim() }));

  // References (Footnotes)
  if (references.length > 0) {
    treeChildren.push(u("heading", { depth: 2 as const }, [u("text", "References")]));

    const listItems = references.map((ref) =>
      u("listItem", [
        u("paragraph", [
          u("link", { url: ref.url }, [u("text", ref.name)]),
        ]),
      ]),
    );

    treeChildren.push(u("list", { ordered: false, spread: false }, listItems));
  }

  const root: Root = u("root", treeChildren);

  const processor = unified()
    .use(remarkGfm)
    .use(remarkStringify, {
      bullet: "-",
      fences: true,
    });

  return processor.stringify(root).trim();
}
