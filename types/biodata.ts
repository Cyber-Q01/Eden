// Shared form type used across all biodata step components
export type BiodataForm = {
    first_name?: string;
    last_name?: string;
    phone_number: string;
    dob: string;
    gender: string;
    profile_photo: string;
    id_type: string;
    id_number: string;
    id_front_image: string;
    id_back_image: string;
    is_nin_verified?: boolean;
    employment_status: string;
    employer_name: string;
    monthly_income_range: string;
    business_name: string;
    cac_number: string;
    next_of_kin_name: string;
    next_of_kin_phone: string;
    next_of_kin_relationship: string;
    bank_name: string;
    account_number: string;
    account_name: string;
    bank_code?: string;
};

export type ModalKeys = 'gender' | 'idType' | 'employment' | 'income' | 'relationship' | 'bank';
