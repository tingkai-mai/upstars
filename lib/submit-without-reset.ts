import { startTransition, type SubmitEvent } from "react";

/**
 * Submits a form to a useActionState dispatcher without React's automatic form reset.
 * The reset would wipe what the user entered when the action returns an error, and it
 * resets selects to their first option even when they're controlled.
 */
export function submitWithoutReset(dispatch: (formData: FormData) => void) {
    return (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => dispatch(formData));
    };
}
