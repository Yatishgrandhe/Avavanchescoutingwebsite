import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useSupabase } from '@/pages/_app';
import { useAdmin } from '@/hooks/use-admin';
import { motion } from 'framer-motion';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  Lock,
  Unlock,
  Loader2,
  Check,
  X,
  AlertCircle,
  ChevronRight,
  MoreVertical,
  Mail,
  MoreHorizontal
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface UserRoleData {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'superadmin';
  can_edit_forms: boolean;
  can_view_pick_list: boolean;
  can_view_stats: boolean;
}

export default function RoleManagementPage() {
  const { user: currentUser, supabase } = useSupabase();
  const { isAdmin, isSuperAdmin, loading: adminLoading } = useAdmin();
  const [users, setUsers] = useState<UserRoleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch('/api/admin/role-management', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
      toast.error('Network error while fetching users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && !adminLoading) {
      fetchUsers();
    }
  }, [isAdmin, adminLoading]);

  const updateUser = async (id: string, updates: Partial<UserRoleData>) => {
    setUpdatingId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch('/api/admin/role-management', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id, ...updates })
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUsers(users.map(u => u.id === id ? updatedUser : u));
        toast.success('User updated successfully');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update user');
      }
    } catch (err) {
      toast.error('Failed to update user');
    } finally {
      setUpdatingId(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30">Superadmin</Badge>;
      case 'admin':
        return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30">Admin</Badge>;
      default:
        return <Badge variant="secondary" className="opacity-70">User</Badge>;
    }
  };

  const isEditable = (user: UserRoleData) => {
    // If you are superadmin, you can edit anyone
    if (isSuperAdmin) return true;
    // If you are admin, you can edit anyone except superadmins
    if (isAdmin && user.role !== 'superadmin') return true;
    return false;
  };

  if (adminLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!isAdmin) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-[60vh] px-4 text-center">
            <Card className="max-w-md w-full border-destructive/30 shadow-xl">
              <CardContent className="pt-10 pb-10">
                <ShieldAlert className="w-14 h-14 text-destructive mx-auto mb-6" />
                <h2 className="text-2xl font-bold mb-3">Access Denied</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Only organization admins and superadmins can access role management.
                </p>
                <Button variant="outline" className="mt-8" asChild>
                  <a href="/admin/team-management">Go Back</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <Head>
          <title>Role Management | Avalanche Scouting</title>
        </Head>

        <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div>
              <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-3">
                <Shield className="w-8 h-8 text-primary" />
                Role & Permissions
              </h1>
              <p className="text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                Manage organization user access and unlock specific pages for scouts.
              </p>
            </div>
          </motion.div>

          {loading ? (
             <div className="flex justify-center py-12">
               <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
             </div>
          ) : (
            <Card className="border-border/60 shadow-lg overflow-hidden bg-background/50 backdrop-blur-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[280px]">User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-center">Edit Forms</TableHead>
                      <TableHead className="text-center">Pick Lists</TableHead>
                      <TableHead className="text-center">Analytics</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                              {user.name?.[0]?.toUpperCase() || <User className="w-5 h-5" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{user.name || 'Anonymous User'}</p>
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getRoleBadge(user.role)}
                        </TableCell>
                        <TableCell className="text-center">
                          <PermissionToggle 
                            enabled={user.can_edit_forms} 
                            loading={updatingId === user.id} 
                            onToggle={(val) => updateUser(user.id, { can_edit_forms: val })}
                            disabled={!isEditable(user)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <PermissionToggle 
                            enabled={user.can_view_pick_list} 
                            loading={updatingId === user.id} 
                            onToggle={(val) => updateUser(user.id, { can_view_pick_list: val })}
                            disabled={!isEditable(user)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <PermissionToggle 
                            enabled={user.can_view_stats} 
                            loading={updatingId === user.id} 
                            onToggle={(val) => updateUser(user.id, { can_view_stats: val })}
                            disabled={!isEditable(user)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditable(user) ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Modify Role</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => updateUser(user.id, { role: 'user' })}>
                                  <User className="w-4 h-4 mr-2 opacity-70" /> User
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateUser(user.id, { role: 'admin' })}>
                                  <ShieldCheck className="w-4 h-4 mr-2 text-blue-400" /> Admin
                                </DropdownMenuItem>
                                {isSuperAdmin && (
                                  <DropdownMenuItem onClick={() => updateUser(user.id, { role: 'superadmin' })}>
                                    <ShieldAlert className="w-4 h-4 mr-2 text-purple-400" /> Superadmin
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <div className="h-8 w-8 flex items-center justify-center">
                              <Lock className="w-3 h-3 text-muted-foreground p-0.5 opacity-50" />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border/40 bg-muted/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Role Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-muted-foreground leading-relaxed">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">Superadmin:</p>
                  <p>Full control over the organization. Can manage event keys, sync data, and change any user&apos;s role (including making others superadmins).</p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">Admin:</p>
                  <p>Can manage competition settings and standard users. Cannot modify superadmins or promote anyone to superadmin.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-muted/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Unlock className="w-4 h-4 text-emerald-400" /> Page Unlocks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-muted-foreground leading-relaxed">
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-foreground">Unlock permissions override default role behavior:</p>
                  <p>Granting &quot;Stats&quot; access lets a regular scout view the analytics dashboard. &quot;Pick Lists&quot; access lets them see the current event strategy lists.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

function PermissionToggle({ 
  enabled, 
  onToggle, 
  loading,
  disabled 
}: { 
  enabled: boolean, 
  onToggle: (val: boolean) => void,
  loading: boolean,
  disabled?: boolean
}) {
  return (
    <Switch
      checked={enabled}
      loading={loading}
      disabled={disabled}
      onClick={() => onToggle(!enabled)}
    />
  );
}
