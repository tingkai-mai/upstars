"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { textareaClass } from "@/components/form";
import { Modal } from "@/components/modal";

type Saved = { message: string; shareText: string };

const OnSavedContext = createContext<(saved: Saved) => void>(() => {});

/** For the form inside the check-in modal: closes it and opens the Share on WhatsApp modal. */
export function useOnCheckInSaved() {
    return useContext(OnSavedContext);
}

type OpenModal = "check-in" | "past" | "share" | null;

/**
 * The homepage's check-in buttons and their modals. A modal stays open while its pickers change the URL,
 * since this component keeps its place in the tree; only the contents re-render.
 */
export function CheckInActions({ checkIn, pastCheckIns }: { checkIn: ReactNode; pastCheckIns: ReactNode }) {
    const [openModal, setOpenModal] = useState<OpenModal>(null);
    const [saved, setSaved] = useState<Saved>();

    // Close if Next hides this page (it keeps visited pages alive)
    useEffect(() => () => setOpenModal(null), []);

    function open(modal: OpenModal) {
        setSaved(undefined);
        setOpenModal(modal);
    }

    function onSaved(result: Saved) {
        setSaved(result);
        setOpenModal("share");
    }

    const close = () => setOpenModal(null);

    return (
        <>
            <div className="flex flex-col gap-2">
                <button
                    type="button"
                    onClick={() => open("check-in")}
                    className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-zinc-900 px-5 text-lg font-semibold text-white transition hover:bg-zinc-700 active:scale-[0.99] dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                    Check in a lesson
                </button>
                <button
                    type="button"
                    onClick={() => open("past")}
                    className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-zinc-300 px-5 text-base font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                    Past Check-Ins
                </button>
            </div>
            {saved && openModal !== "share" && (
                <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                    {saved.message}
                </p>
            )}

            {openModal === "check-in" && (
                <Modal title="Lesson check-in" onClose={close}>
                    <OnSavedContext value={onSaved}>{checkIn}</OnSavedContext>
                </Modal>
            )}
            {openModal === "past" && (
                <Modal title="Past Check-Ins" onClose={close} closeLabel="Close">
                    {pastCheckIns}
                </Modal>
            )}
            {openModal === "share" && saved && <ShareModal initialText={saved.shareText} onClose={close} />}
        </>
    );
}

/** Lets the user tweak the message, then hands it to WhatsApp, which asks who to send it to. */
function ShareModal({ initialText, onClose }: { initialText: string; onClose: () => void }) {
    const [text, setText] = useState(initialText);

    return (
        <Modal title="Share on WhatsApp" onClose={onClose} closeLabel="Done">
            <p className="-mt-2 text-sm text-zinc-500 dark:text-zinc-400">Checked in. Share your remarks, e.g. with the student&apos;s parents.</p>
            <label htmlFor="share-text" className="sr-only">
                Message
            </label>
            <textarea id="share-text" value={text} onChange={(event) => setText(event.target.value)} rows={8} className={textareaClass} />
            <a
                href={`https://wa.me/?text=${encodeURIComponent(text)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!text.trim()}
                className={`inline-flex h-12 w-full items-center justify-center rounded-xl bg-emerald-600 px-5 text-base font-medium text-white transition hover:bg-emerald-700 active:scale-[0.99] ${text.trim() ? "" : "pointer-events-none opacity-60"}`}
            >
                Share on WhatsApp
            </a>
        </Modal>
    );
}
