import { Tabs } from "@/components/tabs";

export function VolunteerTabs({ active }: { active: "users" | "pairings" }) {
    return (
        <Tabs
            label="Volunteer management"
            tabs={[
                { label: "Users", href: "/volunteers", active: active === "users" },
                { label: "Pairings", href: "/volunteers/pairings", active: active === "pairings" },
            ]}
        />
    );
}
