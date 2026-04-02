import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useSupabase } from '@/pages/_app';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Plus, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  Shield,
  Trash2,
  PlusCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  Button, 
  Input, 
  Badge,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DEFAULT_NEW_ORG_INVITE_EXPIRY_DAYS,
  INVITE_EXPIRY_DAY_OPTIONS,
  expiryIsoFromDays,
  formatInviteExpiryLabel,
  formatRedemptionSummary,
  isInvitePastExpiry,
} from '@/lib/invite-config';

function filterActiveNewOrgInvites<T extends Invite>(rows: T[]): T[] {
  return rows.filter((inv) => {
    if (inv.invite_type !== 'new_org') return false;
    if (inv.status !== 'pending') return false;
    if (isInvitePastExpiry(inv.expires_at)) return false;
    const max = inv.max_redemptions;
    const c = inv.redemption_count ?? 0;
    if (max != null && c >= max) return false;
    return true;
  });
}
import { useToast } from '@/hooks/use-toast';
import Head from 'next/head';

interface Organization {
  id: string;
  name: string;
  created_at: string;
}

interface Invite {
  id: string;
  token: string;
  status: 'pending' | 'used' | 'expired';
  created_at: string;
  used_at?: string;
  expires_at?: string | null;
  invite_type?: string;
  target_organization_id?: string | null;
  redemption_count?: number | null;
  max_redemptions?: number | null;
}

