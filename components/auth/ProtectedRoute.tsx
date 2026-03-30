import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSupabase } from '@/pages/_app';
import { storeAuthReturnPath } from '@/lib/auth-return';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const defaultFallback = (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
      <p className="text-muted-foreground text-sm">Loading session…</p>
    </motion.div>
  </div>
);

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback = defaultFallback,
}) => {
  const { session, loading } = useSupabase();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (session) return;

    const nextPath = router.asPath || '/';
    storeAuthReturnPath(nextPath);
    router.replace(`/auth/signin?next=${encodeURIComponent(nextPath)}`);
  }, [session, loading, router, router.asPath]);

  if (loading) {
    return <>{fallback}</>;
  }

  if (!session) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
