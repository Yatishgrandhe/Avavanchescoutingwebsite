import { useState, useEffect } from 'react';
import { useSupabase } from '@/pages/_app';

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

  return {
    isAdmin,
    user: userData,
    loading,
    isAuthenticated: !!user
  };
}
