import type { ReactNode } from "react";
import { Tabs } from "@/components/tabs";

/** The Users / Pairings tabs, with an optional action (e.g. an admin-only button) on the right. */
export function VolunteerTabs({ active, action }: { active: "users" | "pairings"; action?: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 sm:flex-none">
                <Tabs
                    label="Volunteer management"
                    tabs={[
                        { label: "Users", href: "/volunteers", active: active === "users" },
                        { label: "Pairings", href: "/volunteers/pairings", active: active === "pairings" },
                    ]}
                />
            </div>
            {action}
        </div>
    );
}
