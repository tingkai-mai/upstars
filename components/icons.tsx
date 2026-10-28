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

// Larger icons for the homepage's module cards
const moduleIconProps = { ...iconProps, strokeWidth: 1.5, className: "size-6 shrink-0" } as const;

export function PeopleIcon() {
    return (
        <svg {...moduleIconProps}>
            <circle cx="7.5" cy="6.5" r="2.5" />
            <path d="M2.5 16c0-2.8 2.2-5 5-5s5 2.2 5 5" />
            <circle cx="14" cy="7.5" r="2" />
            <path d="M13.5 11.6c2.3-.3 4 1.6 4 4.4" />
        </svg>
    );
}

export function BookIcon() {
    return (
        <svg {...moduleIconProps}>
            <path d="M10 5.5C8.5 4.3 6.3 3.8 3 4v11c3.3-.2 5.5.3 7 1.5 1.5-1.2 3.7-1.7 7-1.5V4c-3.3-.2-5.5.3-7 1.5Z" />
            <path d="M10 5.5v11" />
        </svg>
    );
}

export function TargetIcon() {
    return (
        <svg {...moduleIconProps}>
            <circle cx="10" cy="10" r="7" />
            <circle cx="10" cy="10" r="4" />
            <circle cx="10" cy="10" r="1" />
        </svg>
    );
}

export function LinkIcon() {
    return (
        <svg {...moduleIconProps}>
            <path d="M8.5 11.5a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 0 0-4.2-4.2l-.9.9" />
            <path d="M11.5 8.5a3 3 0 0 0-4.2 0l-2.6 2.6a3 3 0 0 0 4.2 4.2l.9-.9" />
        </svg>
    );
}

export function ChevronRightIcon() {
    return (
        <svg {...iconProps} className="size-5 shrink-0">
            <path d="m8 5 5 5-5 5" />
        </svg>
    );
}

export function MailIcon() {
    return (
        <svg {...iconProps} className="size-5 shrink-0">
            <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
            <path d="m3 5.5 7 5.5 7-5.5" />
        </svg>
    );
}
