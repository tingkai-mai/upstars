/** 45 → "45 min", 130 → "2 h 10 min", 7.142… → "7.1 min" */
export function formatMinutes(minutes: number) {
    const rounded = Math.round(minutes * 10) / 10;
    if (rounded < 60) return `${rounded} min`;
    const hours = Math.floor(rounded / 60);
    const rest = Math.round(rounded - hours * 60);
    return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`;
}
