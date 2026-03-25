import React, { useState, useEffect } from 'react';
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

export default function SetupOrg() {
  const { user, supabase } = useSupabase();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [teamNumber, setTeamNumber] = useState('');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('org_invite_token');
    if (!token) {
      setError("No active invite token found. Please use the link provided by a superadmin.");
      setLoading(false);
      return;
    }
    setInviteToken(token);
    checkToken(token);
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
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !teamNumber.trim() || !inviteToken) return;

    setIsSubmitting(true);
    try {
      // 1. Create the organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: orgName.trim() })
        .select()
        .single();

      if (orgError) throw orgError;

      // 2. Update the user's organization_id and role
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ 
          organization_id: org.id,
          role: 'admin',
          team_number: parseInt(teamNumber),
          can_edit_forms: true,
          can_view_pick_list: true,
          can_view_stats: true
        })
        .eq('id', user?.id);

      if (userUpdateError) throw userUpdateError;

      // 3. Mark the invite as used
      await supabase
        .from('organization_invites')
        .update({ 
          status: 'used',
          used_at: new Date().toISOString(),
          used_by: user?.id
        })
        .eq('token', inviteToken);

      // 4. Clear the token from localStorage
      localStorage.removeItem('org_invite_token');

      toast({
        title: "Organization setup complete!",
        description: `Welcome to Avalanche Scouting, ${orgName}!`,
      });

      // Redirect to home - profile changes should sync via trigger
      router.push('/');
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
