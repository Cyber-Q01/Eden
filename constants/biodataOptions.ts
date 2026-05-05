// ─── Biodata Form Option Constants ───────────────────────────────────────────

export const GENDER_OPTIONS = [
    { label: 'Male', value: 'Male', icon: 'man-outline' },
    { label: 'Female', value: 'Female', icon: 'woman-outline' },
    { label: 'Other', value: 'Other', icon: 'people-outline' },
    { label: 'Prefer not to say', value: 'Prefer not to say', icon: 'ellipsis-horizontal-outline' },
];

export const ID_TYPE_OPTIONS = [
    { label: 'National ID (NIN)', value: 'NIN', icon: 'card-outline' },
    { label: 'International Passport', value: 'Passport', icon: 'airplane-outline' },
    { label: "Voter's Card", value: 'Voters Card', icon: 'checkmark-circle-outline' },
    { label: "Driver's License", value: 'Drivers License', icon: 'car-outline' },
];

export const EMPLOYMENT_OPTIONS = [
    { label: 'Employed', value: 'Employed', icon: 'briefcase-outline' },
    { label: 'Self-employed', value: 'Self-employed', icon: 'storefront-outline' },
    { label: 'Student', value: 'Student', icon: 'school-outline' },
    { label: 'Unemployed', value: 'Unemployed', icon: 'close-circle-outline' },
    { label: 'Retired', value: 'Retired', icon: 'hourglass-outline' },
];

export const INCOME_OPTIONS = [
    { label: 'Below ₦50,000', value: 'Below ₦50,000', icon: 'trending-down-outline' },
    { label: '₦50,000 - ₦150,000', value: '₦50,000 - ₦150,000', icon: 'remove-outline' },
    { label: '₦150,000 - ₦500,000', value: '₦150,000 - ₦500,000', icon: 'trending-up-outline' },
    { label: '₦500,000 - ₦1,000,000', value: '₦500,000 - ₦1,000,000', icon: 'trending-up-outline' },
    { label: 'Above ₦1,000,000', value: 'Above ₦1,000,000', icon: 'diamond-outline' },
];

export const RELATIONSHIP_OPTIONS = [
    { label: 'Parent', value: 'Parent', icon: 'people-outline' },
    { label: 'Spouse', value: 'Spouse', icon: 'heart-outline' },
    { label: 'Sibling', value: 'Sibling', icon: 'people-outline' },
    { label: 'Child', value: 'Child', icon: 'person-outline' },
    { label: 'Friend', value: 'Friend', icon: 'happy-outline' },
    { label: 'Colleague', value: 'Colleague', icon: 'briefcase-outline' },
    { label: 'Other', value: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export const BANK_OPTIONS = [
    { label: 'Access Bank', value: 'Access Bank', icon: 'business-outline' },
    { label: 'GTBank', value: 'GTBank', icon: 'business-outline' },
    { label: 'Zenith Bank', value: 'Zenith Bank', icon: 'business-outline' },
    { label: 'First Bank', value: 'First Bank', icon: 'business-outline' },
    { label: 'UBA', value: 'UBA', icon: 'business-outline' },
    { label: 'Sterling Bank', value: 'Sterling Bank', icon: 'business-outline' },
    { label: 'Fidelity Bank', value: 'Fidelity Bank', icon: 'business-outline' },
    { label: 'Union Bank', value: 'Union Bank', icon: 'business-outline' },
    { label: 'Stanbic IBTC', value: 'Stanbic IBTC', icon: 'business-outline' },
    { label: 'FCMB', value: 'FCMB', icon: 'business-outline' },
    { label: 'Ecobank', value: 'Ecobank', icon: 'business-outline' },
    { label: 'Polaris Bank', value: 'Polaris Bank', icon: 'business-outline' },
    { label: 'Wema Bank', value: 'Wema Bank', icon: 'business-outline' },
    { label: 'Kuda Bank', value: 'Kuda Bank', icon: 'phone-portrait-outline' },
    { label: 'Opay', value: 'Opay', icon: 'phone-portrait-outline' },
    { label: 'Palmpay', value: 'Palmpay', icon: 'phone-portrait-outline' },
    { label: 'Moniepoint', value: 'Moniepoint', icon: 'phone-portrait-outline' },
    { label: 'Other', value: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export const EMPLOYER_HIDDEN_STATUSES = ['Student', 'Unemployed', 'Retired'];
