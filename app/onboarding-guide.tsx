"use client";
import { useEffect, useState, type ReactNode } from "react";
import { primaryButtonClass, secondaryButtonClass } from "@/components/form";
import { Modal } from "@/components/modal";
import type { GuideBlock, GuidePage } from "@/lib/guide";
import { markGuideSeen } from "./guide-actions";

type Props = {
    pages: GuidePage[];
    /**
     * Where "seen" is remembered. Real accounts use the database, so it's once per person. Demo accounts are
     * shared by many people at once, so they use this browser instead: everyone trying the demo gets the guide.
     */
    seenIn: "account" | "browser";
    /** For seenIn="account": whether the user has already dismissed it */
    seen: boolean;
    userId: string;
};

const storageKey = (userId: string) => `upstars:guide-seen:${userId}`;

function seenInBrowser(userId: string) {
    try {
        return localStorage.getItem(storageKey(userId)) !== null;
    } catch {
        return true; // Storage blocked: don't nag on every visit
    }
}

/** The first-login guide: opens itself the first time, and from the Guide button any time after. */
export function OnboardingGuide({ pages, seenIn, seen, userId }: Props) {
    const [open, setOpen] = useState(seenIn === "account" && !seen);
    const [page, setPage] = useState(0);

    // localStorage only exists in the browser, so the demo check runs after mount
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only state once on mount
        if (seenIn === "browser" && !seenInBrowser(userId)) setOpen(true);
    }, [seenIn, userId]);

    function close() {
        setOpen(false);
        setPage(0);
        if (seenIn === "account") {
            if (!seen) void markGuideSeen();
            return;
        }
        try {
            localStorage.setItem(storageKey(userId), new Date().toISOString());
        } catch {}
    }

    if (pages.length === 0) return null;
    const current = pages[page];
    const isLast = page === pages.length - 1;

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} className={secondaryButtonClass}>
                Guide
            </button>
            {open && (
                <Modal title={current.title} onClose={close} closeLabel="Close guide">
                    <div className="flex min-h-48 flex-col gap-3 text-lg text-zinc-800 dark:text-zinc-300">
                        {current.blocks.map((block, index) => (
                            <Block key={index} block={block} />
                        ))}
                    </div>

                    <p className="text-center text-base text-zinc-600 dark:text-zinc-400">
                        Page {page + 1} of {pages.length}
                    </p>

                    <div className="flex gap-3">
                        {page > 0 && (
                            <button type="button" onClick={() => setPage(page - 1)} className={`${secondaryButtonClass} h-12 flex-1`}>
                                Back
                            </button>
                        )}
                        <button type="button" onClick={() => (isLast ? close() : setPage(page + 1))} className={`${primaryButtonClass} flex-1`}>
                            {isLast ? "Get started" : "Next"}
                        </button>
                    </div>
                </Modal>
            )}
        </>
    );
}

function Block({ block }: { block: GuideBlock }) {
    if (block.type === "paragraph") return <p>{withBold(block.text)}</p>;
    return (
        <ul className="flex list-disc flex-col gap-1 pl-5">
            {block.items.map((item, index) => (
                <li key={index}>{withBold(item)}</li>
            ))}
        </ul>
    );
}

/** "a **b** c" → a <strong>b</strong> c. Plain React text otherwise, so the markdown can't inject HTML. */
function withBold(text: string): ReactNode[] {
    return text.split(/\*\*(.+?)\*\*/g).map((part, index) =>
        index % 2 === 1 ? (
            <strong key={index} className="font-semibold text-zinc-900 dark:text-zinc-50">
                {part}
            </strong>
        ) : (
            part
        ),
    );
}
