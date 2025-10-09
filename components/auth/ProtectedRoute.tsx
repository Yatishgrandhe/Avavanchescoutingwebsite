import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSupabase } from '@/pages/_app';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback = (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </motion.div>
    </div>
  )
}) => {
  const { user, loading } = useSupabase();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return <>{fallback}</>;
  }

  if (!user) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
