import { useState, useEffect } from 'react';
import { useSupabase } from '@/pages/_app';
import { PICKLIST_BLOCKED_ADMIN_USER_IDS } from '@/lib/constants';

export function useAdmin() {
  const { user, session, supabase } = useSupabase();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    async function checkAdminStatus() {
      if (!session || !user) {
        setIsAdmin(false);
        setUserData(null);
        setLoading(false);
        return;
      }

      try {
        // Check if user has admin role in their metadata
        const adminRole = user.user_metadata?.role === 'admin';
        setIsAdmin(adminRole);
        setUserData(user);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    }

    checkAdminStatus();
  }, [session, user]);

  const isBlockedFromPickList = !!user?.id && PICKLIST_BLOCKED_ADMIN_USER_IDS.includes(user.id);
  const canAccessPickList = isAdmin && !isBlockedFromPickList;

  return {
    isAdmin,
    canAccessPickList,
    user: userData,
    loading,
    isAuthenticated: !!user
  };
}
