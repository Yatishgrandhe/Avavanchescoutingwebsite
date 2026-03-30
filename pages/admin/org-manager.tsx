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
  Users, 
  Settings,
  Shield,
  Trash2,
  ExternalLink,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle
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
        supabase.from('organization_invites').select('*').order('created_at', { ascending: false }).limit(25)
      ]);

      if (orgsRes.error) throw orgsRes.error;
      if (invitesRes.error) throw invitesRes.error;

      setOrgs(orgsRes.data || []);
      setInvites(invitesRes.data || []);
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
      
      const { data, error } = await supabase
        .from('organization_invites')
        .insert({ 
          token,
          invite_type: 'new_org',
          created_by: user?.id,
          expires_at: expiryIsoFromDays(newOrgInviteExpiryDays),
          max_redemptions: 1,
          redemption_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setInvites([data, ...invites]);
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
                  <CardDescription>New organization setup link (single use, then expires)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    One team lead uses the link to create their org and bypass the Discord guild check. The link stops working after that setup or when the expiry date passes—whichever comes first.
                  </p>
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
              {/* Recent Invites */}
              <Card className="glass border-white/5 bg-white/[0.02]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg">Recent Invite Links</CardTitle>
                    <CardDescription>Expiry, uses, and status for each link</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={loadData} className="h-8">
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {invites.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No active invites found.
                      </div>
                    ) : (
                      invites.map((invite) => {
                        const expired =
                          invite.status === 'pending' && isInvitePastExpiry(invite.expires_at);
                        const canCopy = invite.status === 'pending' && !expired;
                        return (
                        <div 
                          key={invite.id} 
                          className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.03] group hover:bg-white/[0.05] transition-colors"
                        >
                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                {invite.token.substring(0, 8)}...
                              </code>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-[10px] uppercase h-4 px-1.5",
                                  expired ? "text-red-400 border-red-500/20" :
                                  invite.status === 'pending' ? "text-yellow-400 border-yellow-500/20" : 
                                  invite.status === 'used' ? "text-green-400 border-green-500/20" : 
                                  "text-red-400 border-red-500/20"
                                )}
                              >
                                {expired ? 'expired' : invite.status}
                              </Badge>
                              {invite.invite_type && (
                                <Badge variant="secondary" className="text-[9px] h-4 px-1">
                                  {invite.invite_type === 'join_org' ? 'join' : 'new org'}
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Created {new Date(invite.created_at).toLocaleDateString()}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Expires {formatInviteExpiryLabel(invite.expires_at)}
                              {invite.status === 'pending' && isInvitePastExpiry(invite.expires_at) ? (
                                <span className="text-red-400 ml-1">(past date—deactivate or create a new link)</span>
                              ) : null}
                            </span>
                            <span className="text-[10px] text-amber-200/80">
                              {formatRedemptionSummary(
                                invite.redemption_count,
                                invite.max_redemptions,
                                invite.invite_type
                              )}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
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
                            {invite.status === 'used' && (
                              <div className="text-[10px] text-muted-foreground text-right italic mr-2">
                                Used on {new Date(invite.used_at!).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* All Organizations */}
              <Card className="glass border-white/5 bg-white/[0.02]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Registered Organizations</CardTitle>
                  <CardDescription>Teams currently using the platform</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    {orgs.map((org) => (
                      <div 
                        key={org.id} 
                        className="p-4 rounded-xl border border-white/5 bg-white/[0.03] flex items-center justify-between group hover:border-primary/20 transition-all"
                      >
                        <div className="min-w-0">
                          <h4 className="font-bold text-foreground truncate">{org.name}</h4>
                          <span className="text-[10px] text-muted-foreground font-mono opacity-50 uppercase tracking-tighter">ID: {org.id.substring(0, 8)}</span>
                        </div>
                        <Building2 className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors opacity-20" />
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
      </Layout>
    </ProtectedRoute>
  );
}
