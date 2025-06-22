type ElementInfo  = {
    tag: string;
    id: string | null;
    classes: string | null;
    text: string;
    attributes: Record<string, string>;
}

export type { ElementInfo };