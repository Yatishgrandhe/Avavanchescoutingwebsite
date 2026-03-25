import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useSupabase } from '@/pages/_app';
import { useAdmin } from '@/hooks/use-admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Label } from '@/components/ui';
import { Loader2, Calendar } from 'lucide-react';
import { CURRENT_EVENT_KEY, CURRENT_EVENT_NAME } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

export default function CompetitionSettingsPage() {
  const { session } = useSupabase();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventKey, setEventKey] = useState('');
  const [eventName, setEventName] = useState('');

  useEffect(() => {
    if (!session?.access_token || !isAdmin) return;
    (async () => {
      try {
        const res = await fetch('/api/admin/competition-settings', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setEventKey(data.current_event_key || CURRENT_EVENT_KEY);
          setEventName(data.current_event_name || CURRENT_EVENT_NAME);
        } else {
          setEventKey(CURRENT_EVENT_KEY);
          setEventName(CURRENT_EVENT_NAME);
        }
      } catch {
        setEventKey(CURRENT_EVENT_KEY);
        setEventName(CURRENT_EVENT_NAME);
      } finally {
        setLoading(false);
      }
    })();
  }, [session?.access_token, isAdmin]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/competition-settings', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_event_key: eventKey.trim(),
          current_event_name: eventName.trim(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      toast({ title: 'Saved', description: 'Competition labels stored in app config.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (adminLoading || loading) {
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
          <p className="p-8 text-center text-muted-foreground">Admins only.</p>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <Head>
          <title>Competition settings | Avalanche Scouting</title>
        </Head>
        <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Competition settings
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Stored in <code className="text-xs">app_config</code> for labels and integrations. The app still uses{' '}
              <code className="text-xs">lib/constants.ts</code> for the active event key unless you wire reads to this config everywhere.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current event</CardTitle>
              <CardDescription>Event key (e.g. TBA key) and display name.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={save} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ek">Event key</Label>
                  <Input
                    id="ek"
                    value={eventKey}
                    onChange={(e) => setEventKey(e.target.value)}
                    placeholder="2026xyz"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="en">Event name</Label>
                  <Input
                    id="en"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Regional name"
                    required
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
