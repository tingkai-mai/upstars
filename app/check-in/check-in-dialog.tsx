"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { textareaClass } from "@/components/form";
import { CheckIcon } from "@/components/icons";
import { Modal } from "@/components/modal";

type Saved = { message: string; shareText: string };

type FormEvents = {
    /** Closes the check-in modal and opens the Share on WhatsApp modal */
    onSaved: (saved: Saved) => void;
    /** Whether the form has unsaved ticks or remarks, so closing it can ask first */
    setDirty: (dirty: boolean) => void;
};

const FormEventsContext = createContext<FormEvents>({ onSaved: () => {}, setDirty: () => {} });

/** For the form inside the check-in modal. */
export function useCheckInFormEvents() {
    return useContext(FormEventsContext);
}

type OpenModal = "check-in" | "past" | "share" | null;

/**
 * The homepage's check-in buttons and their modals. A modal stays open while its pickers change the URL,
 * since this component keeps its place in the tree; only the contents re-render.
 */
export function CheckInActions({ checkIn, pastCheckIns }: { checkIn: ReactNode; pastCheckIns: ReactNode }) {
    const [openModal, setOpenModal] = useState<OpenModal>(null);
    const [saved, setSaved] = useState<Saved>();
    // A ref, not state: the form reports on every change and nothing re-renders from it
    const dirty = useRef(false);

    // Close if Next hides this page (it keeps visited pages alive)
    useEffect(() => () => setOpenModal(null), []);

    function open(modal: OpenModal) {
        dirty.current = false;
        setSaved(undefined);
        setOpenModal(modal);
    }

    function onSaved(result: Saved) {
        dirty.current = false;
        setSaved(result);
        setOpenModal("share");
    }

    function setDirty(value: boolean) {
        dirty.current = value;
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
                    className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-zinc-300 bg-white px-5 text-base font-medium text-zinc-800 transition hover:bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                    Past Check-Ins
                </button>
            </div>
            {saved && openModal !== "share" && (
                <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-base text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                    {saved.message}
                </p>
            )}

            {openModal === "check-in" && (
                <Modal title="Lesson check-in" onClose={close} size="full" confirmClose={() => !dirty.current || confirm("Close without saving? Your ticks and remarks will be lost.")}>
                    <FormEventsContext value={{ onSaved, setDirty }}>{checkIn}</FormEventsContext>
                </Modal>
            )}
            {openModal === "past" && (
                <Modal title="Past Check-Ins" onClose={close} closeLabel="Close" size="full">
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
        <Modal title="Share on WhatsApp" onClose={onClose} closeLabel="Skip">
            <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-base font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                <CheckIcon />
                Check-in saved
            </p>
            <p className="text-base text-zinc-700 dark:text-zinc-300">Want to send your remarks to the student&apos;s parents? WhatsApp will ask who to send them to.</p>
            <a
                href={`https://wa.me/?text=${encodeURIComponent(text)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!text.trim()}
                className={`inline-flex h-12 w-full items-center justify-center rounded-xl bg-emerald-600 px-5 text-base font-medium text-white transition hover:bg-emerald-700 active:scale-[0.99] ${text.trim() ? "" : "pointer-events-none opacity-60"}`}
            >
                Share on WhatsApp
            </a>
            <div className="flex flex-col gap-2">
                <label htmlFor="share-text" className="text-base font-medium text-zinc-800 dark:text-zinc-200">
                    Message (you can change it)
                </label>
                <textarea id="share-text" value={text} onChange={(event) => setText(event.target.value)} rows={5} className={textareaClass} />
            </div>
        </Modal>
    );
}