export default function OrgManager() {
  const { user, supabase } = useSupabase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [newOrgName, setNewOrgName] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [newOrgInviteExpiryDays, setNewOrgInviteExpiryDays] = useState<number>(DEFAULT_NEW_ORG_INVITE_EXPIRY_DAYS);
  /** single = one new org then link stops; unlimited = many orgs until expiry */
  const [newOrgInviteScope, setNewOrgInviteScope] = useState<'single' | 'unlimited'>('single');
  const [purgeTarget, setPurgeTarget] = useState<Organization | null>(null);
  const [purgeConfirmName, setPurgeConfirmName] = useState('');
  const [isPurging, setIsPurging] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [orgsRes, invitesRes] = await Promise.all([
        supabase.from('organizations').select('*').order('created_at', { ascending: false }),
        supabase
          .from('organization_invites')
          .select('*')
          .eq('invite_type', 'new_org')
          .order('created_at', { ascending: false }),
      ]);

      if (orgsRes.error) throw orgsRes.error;
      if (invitesRes.error) throw invitesRes.error;

      setOrgs(orgsRes.data || []);
      setInvites(filterActiveNewOrgInvites(invitesRes.data || []));
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setIsCreatingOrg(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert({ name: newOrgName.trim() })
        .select()
        .single();

      if (error) throw error;

      setOrgs([data, ...orgs]);
      setNewOrgName('');
      toast({
        title: "Organization created",
        description: `Successfully created ${data.name}`,
      });
    } catch (error: any) {
      toast({
        title: "Error creating organization",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const generateInvite = async () => {
    setIsGeneratingInvite(true);
    try {
      const token = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      
      const maxRedemptions = newOrgInviteScope === 'single' ? 1 : null;

      const { data, error } = await supabase
        .from('organization_invites')
        .insert({ 
          token,
          invite_type: 'new_org',
          created_by: user?.id,
          expires_at: expiryIsoFromDays(newOrgInviteExpiryDays),
          max_redemptions: maxRedemptions,
          redemption_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setInvites(filterActiveNewOrgInvites([data, ...invites]));
      toast({
        title: "Invite token generated",
        description: "You can now share this token with a team lead.",
      });
    } catch (error: any) {
      toast({
        title: "Error generating invite",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handlePurgeOrganization = async () => {
    if (!purgeTarget || !purgeConfirmName.trim()) return;
    setIsPurging(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not signed in');
      }
      const res = await fetch('/api/admin/purge-organization', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId: purgeTarget.id,
          confirmationName: purgeConfirmName.trim(),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail =
          Array.isArray(j.details) ? j.details.join('; ') : typeof j.details === 'string' ? j.details : '';
        throw new Error(detail || j.error || 'Purge failed');
      }
      toast({
        title: 'Organization deleted',
        description: `${purgeTarget.name} and its data were removed.`,
      });
      setPurgeTarget(null);
      setPurgeConfirmName('');
      await loadData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Purge failed';
      toast({ title: 'Purge failed', description: msg, variant: 'destructive' });
    } finally {
      setIsPurging(false);
    }
  };

  const copyInviteLink = (token: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://avalanchescouting.vercel.app';
    const link = `${origin}/auth/signin?token=${encodeURIComponent(token)}&invite_type=new_org`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    toast({
      title: "Link copied",
      description: "Invite link copied to clipboard",
    });
  };

  if (user?.role !== 'superadmin') {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-md w-full text-center p-8 glass border-red-500/20">
              <Shield className="w-16 h-16 text-red-500 mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">Only superadmins can access this page.</p>
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
          <title>Org Manager | Avalanche</title>
        </Head>

        <div className="max-w-6xl mx-auto space-y-8 pb-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
                Organization Manager
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Manage multi-tenant organizations and invite links
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1.5 px-3 py-1">
                <Shield className="w-3.5 h-3.5" />
                Superadmin Access
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Create Org & Invites */}
            <div className="lg:col-span-1 space-y-6">
              {/* Create Org Card */}
              <Card className="glass border-white/5 bg-white/[0.02]">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    New Organization
                  </CardTitle>
                  <CardDescription>Manually add an organization</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateOrg} className="space-y-4">
                    <Input
                      placeholder="Org Name (e.g. Iron Giants)"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      className="glass-input border-white/10"
                    />
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 brightness-110 active:scale-95 transition-all" 
                      disabled={isCreatingOrg || !newOrgName.trim()}
                    >
                      {isCreatingOrg ? (
                        <PlusCircle className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Create Organization
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Generate Invite Card */}
              <Card className="glass border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-primary" />
                    Invite Team
                  </CardTitle>
                  <CardDescription>New organization setup links (Discord bypass)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Team leads use the link to create an org and bypass the Discord guild check. Choose whether the link creates one organization only, or unlimited new organizations until the expiry date.
                  </p>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Organizations per link</Label>
                    <Select
                      value={newOrgInviteScope}
                      onValueChange={(v) => setNewOrgInviteScope(v as 'single' | 'unlimited')}
                    >
                      <SelectTrigger className="glass-input border-white/10 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">One organization (link stops after first setup)</SelectItem>
                        <SelectItem value="unlimited">Unlimited organizations (until expiry)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Link stays valid for</Label>
                    <Select
                      value={String(newOrgInviteExpiryDays)}
                      onValueChange={(v) => setNewOrgInviteExpiryDays(Number(v))}
                    >
                      <SelectTrigger className="glass-input border-white/10 w-full">
                        <SelectValue placeholder="Expiry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INVITE_EXPIRY_DAY_OPTIONS.map((d) => (
                          <SelectItem key={d} value={String(d)}>
                            {d} days
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                    <Button 
                      onClick={generateInvite} 
                      className="w-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 brightness-110 active:scale-95 transition-all" 
                      variant="default"
                      disabled={isGeneratingInvite}
                    >
                      {isGeneratingInvite ? (
                        <PlusCircle className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <LinkIcon className="w-4 h-4 mr-2" />
                      )}
                      New Org Setup Invite
                    </Button>
                  </CardContent>
                </Card>
            </div>

            {/* Right Column: List and Management */}
            <div className="lg:col-span-2 space-y-6">
              {/* Active new-org invites only (used / expired links are hidden) */}
              <Card className="glass border-white/5 bg-white/[0.02]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg">Active new-organization invites</CardTitle>
                    <CardDescription>
                      Only links that still accept signups. Single-use links disappear after use; multi-org links show how many orgs were created.
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={loadData} className="h-8">
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[22rem] overflow-y-auto pr-1 rounded-lg border border-white/5 bg-black/20">
                    <div className="space-y-3 p-2">
                    {invites.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No active invites. Create one on the left, or used/expired links are hidden automatically.
                      </div>
                    ) : (
                      invites.map((invite) => {
                        const canCopy = invite.status === 'pending' && !isInvitePastExpiry(invite.expires_at);
                        return (
                        <div 
                          key={invite.id} 
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.03] group hover:bg-white/[0.05] transition-colors"
                        >
                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                {invite.token.substring(0, 8)}...
                              </code>
                              <Badge 
                                variant="outline" 
                                className="text-[10px] uppercase h-4 px-1.5 text-yellow-400 border-yellow-500/20"
                              >
                                active
                              </Badge>
                              <Badge variant="secondary" className="text-[9px] h-4 px-1">
                                {invite.max_redemptions == null
                                  ? 'unlimited orgs'
                                  : invite.max_redemptions === 1
                                    ? 'one org only'
                                    : `up to ${invite.max_redemptions} orgs`}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Created {new Date(invite.created_at).toLocaleDateString()}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Expires {formatInviteExpiryLabel(invite.expires_at)}
                            </span>
                            <span className="text-[10px] text-amber-200/80">
                              {formatRedemptionSummary(
                                invite.redemption_count,
                                invite.max_redemptions,
                                invite.invite_type
                              )}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            {canCopy && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 gap-2 text-xs border-white/10"
                                onClick={() => copyInviteLink(invite.token)}
                              >
                                {copiedToken === invite.token ? (
                                  <Check className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                                Copy Link
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                      })
                    )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* All Organizations */}
              <Card className="glass border-white/5 bg-white/[0.02]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Registered Organizations</CardTitle>
                  <CardDescription>Teams on the platform. Deleting an org removes its data and deletes member accounts (except superadmins, who are unlinked).</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    {orgs.map((org) => (
                      <div 
                        key={org.id} 
                        className="p-4 rounded-xl border border-white/5 bg-white/[0.03] flex items-center justify-between gap-3 group hover:border-primary/20 transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-foreground truncate">{org.name}</h4>
                          <span className="text-[10px] text-muted-foreground font-mono opacity-50 uppercase tracking-tighter">ID: {org.id.substring(0, 8)}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => {
                              setPurgeTarget(org);
                              setPurgeConfirmName('');
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          <Building2 className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors opacity-20 hidden sm:block" />
                        </div>
                      </div>
                    ))}
                    {orgs.length === 0 && (
                      <div className="col-span-full py-12 text-center text-muted-foreground">
                        No organizations registered yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <Dialog open={!!purgeTarget} onOpenChange={(open) => !open && !isPurging && setPurgeTarget(null)}>
          <DialogContent className="glass border-white/10 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Delete organization permanently
              </DialogTitle>
              <DialogDescription className="text-left space-y-2 pt-2">
                <span className="block text-foreground/90">
                  This removes <strong>{purgeTarget?.name}</strong>, all of its scouting data, archives, and{' '}
                  <strong>non–superadmin member accounts</strong> (Auth + profiles). Superadmins in this org are only
                  unlinked. This cannot be undone.
                </span>
                <span className="block text-sm">Type the organization name exactly to confirm:</span>
              </DialogDescription>
            </DialogHeader>
            <Input
              value={purgeConfirmName}
              onChange={(e) => setPurgeConfirmName(e.target.value)}
              placeholder={purgeTarget?.name ?? 'Organization name'}
              className="glass-input border-white/10"
              disabled={isPurging}
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setPurgeTarget(null)} disabled={isPurging}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={isPurging || !purgeTarget || purgeConfirmName !== purgeTarget.name}
                onClick={() => void handlePurgeOrganization()}
              >
                {isPurging ? 'Deleting…' : 'Delete forever'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    </ProtectedRoute>
  );
}
