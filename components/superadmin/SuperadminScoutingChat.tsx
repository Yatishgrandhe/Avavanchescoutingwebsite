import React, { useCallback, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { getLocalPendingMatchRows, getLocalPendingPitRows } from '@/lib/local-pending-data';

export type SuperadminChatCompetitionContext = {
  competitionName?: string;
  competitionKey?: string;
  year?: string;
  eventKey?: string;
  pastId?: string;
  seeAllOrgs: boolean;
  organizationId?: string | null;
};

type ScoutingRowLite = {
  team_number: number;
  final_score?: number | null;
  autonomous_points?: number | null;
  teleop_points?: number | null;
  comments?: string | null;
  match_id?: string | null;
};

type TeamLite = { team_number: number; team_name: string; starter_epa?: number };

function buildContextBlock(
  ctx: SuperadminChatCompetitionContext,
  teams: TeamLite[],
  scoutingRows: ScoutingRowLite[]
): string {
  const lines: string[] = [];
  lines.push(
    `EVENT: ${ctx.competitionName ?? 'unknown'} | key=${ctx.competitionKey ?? ctx.eventKey ?? 'n/a'} year=${ctx.year ?? 'n/a'}`
  );
  lines.push(
    `SCOPE: ${ctx.seeAllOrgs ? 'all_orgs' : 'org_scoped'} | past_id=${ctx.pastId ?? 'n/a'} | live_event_key=${ctx.eventKey ?? 'n/a'}`
  );
  lines.push(`TEAMS_LIST (${teams.length}): ${teams.map((t) => `${t.team_number}:${t.team_name}`).join('; ').slice(0, 4000)}`);

  const byTeam = new Map<number, ScoutingRowLite[]>();
  for (const r of scoutingRows) {
    if (!byTeam.has(r.team_number)) byTeam.set(r.team_number, []);
    byTeam.get(r.team_number)!.push(r);
  }
  const summaries: string[] = [];
  for (const [tn, rows] of Array.from(byTeam.entries())) {
    const scores = rows.map((x) => Number(x.final_score ?? 0)).filter((n) => !Number.isNaN(n));
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    summaries.push(`T${tn}:n=${rows.length} avg_score=${avg.toFixed(1)}`);
  }
  summaries.sort();
  lines.push(`TEAM_MATCH_SUMMARY: ${summaries.slice(0, 80).join(' | ')}`);

  const comments = scoutingRows
    .map((r) => (r.comments && String(r.comments).trim() ? String(r.comments).trim().slice(0, 200) : ''))
    .filter(Boolean)
    .slice(0, 25);
  lines.push(`SAMPLE_COMMENTS: ${comments.join(' || ')}`);

  return lines.join('\n').slice(0, 11_500);
}

async function buildLocalDigest(orgId?: string | null): Promise<string> {
  const [matchP, pitP] = await Promise.all([
    getLocalPendingMatchRows(orgId ?? undefined),
    getLocalPendingPitRows(orgId ?? undefined),
  ]);
  const m = matchP.slice(0, 40).map(
    (r) => `M team=${r.team_number} match=${r.match_id} score=${r.final_score} local=1`
  );
  const p = pitP.slice(0, 20).map((r) => `P team=${r.team_number} robot=${r.robot_name} local=1`);
  return [...m, ...p].join('\n').slice(0, 2500);
}

export function SuperadminScoutingChat(props: {
  session: Session | null;
  context: SuperadminChatCompetitionContext;
  teams: TeamLite[];
  scoutingRows: ScoutingRowLite[];
}) {
  const { session, context, teams, scoutingRows } = props;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);

  const contextBlock = useMemo(
    () => buildContextBlock(context, teams, scoutingRows),
    [context, teams, scoutingRows]
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !session?.access_token) return;
    setLoading(true);
    setError(null);
    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    try {
      const localPendingDigest = await buildLocalDigest(context.organizationId);
      const res = await fetch('/api/superadmin-scouting-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: text,
          contextBlock,
          localPendingDigest,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `Request failed (${res.status})`);
      }
      setMessages((m) => [...m, { role: 'assistant', text: data.reply || 'No reply.' }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Chat failed';
      setError(msg);
      setMessages((m) => [...m, { role: 'assistant', text: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, session?.access_token, contextBlock, context.organizationId]);

  if (!session?.access_token) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Open superadmin scouting assistant"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-4 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full shadow-lg',
          'bg-amber-600 text-white hover:bg-amber-500 md:bottom-6 md:right-6',
          'ring-2 ring-amber-400/40 focus:outline-none focus-visible:ring-4'
        )}
      >
        <MessageCircle className="h-7 w-7" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:justify-end sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="superadmin-chat-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50 sm:bg-black/40"
            aria-label="Close chat overlay"
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              'relative flex w-full max-h-[88vh] flex-col rounded-t-2xl border border-border bg-background shadow-2xl',
              'sm:max-h-[min(640px,90vh)] sm:w-full sm:max-w-md sm:rounded-2xl'
            )}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h2 id="superadmin-chat-title" className="text-sm font-bold text-foreground">
                  Superadmin scout assistant
                </h2>
                <p className="text-[10px] text-muted-foreground">Gemma 3 4B · this page&apos;s data + local queue</p>
              </div>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-[200px] max-h-[50vh] sm:max-h-[420px]">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ask about teams, consistency, comments, or alliance picks using the loaded competition data. Output is
                  capped (~500 tokens). Usage is limited to ~15k tokens per 3 minutes per account.
                </p>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-xl px-3 py-2 text-sm leading-relaxed',
                    msg.role === 'user' ? 'bg-primary/15 text-foreground ml-6' : 'bg-muted/50 text-foreground mr-4'
                  )}
                >
                  {msg.text}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking…
                </div>
              )}
              {error && !loading && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <div className="border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="flex gap-2">
                <textarea
                  className="flex-1 min-h-[44px] max-h-32 rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
                  placeholder="Ask about teams in this competition…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  rows={2}
                />
                <Button type="button" className="shrink-0 self-end h-11 w-11 p-0" disabled={loading} onClick={() => void send()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
