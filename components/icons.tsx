const iconProps = {
    "aria-hidden": true,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "size-4 shrink-0",
} as const;

export function PenIcon() {
    return (
        <svg {...iconProps}>
            <path d="M13.6 3.4a1.9 1.9 0 0 1 2.7 2.7L7 15.4l-3.5.9.9-3.5 9.2-9.4Z" />
            <path d="m12 5 3 3" />
        </svg>
    );
}

/** A list with a pencil: editing a list of items */
export function EditListIcon() {
    return (
        <svg {...iconProps}>
            <path d="M3.5 5h8M3.5 9.5h6M3.5 14h3.5" />
            <path d="M14.6 9.4a1.4 1.4 0 0 1 2 2l-4.8 4.8-2.6.6.6-2.6 4.8-4.8Z" />
        </svg>
    );
}

export function CheckIcon() {
    return (
        <svg {...iconProps}>
            <path d="m4.5 10.5 3.5 3.5 7.5-8" />
        </svg>
    );
}
