import React, { createContext, ReactNode, useContext, useState } from 'react';

type UserType = 'tenant' | 'landlord' | null;

interface UserContextType {
    userType: UserType;
    setUserType: (type: UserType) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [userType, setUserType] = useState<UserType>(null);

    return (
        <UserContext.Provider value={{ userType, setUserType }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
