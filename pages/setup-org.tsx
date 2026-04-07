import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSupabase } from '@/pages/_app';
import { motion } from 'framer-motion';
import { Building2, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  Button, 
  Input, 
  Label
} from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { formatInviteExpiryLabel } from '@/lib/invite-config';

export default function SetupOrg() {
  const { user, supabase } = useSupabase();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [teamNumber, setTeamNumber] = useState('');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteRow, setInviteRow] = useState<{ invite_type?: string; target_organization_id?: string | null } | null>(null);
  const [invitePreview, setInvitePreview] = useState<{
    valid?: boolean;
    reason?: string;
    invite_type?: string;
    expires_at?: string;
    organization_name?: string | null;
    unlimited_uses?: boolean;
    redemption_count?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const joinAttemptedRef = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem('org_invite_token');
    if (!token) {
      setError("No active invite token found. Please use the link provided by a superadmin.");
      setLoading(false);
      return;
    }
    setInviteToken(token);
    checkToken(token);
    void fetch(`/api/invite-preview?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((j) => setInvitePreview(j))
      .catch(() => setInvitePreview(null));
  }, []);

  const checkToken = async (token: string) => {
    try {
      const { data, error } = await supabase
        .from('organization_invites')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setError("This invite token is invalid or has already been used.");
      } else {
        setInviteRow(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const runJoinOrg = async () => {
      if (joinAttemptedRef.current || !user || !inviteToken || !inviteRow) return;

      // Guard: an established user must not be shown the new-org creation form.
      if (inviteRow.invite_type === 'new_org' && (user as any).organization_id) {
        setError("You already belong to an organization. This invite link is for creating a new organization.");
        return;
      }

      const isJoin = inviteRow.invite_type === 'join_org';
      if (!isJoin) return;

      joinAttemptedRef.current = true;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          joinAttemptedRef.current = false;
          return;
        }

        const res = await fetch('/api/organization/complete-join-invite', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: inviteToken }),
        });

        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || 'Failed to join organization');
        }

        localStorage.removeItem('org_invite_token');
        localStorage.removeItem('org_invite_type');
        localStorage.removeItem('org_invite_target_org');

        toast({
          title: 'Welcome!',
          description: 'You have been added to the organization.',
        });
        if (typeof window !== 'undefined') {
          window.location.assign('/');
        } else {
          router.replace('/');
        }
      } catch (e: any) {
        joinAttemptedRef.current = false;
        setError(e?.message || 'Could not complete join');
      }
    };

    void runJoinOrg();
  }, [user, inviteRow, inviteToken, router, supabase.auth, toast]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !teamNumber.trim() || !inviteToken) return;

    setIsSubmitting(true);
    try {
      const tn = parseInt(teamNumber, 10);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not signed in');
      }

      const completeRes = await fetch('/api/organization/complete-new-org-setup', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: inviteToken,
          orgName: orgName.trim(),
          teamNumber: Number.isFinite(tn) ? tn : null,
        }),
      });

      if (!completeRes.ok) {
        const j = await completeRes.json().catch(() => ({}));
        const detail = typeof j.details === 'string' ? ` ${j.details}` : '';
        throw new Error((j.error || 'Failed to assign you as organization admin') + detail);
      }

      // Clear the token from localStorage
      localStorage.removeItem('org_invite_token');

      toast({
        title: "Organization setup complete!",
        description: `Welcome to Avalanche Scouting, ${orgName}!`,
      });

      // Full navigation reload so _app refetches public.users with the new organization_id
      // (avoids ensure-profile / stale client state showing no org).
      if (typeof window !== 'undefined') {
        window.location.assign('/');
      } else {
        router.replace('/');
      }
    } catch (err: any) {
      toast({
        title: "Setup failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (inviteRow?.invite_type === 'join_org' && user && !error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3 p-6">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground text-center">
          Adding you
          {invitePreview?.organization_name ? ` to ${invitePreview.organization_name}` : ' to the organization'}
          …
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full glass border-red-500/20">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full" variant="outline">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl opacity-50" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="text-center mb-8">
            <Building2 className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-heading font-bold">Setup Your Organization</h1>
            <p className="text-muted-foreground mt-2">Create a workspace for your team to start scouting.</p>
          </div>

          {invitePreview?.valid && invitePreview.invite_type === 'new_org' && (
            <div className="mb-4 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-left text-sm">
              <p className="font-medium text-foreground">New organization invite</p>
              <ul className="mt-2 list-disc list-inside text-xs text-muted-foreground space-y-1">
                <li>Single use: one team completes setup with this link.</li>
                <li>
                  Active until {formatInviteExpiryLabel(invitePreview.expires_at)} (local time).
                </li>
              </ul>
            </div>
          )}

          <Card className="glass border-white/10 shadow-2xl">
            <CardContent className="pt-6">
              <form onSubmit={handleSetup} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input 
                    id="orgName"
                    placeholder="e.g. Iron Giants"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="glass-input"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground">This is your team's display name on the platform.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teamNumber">Team Number</Label>
                  <Input 
                    id="teamNumber"
                    type="number"
                    placeholder="e.g. 1234"
                    value={teamNumber}
                    onChange={(e) => setTeamNumber(e.target.value)}
                    className="glass-input"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-semibold transition-all hover:scale-[1.02]" 
                  disabled={isSubmitting || !orgName.trim() || !teamNumber.trim()}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                  )}
                  Complete Setup
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-8">
            By setting up, you become the administrator for your team's data.
          </p>
        </motion.div>
      </div>
    </ProtectedRoute>
  );
}
