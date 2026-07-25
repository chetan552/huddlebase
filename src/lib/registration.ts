/**
 * Registration form schema and answer validation.
 *
 * Form questions are stored as JSON rather than as tables, so a coach can build a
 * signup form without a migration per question. Everything a client sends is
 * validated against the stored schema before it is persisted.
 */

export const FIELD_TYPES = [
    'TEXT',
    'TEXTAREA',
    'NUMBER',
    'EMAIL',
    'PHONE',
    'DATE',
    'SELECT',
    'MULTISELECT',
    'CHECKBOX',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export interface FormField {
    id: string;
    label: string;
    type: FieldType;
    required: boolean;
    options?: string[];
    helpText?: string;
}

const MAX_FIELDS = 40;
const MAX_ANSWER_LENGTH = 2000;

export function isFieldType(value: unknown): value is FieldType {
    return FIELD_TYPES.includes(value as FieldType);
}

/**
 * Validate and normalise a coach-authored field list.
 *
 * Field ids are generated server-side when absent so answers stay keyed to a stable
 * identifier even if the label is reworded later.
 */
export function parseFormFields(input: unknown): { fields: FormField[]; error: string | null } {
    let raw: unknown = input;
    if (typeof raw === 'string') {
        try {
            raw = JSON.parse(raw);
        } catch {
            return { fields: [], error: 'Fields must be valid JSON' };
        }
    }

    if (raw === undefined || raw === null) return { fields: [], error: null };
    if (!Array.isArray(raw)) return { fields: [], error: 'Fields must be an array' };
    if (raw.length > MAX_FIELDS) {
        return { fields: [], error: `A form can have at most ${MAX_FIELDS} questions` };
    }

    const fields: FormField[] = [];
    const seenIds = new Set<string>();

    for (const item of raw) {
        if (typeof item !== 'object' || item === null) {
            return { fields: [], error: 'Each field must be an object' };
        }
        const candidate = item as Record<string, unknown>;

        const label = String(candidate.label ?? '').trim();
        if (!label) return { fields: [], error: 'Every question needs a label' };

        const type = String(candidate.type ?? 'TEXT').toUpperCase();
        if (!isFieldType(type)) {
            return { fields: [], error: `"${label}" has an unsupported field type` };
        }

        let options: string[] | undefined;
        if (type === 'SELECT' || type === 'MULTISELECT') {
            const rawOptions = Array.isArray(candidate.options) ? candidate.options : [];
            options = rawOptions.map((o) => String(o).trim()).filter(Boolean);
            if (options.length === 0) {
                return { fields: [], error: `"${label}" needs at least one option` };
            }
        }

        let id = String(candidate.id ?? '').trim() || `f_${crypto.randomUUID().slice(0, 8)}`;
        // Duplicate ids would make answers ambiguous.
        while (seenIds.has(id)) id = `f_${crypto.randomUUID().slice(0, 8)}`;
        seenIds.add(id);

        fields.push({
            id,
            label: label.slice(0, 200),
            type,
            required: Boolean(candidate.required),
            ...(options ? { options } : {}),
            ...(candidate.helpText ? { helpText: String(candidate.helpText).slice(0, 300) } : {}),
        });
    }

    return { fields, error: null };
}

export function readFormFields(stored: string): FormField[] {
    try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? (parsed as FormField[]) : [];
    } catch {
        return [];
    }
}

/**
 * Check submitted answers against the form schema.
 *
 * Returns only answers for known fields, so a client can't smuggle extra keys into
 * the stored record.
 */
export function validateAnswers(
    fields: FormField[],
    input: unknown,
): { answers: Record<string, unknown>; error: string | null } {
    const raw = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
    const answers: Record<string, unknown> = {};

    for (const field of fields) {
        const value = raw[field.id];
        const isEmpty =
            value === undefined ||
            value === null ||
            value === '' ||
            (Array.isArray(value) && value.length === 0);

        if (isEmpty) {
            // An absent checkbox is an unticked one — for a required checkbox (a code
            // of conduct, say) that's a validation failure, not a missing answer.
            if (field.required) {
                return {
                    answers: {},
                    error: field.type === 'CHECKBOX'
                        ? `"${field.label}" must be checked`
                        : `"${field.label}" is required`,
                };
            }
            continue;
        }

        switch (field.type) {
            case 'NUMBER': {
                const num = Number(value);
                if (!Number.isFinite(num)) {
                    return { answers: {}, error: `"${field.label}" must be a number` };
                }
                answers[field.id] = num;
                break;
            }
            case 'EMAIL': {
                const email = String(value).trim();
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    return { answers: {}, error: `"${field.label}" must be a valid email address` };
                }
                answers[field.id] = email;
                break;
            }
            case 'DATE': {
                const date = String(value).trim();
                if (Number.isNaN(new Date(date).getTime())) {
                    return { answers: {}, error: `"${field.label}" must be a valid date` };
                }
                answers[field.id] = date;
                break;
            }
            case 'CHECKBOX': {
                const checked = value === true || value === 'true';
                if (field.required && !checked) {
                    return { answers: {}, error: `"${field.label}" must be checked` };
                }
                answers[field.id] = checked;
                break;
            }
            case 'SELECT': {
                const choice = String(value);
                if (!field.options?.includes(choice)) {
                    return { answers: {}, error: `"${field.label}" has an invalid selection` };
                }
                answers[field.id] = choice;
                break;
            }
            case 'MULTISELECT': {
                const list = Array.isArray(value) ? value.map(String) : [String(value)];
                const invalid = list.find((v) => !field.options?.includes(v));
                if (invalid) {
                    return { answers: {}, error: `"${field.label}" has an invalid selection` };
                }
                answers[field.id] = list;
                break;
            }
            default: {
                answers[field.id] = String(value).slice(0, MAX_ANSWER_LENGTH);
            }
        }
    }

    return { answers, error: null };
}

/** Whether a form is currently accepting submissions. */
export function isFormOpen(form: {
    status: string;
    opensAt: Date | null;
    closesAt: Date | null;
}): { open: boolean; reason: string | null } {
    if (form.status === 'DRAFT') return { open: false, reason: 'This form has not been published yet' };
    if (form.status === 'CLOSED') return { open: false, reason: 'Registration is closed' };

    const now = Date.now();
    if (form.opensAt && now < form.opensAt.getTime()) {
        return { open: false, reason: 'Registration has not opened yet' };
    }
    if (form.closesAt && now > form.closesAt.getTime()) {
        return { open: false, reason: 'Registration has closed' };
    }

    return { open: true, reason: null };
}
