// hooks/useAgreementStatuses.ts

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Application } from './useApplications';

export interface AgreementStatusInfo {
  status: string;
  rental_id: string;
  owner_signed: boolean;
  renter_signed: boolean;
  fully_signed: boolean;
}

export const useAgreementStatuses = (applications: Application[]) => {
  const [agreementStatuses, setAgreementStatuses] = useState<{ [key: string]: AgreementStatusInfo }>({});
  const [loading, setLoading] = useState(false);

  const fetchStatuses = async () => {
    if (!applications.length) {
      setAgreementStatuses(prev => Object.keys(prev).length === 0 ? prev : {});
      return;
    }

    const acceptedIds = applications.filter(a => a.status === 'accepted').map(a => a.id);
    if (!acceptedIds.length) {
      setAgreementStatuses(prev => Object.keys(prev).length === 0 ? prev : {});
      return;
    }

    console.log('Fetching agreement statuses for application IDs:', acceptedIds);
    setLoading(true);

    try {
      // ✅ First, get rental IDs for the accepted applications
      const { data: rentals, error: rentalsError } = await supabase
        .from('rentals')
        .select('id, application_id')
        .in('application_id', acceptedIds);

      console.log('Rentals found:', rentals);

      if (rentalsError) {
        console.error('Error fetching rentals:', rentalsError);
        return;
      }

      if (!rentals?.length) {
        console.log('No rentals found for accepted applications');
        setAgreementStatuses(prev => Object.keys(prev).length === 0 ? prev : {});
        return;
      }

      // ✅ Get rental IDs to query agreements
      const rentalIds = rentals.map(r => r.id);

      // ✅ Now fetch tenancy agreements for these rentals
      const { data: agreements, error: agreementsError } = await supabase
        .from('tenancy_agreements')
        .select(`
          status,
          owner_signed_at,
          renter_signed_at,
          rental_id
        `)
        .in('rental_id', rentalIds);

      console.log('Agreements found:', agreements);

      if (agreementsError) {
        console.error('Error fetching agreements:', agreementsError);
        return;
      }

      if (!agreements?.length) {
        console.log('No agreements found for rentals');
        setAgreementStatuses(prev => Object.keys(prev).length === 0 ? prev : {});
        return;
      }

      // ✅ Create a map from rental_id to agreement info
      const rentalToAgreement = agreements.reduce((acc, agreement) => ({
        ...acc,
        [agreement.rental_id]: agreement
      }), {} as any);

      // ✅ Map back to application_id
      const statusMap = rentals.reduce((acc, rental) => {
        const agreement = rentalToAgreement[rental.id];

        if (agreement) {
          acc[rental.application_id] = {
            status: agreement.status,
            rental_id: agreement.rental_id,
            owner_signed: !!agreement.owner_signed_at,
            renter_signed: !!agreement.renter_signed_at,
            fully_signed: agreement.status === 'fully_signed' || (!!agreement.owner_signed_at && !!agreement.renter_signed_at)
          };
        }

        return acc;
      }, {} as { [key: string]: AgreementStatusInfo });

      console.log('Final status map:', statusMap);
      
      // ✅ Only update if the content has actually changed to prevent infinite re-render loops
      setAgreementStatuses(prev => {
        if (JSON.stringify(prev) === JSON.stringify(statusMap)) {
          return prev;
        }
        return statusMap;
      });

    } catch (e) {
      console.error('Error fetching agreement statuses:', e);
      setAgreementStatuses({});
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchStatuses();
  }, [applications]);

  return { agreementStatuses, loading, refetch: fetchStatuses };
};