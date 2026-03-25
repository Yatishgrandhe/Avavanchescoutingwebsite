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
  Badge 
} from '@/components/ui';
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
  invite_type?: string;
  target_organization_id?: string | null;
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
        supabase.from('organization_invites').select('*').order('created_at', { ascending: false }).limit(10)
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
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
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

  const generateJoinInvite = async () => {
    const target = orgs.find((o) => o.name.toLowerCase().includes('avalanche')) || orgs[0];
    if (!target) {
      toast({
        title: "No organization",
        description: "Create an organization first.",
        variant: "destructive",
      });
      return;
    }
    setIsGeneratingInvite(true);
    try {
      const token = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      const { data, error } = await supabase
        .from('organization_invites')
        .insert({
          token,
          invite_type: 'join_org',
          target_organization_id: target.id,
          created_by: user?.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      setInvites([data, ...invites]);
      toast({
        title: "Join invite created",
        description: `Students can sign in with Discord and join ${target.name}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error generating join invite",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const copyInviteLink = (token: string, kind: 'new_org' | 'join_org' = 'new_org') => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://avalanchescouting.vercel.app';
    const link =
      kind === 'join_org'
        ? `${origin}/auth/signin?token=${encodeURIComponent(token)}&invite_type=join_org`
        : `${origin}/auth/signin?token=${encodeURIComponent(token)}&invite_type=new_org`;
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
                      className="w-full" 
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
                  <CardDescription>Generate a login bypass link for other orgs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Generating a link allows a team lead to bypass the Avalanche Discord filter and set up their own organization.
                  </p>
                  <Button 
                    onClick={generateInvite} 
                    className="w-full hover:bg-primary/90" 
                    variant="default"
                    disabled={isGeneratingInvite}
                  >
                    {isGeneratingInvite ? (
                      <PlusCircle className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <LinkIcon className="w-4 h-4 mr-2" />
                    )}
                    New org setup invite
                  </Button>
                  <Button
                    onClick={generateJoinInvite}
                    className="w-full"
                    variant="secondary"
                    disabled={isGeneratingInvite || orgs.length === 0}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Student join invite (Avalanche)
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
                    <CardDescription>Bypass links generated in the last 7 days</CardDescription>
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
                      invites.map((invite) => (
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
                                  invite.status === 'pending' ? "text-yellow-400 border-yellow-500/20" : 
                                  invite.status === 'used' ? "text-green-400 border-green-500/20" : 
                                  "text-red-400 border-red-500/20"
                                )}
                              >
                                {invite.status}
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
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {invite.status === 'pending' && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 gap-2 text-xs border-white/10"
                                onClick={() =>
                                  copyInviteLink(
                                    invite.token,
                                    invite.invite_type === 'join_org' ? 'join_org' : 'new_org'
                                  )
                                }
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
                      ))
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
