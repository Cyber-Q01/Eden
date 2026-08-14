import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';

export type InspectionBooking = {
    id: string;
    property_id: string;
    renter_id: string;
    amount: number;
    preferred_date: string;
    preferred_time: string;
    status: 'pending' | 'confirmed' | 'cancelled';
    notes: string;
    created_at: string;
    property?: {
        id: string;
        title: string;
        images: string[];
        location: string;
        price: number;
    };
    renter?: {
        first_name: string;
        last_name: string;
        profile_photo: string | null;
    };
};

export const useInspections = () => {
    const { user, role } = useAuth();

    const { data: inspections, isLoading: loading, refetch } = useQuery({
        queryKey: ['inspections', user?.id, role],
        queryFn: async () => {
            if (!user) return [];
            try {
                let query = supabase
                    .from('inspection_bookings')
                    .select(`
                        *,
                        property:properties(
                            id, 
                            title, 
                            images, 
                            location, 
                            price,
                            landlord:users!landlord_id(first_name, last_name)
                        ),
                        renter:users!renter_id(
                            first_name, 
                            last_name, 
                            user_biodata(profile_photo)
                        )
                    `)
                    .order('created_at', { ascending: false });

                if (role === 'TENANT') {
                    query = query.eq('renter_id', user.id);
                } else {
                    const { data: landlordProperties } = await supabase
                        .from('properties')
                        .select('id')
                        .eq('landlord_id', user.id);
                    
                    const propertyIds = landlordProperties?.map(p => p.id) || [];
                    query = query.in('property_id', propertyIds);
                }

                const { data, error } = await query;
                if (error) throw error;

                const formattedData = (data || []).map((inspection: any) => {
                    const profilePhoto = inspection.renter?.user_biodata?.[0]?.profile_photo || null;
                    return {
                        ...inspection,
                        renter: inspection.renter ? {
                            first_name: inspection.renter.first_name,
                            last_name: inspection.renter.last_name,
                            profile_photo: profilePhoto
                        } : null
                    };
                });

                return formattedData;
            } catch (error) {
                console.error('Error fetching inspections:', error);
                throw error;
            }
        },
        enabled: !!user
    });

    const fetchInspections = async () => {
        const res = await refetch();
        return res.data ?? [];
    };

    const checkBookingStatus = async (propertyId: string): Promise<boolean> => {
        if (!user) return false;
        try {
            const { data, error } = await supabase
                .from('inspection_bookings')
                .select('status')
                .eq('renter_id', user.id)
                .eq('property_id', propertyId)
                .eq('status', 'confirmed')
                .limit(1);

            if (error) throw error;
            return data && data.length > 0;
        } catch (error) {
            console.error('Error checking booking status:', error);
            return false;
        }
    };

    return {
        loading,
        inspections: inspections ?? [],
        fetchInspections,
        checkBookingStatus,
    };
};
