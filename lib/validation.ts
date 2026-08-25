// ─── Sanitizers ────────────────────────────────────────────────────────────────

/** Trim and collapse whitespace */
export const sanitize = (value: string) => value.trim();

/** Strip spaces entirely — for single-word fields like first/last name */
export const sanitizeName = (value: string) =>
    value.replace(/\s/g, '').replace(/[^a-zA-ZÀ-ÿ'-]/g, '');

/** Strip non-numeric chars — for phone, account numbers */
export const sanitizeDigits = (value: string) => value.replace(/[^0-9]/g, '');

/** Lowercase and trim — for email */
export const sanitizeEmail = (value: string) => value.trim().toLowerCase();

/** Strip dangerous chars — for free text (description, title) */
export const sanitizeText = (value: string) =>
    value.replace(/[<>{}]/g, '').trim();

/** Strip non-currency chars — for price inputs */
export const sanitizePrice = (value: string) => value.replace(/[^0-9.]/g, '');

/**
 * Format a price for DISPLAY only — adds thousands separators as the user
 * types: 600000 -> 600,000 | 6000000 -> 6,000,000
 *
 * Always run sanitizePrice() before writing to the database so commas
 * never reach the server (e.g. parseFloat(sanitizePrice(form.price))).
 */
export const formatPriceInput = (value: string): string => {
    const clean = sanitizePrice(value);
    if (!clean) return '';
    const num = Number(clean);
    if (isNaN(num)) return clean;
    const formatted = num.toLocaleString('en-US', { maximumFractionDigits: 2 });
    // Keep a trailing "." the user is in the middle of typing
    return clean.endsWith('.') ? `${formatted}.` : formatted;
};


// ─── Validators ────────────────────────────────────────────────────────────────
// Each returns an error message or null if valid.

export const validateName = (value: string, fieldLabel = 'Name'): string | null => {
    const clean = sanitizeName(value);
    if (!clean) return `${fieldLabel} is required`;
    if (clean.length < 2) return `${fieldLabel} must be at least 2 characters`;
    if (clean.length > 50) return `${fieldLabel} is too long`;
    return null;
};

export const validateEmail = (value: string): string | null => {
    const clean = sanitizeEmail(value);
    if (!clean) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) return 'Please enter a valid email address';
    return null;
};

export const validatePassword = (value: string): string | null => {
    if (!value) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (value.length > 128) return 'Password is too long';
    if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
    if (!/[0-9]/.test(value)) return 'Password must contain at least one number';
    return null;
};

export const validatePhone = (value: string): string | null => {
    const clean = sanitizeDigits(value);
    if (!clean) return 'Phone number is required';
    if (clean.length < 10 || clean.length > 15) return 'Please enter a valid phone number';
    return null;
};

export const validateAccountNumber = (value: string): string | null => {
    const clean = sanitizeDigits(value);
    if (!clean) return 'Account number is required';
    if (clean.length !== 10) return 'Account number must be 10 digits';
    return null;
};

export const validateRequired = (value: string, fieldLabel = 'This field'): string | null => {
    if (!sanitize(value)) return `${fieldLabel} is required`;
    return null;
};

export const validatePrice = (value: string): string | null => {
    const clean = sanitizePrice(value);
    if (!clean) return 'Price is required';
    const num = parseFloat(clean);
    if (isNaN(num) || num <= 0) return 'Please enter a valid price';
    return null;
};

export const validateDescription = (value: string, min = 10): string | null => {
    const clean = sanitizeText(value);
    if (!clean) return 'Description is required';
    if (clean.length < min) return `Please write at least ${min} characters`;
    return null;
};


// ─── Batch validator ───────────────────────────────────────────────────────────
// Pass an array of { check, message } — returns the first error found, or null.
export type ValidationRule = { check: () => string | null };

export const validateAll = (rules: ValidationRule[]): string | null => {
    for (const rule of rules) {
        const error = rule.check();
        if (error) return error;
    }
    return null;
};
