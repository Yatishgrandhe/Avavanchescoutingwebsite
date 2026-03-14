import React, { useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/layout/Layout';
import { Button, Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui';
import { CheckCircle2, XCircle, Upload, Loader2 } from 'lucide-react';
import { CURRENT_EVENT_KEY } from '@/lib/constants';

const MATCHES_JSON_URL = '/data/matches-2026ncash.json';

export default function ImportMatchesPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; data?: { matchesCount: number; teamsCount: number } } | null>(null);

  const handleImport = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(MATCHES_JSON_URL);
      if (!res.ok) throw new Error(`Failed to fetch ${MATCHES_JSON_URL}: ${res.status}`);
      const matches = await res.json();
      const postRes = await fetch('/api/load-match-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventKey: CURRENT_EVENT_KEY, matches }),
      });
      const data = await postRes.json();
      if (!postRes.ok) {
        setResult({ success: false, message: data.error || data.details || postRes.statusText });
        return;
      }
      setResult({
        success: true,
        message: data.message || 'Matches imported.',
        data: data.data,
      });
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Import failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Import matches – Admin</title>
      </Head>
      <Layout>
        <main className="max-w-2xl mx-auto p-6">
          <Card className="border border-white/10 bg-card/50">
            <CardHeader>
              <CardTitle className="text-white">Import match schedule</CardTitle>
              <CardDescription>
                Load 2026ncash qual matches and teams from <code className="text-muted-foreground bg-white/5 px-1 rounded">{MATCHES_JSON_URL}</code> into the database.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleImport}
                disabled={loading}
                className="gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {loading ? 'Importing…' : 'Import 2026ncash matches'}
              </Button>
              {result && (
                <div
                  className={result.success ? 'text-green-400 flex items-center gap-2' : 'text-red-400 flex items-center gap-2'}
                >
                  {result.success ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  <span>{result.message}</span>
                  {result.data && (
                    <span className="text-muted-foreground text-sm">
                      ({result.data.matchesCount} matches, {result.data.teamsCount} teams)
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </Layout>
    </>
  );
}
