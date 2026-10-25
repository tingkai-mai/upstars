"use client";
import { useEffect, useState } from "react";

/**
 * A short-lived message at the bottom of the screen, e.g. after a redirect. Its ?notice= param is removed
 * with the native history API, which updates the URL without re-rendering the page and losing the toast.
 */
export function Toast({ message, param = "notice" }: { message: string; param?: string }) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete(param);
        window.history.replaceState(null, "", url);
        const timer = setTimeout(() => setVisible(false), 4000);
        return () => clearTimeout(timer);
    }, [param]);

    if (!visible) return null;
    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <p role="status" className="pointer-events-auto rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-lg dark:bg-zinc-50 dark:text-zinc-900">
                {message}
            </p>
        </div>
    );
}
