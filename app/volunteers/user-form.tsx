"use client";
import { useActionState } from "react";
import { Field, FormError, inputClass, primaryButtonClass, selectClass, selectStyle } from "@/components/form";
import { MIN_PASSWORD_LENGTH, ROLE_LABELS, USER_ROLES } from "@/lib/users";
import { submitWithoutReset } from "@/lib/submit-without-reset";
import type { ActionState, UserFormValues } from "./actions";

type Props = {
    action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
    defaults: UserFormValues;
    mode: "create" | "edit";
    /** Admins can't change their own role, so they can't lock themselves out. */
    roleLocked?: boolean;
};

// Next keeps this page alive (hidden) after leaving it, so clear the fields on the way out.
// Defined outside the component: a new ref function each render would reset on every render.
const resetWhenHidden = (form: HTMLFormElement | null) => () => form?.reset();

export function UserForm({ action, defaults, mode, roleLocked = false }: Props) {
    const [state, dispatch, pending] = useActionState(action, {});

    return (
        <form onSubmit={submitWithoutReset(dispatch)} ref={resetWhenHidden} className="flex flex-col gap-5">
            <Field label="Name" htmlFor="name">
                <input id="name" name="name" type="text" autoComplete="off" required defaultValue={defaults.name} className={inputClass} />
            </Field>

            <Field label="Email" htmlFor="email">
                <input
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    defaultValue={defaults.email}
                    className={inputClass}
                />
            </Field>

            <Field label="Role" htmlFor="role" hint={roleLocked ? "You can't change your own role." : "Changing a role removes the user's existing pairings."}>
                <select id="role" name="role" defaultValue={defaults.role} disabled={roleLocked} className={selectClass} style={selectStyle}>
                    {USER_ROLES.map((option) => (
                        <option key={option} value={option}>
                            {ROLE_LABELS[option]}
                        </option>
                    ))}
                </select>
                {/* Disabled selects aren't submitted */}
                {roleLocked && <input type="hidden" name="role" value={defaults.role} />}
            </Field>

            {mode === "create" && (
                <Field label="Temporary password" htmlFor="password" hint={`At least ${MIN_PASSWORD_LENGTH} characters. Share it with the user so they can sign in.`}>
                    <input id="password" name="password" type="text" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required className={inputClass} />
                </Field>
            )}

            <FormError message={state.error} />

            <button type="submit" disabled={pending} className={`mt-1 ${primaryButtonClass}`}>
                {mode === "create" ? (pending ? "Creating…" : "Create user") : pending ? "Saving…" : "Save changes"}
            </button>
        </form>
    );
}

