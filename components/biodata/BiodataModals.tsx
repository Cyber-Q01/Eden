import React from 'react';
import BottomSheetPicker from '../BottomSheetPicker';
import {
    BANK_OPTIONS,
    EMPLOYMENT_OPTIONS,
    GENDER_OPTIONS,
    ID_TYPE_OPTIONS,
    INCOME_OPTIONS,
    RELATIONSHIP_OPTIONS,
} from '../../constants/biodataOptions';
import { BiodataForm, ModalKeys } from '../../types/biodata';

type Props = {
    modals: Record<ModalKeys, boolean>;
    form: BiodataForm;
    updateForm: (key: keyof BiodataForm, value: string) => void;
    closeModal: (key: ModalKeys) => void;
};

const BiodataModals = ({ modals, form, updateForm, closeModal }: Props) => (
    <>
        <BottomSheetPicker
            visible={modals.gender}
            title="Select Gender"
            options={GENDER_OPTIONS}
            selectedValue={form.gender}
            onSelect={v => updateForm('gender', v)}
            onClose={() => closeModal('gender')}
        />
        <BottomSheetPicker
            visible={modals.idType}
            title="ID Type"
            options={ID_TYPE_OPTIONS}
            selectedValue={form.id_type}
            onSelect={v => updateForm('id_type', v)}
            onClose={() => closeModal('idType')}
        />
        <BottomSheetPicker
            visible={modals.employment}
            title="Employment Status"
            options={EMPLOYMENT_OPTIONS}
            selectedValue={form.employment_status}
            onSelect={v => updateForm('employment_status', v)}
            onClose={() => closeModal('employment')}
        />
        <BottomSheetPicker
            visible={modals.income}
            title="Monthly Income Range"
            options={INCOME_OPTIONS}
            selectedValue={form.monthly_income_range}
            onSelect={v => updateForm('monthly_income_range', v)}
            onClose={() => closeModal('income')}
        />
        <BottomSheetPicker
            visible={modals.relationship}
            title="Relationship"
            options={RELATIONSHIP_OPTIONS}
            selectedValue={form.next_of_kin_relationship}
            onSelect={v => updateForm('next_of_kin_relationship', v)}
            onClose={() => closeModal('relationship')}
        />
        <BottomSheetPicker
            visible={modals.bank}
            title="Select Bank"
            options={BANK_OPTIONS}
            selectedValue={form.bank_name}
            onSelect={v => updateForm('bank_name', v)}
            onClose={() => closeModal('bank')}
        />
    </>
);

export default BiodataModals;
