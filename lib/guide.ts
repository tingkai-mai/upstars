import { readFile } from "node:fs/promises";
import path from "node:path";
import { isUserRole, type UserRole } from "@/lib/users";

export type GuideBlock = { type: "paragraph"; text: string } | { type: "list"; items: string[] };
export type GuidePage = { title: string; blocks: GuideBlock[] };

// Listed in next.config.ts outputFileTracingIncludes, so deployments bundle it
const GUIDE_PATH = path.join(process.cwd(), "content", "onboarding.md");

/** The first-login guide for this role, one page per heading. See content/onboarding.md for the format. */
export async function loadGuide(role: UserRole): Promise<GuidePage[]> {
    return parseGuide(await readFile(GUIDE_PATH, "utf8"), role);
}

/** Headings start pages; "[admin, tutor]" at the end of one limits it to those roles. */
export function parseGuide(markdown: string, role: UserRole): GuidePage[] {
    const pages: (GuidePage & { roles?: UserRole[] })[] = [];
    let paragraph: string[] = [];

    const flushParagraph = () => {
        if (paragraph.length) pages.at(-1)?.blocks.push({ type: "paragraph", text: paragraph.join(" ") });
        paragraph = [];
    };

    for (const rawLine of markdown.replace(/<!--[\s\S]*?-->/g, "").split("\n")) {
        const line = rawLine.trim();
        const heading = line.match(/^#{1,2}\s+(.+?)(?:\s*\[([^\]]*)\])?$/);
        if (heading) {
            flushParagraph();
            const roles = heading[2]
                ?.split(",")
                .map((r) => r.trim())
                .filter(isUserRole);
            pages.push({ title: heading[1], blocks: [], roles });
        } else if (line.startsWith("- ")) {
            flushParagraph();
            const blocks = pages.at(-1)?.blocks;
            const last = blocks?.at(-1);
            if (last?.type === "list") last.items.push(line.slice(2));
            else blocks?.push({ type: "list", items: [line.slice(2)] });
        } else if (line) {
            paragraph.push(line);
        } else {
            flushParagraph();
        }
    }
    flushParagraph();

    return pages.filter((page) => !page.roles || page.roles.includes(role)).map(({ title, blocks }) => ({ title, blocks }));
}
