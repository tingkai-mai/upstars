"use client";
import { useId, useOptimistic, useState, useTransition, type ReactNode } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type Announcements, type DragEndEvent, type UniqueIdentifier } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { FormError } from "@/components/form";

export type SortableItem = {
    id: string;
    /** Read out to screen readers and used in the handle's label, e.g. "Move Fractions" */
    name: string;
    content: ReactNode;
};

type Props = {
    items: SortableItem[];
    /** A Server Action bound to the list, given every item's id in the new order */
    action: (orderedIds: string[]) => Promise<{ error?: string }>;
    /** What the list holds, e.g. "Concepts in week 3" */
    label: string;
    className?: string;
    itemClassName?: string;
};

const screenReaderInstructions = {
    draggable: "To move this item, press Space. Then use the up and down arrow keys to move it, and press Space again to drop it, or Escape to cancel.",
};

/**
 * A list people reorder by dragging each item's handle, or with the keyboard (Space, arrow keys, Space).
 * The new order shows straight away and is saved; if saving fails it goes back and the error shows under the list.
 */
export function SortableList({ items, action, label, className, itemClassName }: Props) {
    const serverOrder = items.map((item) => item.id);
    // Falls back to the server's order once the save finishes, which by then includes the change
    const [order, setOrder] = useOptimistic(serverOrder);
    const [error, setError] = useState<string>();
    const [pending, startTransition] = useTransition();
    // A stable id keeps dnd-kit's generated aria attributes the same on the server and client
    const dndId = useId();
    const sensors = useSensors(
        // A small movement before dragging starts, so a tap on the handle doesn't count as a drag
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const byId = new Map(items.map((item) => [item.id, item]));
    const nameOf = (id: UniqueIdentifier) => byId.get(String(id))?.name ?? "Item";
    const placeOf = (id: UniqueIdentifier) => `${order.indexOf(String(id)) + 1} of ${order.length}`;
    const announcements: Announcements = {
        onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}. It's number ${placeOf(active.id)}.`,
        onDragOver: ({ active, over }) => (over ? `${nameOf(active.id)} moved to number ${placeOf(over.id)}.` : `${nameOf(active.id)} is outside the list.`),
        onDragEnd: ({ active, over }) => (over ? `Dropped ${nameOf(active.id)} at number ${placeOf(over.id)}.` : `Dropped ${nameOf(active.id)}. Nothing moved.`),
        onDragCancel: ({ active }) => `Cancelled. ${nameOf(active.id)} is back where it was.`,
    };

    function handleDragEnd({ active, over }: DragEndEvent) {
        if (!over || active.id === over.id || pending) return;
        const next = arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id)));
        setError(undefined);
        startTransition(async () => {
            setOrder(next);
            const result = await action(next);
            // State updates after an await must be wrapped again to stay in the transition
            if (result.error) startTransition(() => setError(result.error));
        });
    }

    const sortable = items.length > 1;
    const ordered = order.flatMap((id) => byId.get(id) ?? []);

    return (
        <>
            <DndContext
                id={dndId}
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                onDragEnd={handleDragEnd}
                accessibility={{ announcements, screenReaderInstructions }}
            >
                <SortableContext items={order} strategy={verticalListSortingStrategy}>
                    <ol aria-label={label} aria-busy={pending} className={className}>
                        {ordered.map((item) => (
                            <SortableRow key={item.id} item={item} sortable={sortable} className={itemClassName} />
                        ))}
                    </ol>
                </SortableContext>
            </DndContext>
            <FormError message={error} />
        </>
    );
}

function SortableRow({ item, sortable, className = "" }: { item: SortableItem; sortable: boolean; className?: string }) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: !sortable });

    return (
        <li
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            // Lifted above its neighbours while dragging, so it's clear what's moving
            className={`flex items-start gap-1 ${isDragging ? "relative z-20 rounded-xl bg-white shadow-lg ring-2 ring-zinc-900 dark:bg-zinc-900 dark:ring-zinc-50" : ""} ${className}`}
        >
            {sortable && (
                <button
                    type="button"
                    ref={setActivatorNodeRef}
                    {...attributes}
                    {...listeners}
                    aria-label={`Move ${item.name}`}
                    // touch-none: on phones, dragging the handle moves the item instead of scrolling the page
                    className={`mt-1 inline-flex size-11 shrink-0 touch-none items-center justify-center rounded-lg text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 ${
                        isDragging ? "cursor-grabbing" : "cursor-grab"
                    }`}
                >
                    <GripIcon />
                </button>
            )}
            <div className="min-w-0 flex-1">{item.content}</div>
        </li>
    );
}

/** Two columns of dots: the usual sign for "drag me" */
function GripIcon() {
    return (
        <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="size-5">
            {[5, 10, 15].flatMap((y) => [7, 13].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.5} />))}
        </svg>
    );
}
