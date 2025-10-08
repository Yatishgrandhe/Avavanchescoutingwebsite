import { useState, useEffect } from 'react';
import { useSupabase } from '@/pages/_app';
import { db } from '../lib/supabase';

export function useAdmin() {
  const { user, session } = useSupabase();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    async function checkAdminStatus() {
      if (!session) {
        setIsAdmin(false);
        setUserData(null);
        setLoading(false);
        return;
      }

      try {
        const currentUser = await db.getCurrentUser();
        setUserData(currentUser);
        setIsAdmin(currentUser?.role === 'admin');
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    }

    checkAdminStatus();
  }, [session]);

  return {
    isAdmin,
    user: userData,
    loading,
    isAuthenticated: !!user
  };
}
