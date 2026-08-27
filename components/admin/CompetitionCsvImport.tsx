import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, ClipboardCopy, Download, FileSpreadsheet, Loader2, Sparkles, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from '@/components/ui';

const GEMINI_PROMPT = `Read these FRC match-schedule photos and create a downloadable file named frc_match_schedule.csv. The file must contain RFC 4180 CSV only — no Markdown fences, explanation, or extra columns.

Use this exact structure:

SECTION 1 — Match Schedule (start immediately, no blank lines before the header):
match_number,red_1,red_2,red_3,blue_1,blue_2,blue_3

SECTION 2 — Team Names (one blank line after the last match row, then this header):
team_number,team_name

Rules for the match schedule:
- One qualification match per row.
- match_number must be only the numeric match number (QM 12 becomes 12).
- Each red_* and blue_* value must be only a numeric FRC team number.
- Preserve the schedule exactly as shown.
- Skip non-qualification rows such as practice, playoffs, finals, or breaks.
- Omit any match row with an unreadable team number rather than guessing.
- Ensure every included row has all six alliance team numbers.

Rules for team names:
- After the match rows, leave one blank line, then add the team_number,team_name header.
- List every unique team number that appeared in the schedule.
- Use your FRC knowledge to provide the official team name for each team number.
- If you are not certain of a team name, write "Team <number>" as the name.
- Sort by team_number ascending.

Attach the finished frc_match_schedule.csv file. If you cannot attach files, return only the raw CSV text so I can save it as frc_match_schedule.csv.`;

type Props = {
  accessToken?: string;
  eventName: string;
  onImported: (eventKey: string, eventName: string, matchCount: number) => void;
};

export function CompetitionCsvImport({ accessToken, eventName, onImported }: Props) {
  const [importEventName, setImportEventName] = useState(eventName);
  const [fileName, setFileName] = useState('');
  const [csv, setCsv] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [copied, setCopied] = useState(false);
  const promptRef = useRef<HTMLPreElement>(null);

  useEffect(() => setImportEventName(eventName), [eventName]);

  const preview = useMemo(() => csv.split(/\r?\n/).filter(Boolean).slice(0, 4), [csv]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) {
      toast.error('Choose a CSV smaller than 1 MB.');
      event.target.value = '';
      return;
    }
    const text = await file.text();
    setCsv(text);
    setFileName(file.name);
  }

  async function copyPrompt() {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(GEMINI_PROMPT);
      } else {
        // Fallback: select the pre element's text content
        const pre = promptRef.current;
        if (!pre) throw new Error('No element');
        const range = document.createRange();
        range.selectNodeContents(pre);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        document.execCommand('copy');
        sel?.removeAllRanges();
      }
      setCopied(true);
      toast.success('Gemini prompt copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Last resort: select text so user can Cmd+C
      const pre = promptRef.current;
      if (pre) {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      toast.info('Text selected — press Cmd+C / Ctrl+C to copy');
    }
  }

  function downloadTemplate() {
    const template = `match_number,red_1,red_2,red_3,blue_1,blue_2,blue_3
1,1234,5678,9012,3456,7890,1111
2,2222,3333,4444,5555,6666,7777

team_number,team_name
1234,The Roboteers
5678,Gear Grinders
9012,Steel Storm
3456,The Brave Bots
7890,Circuit Breakers
1111,Riviera Robotics
2222,Team Impact
3333,The Marauders
4444,High Voltage
5555,Robo Warriors
6666,CyberDragons
7777,Botcats`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'frc_match_schedule_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  }

  async function importCsv() {
    if (!accessToken) {
      toast.error('Your session is not ready. Refresh and try again.');
      return;
    }
    if (!csv) {
      toast.error('Choose a schedule CSV first.');
      return;
    }
    setIsImporting(true);
    try {
      const response = await fetch('/api/admin/import-competition-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ eventName: importEventName, csv }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Import failed.');
      const msg = result.teamNamesApplied > 0
        ? `Imported ${result.importedMatches} matches, ${result.importedTeams} teams, and ${result.teamNamesApplied} team names.`
        : `Imported ${result.importedMatches} matches and ${result.importedTeams} teams.`;
      toast.success(msg);
      onImported(result.eventKey, result.eventName, result.importedMatches);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed.');
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Card className="border-border/60 bg-muted/10 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><FileSpreadsheet className="h-4 w-4" aria-hidden /></span>
          CSV schedule import
        </CardTitle>
        <CardDescription className="text-sm">Import a photographed or manual schedule without clearing existing competition data.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="csv-event-name">Competition name</Label>
          <Input id="csv-event-name" value={importEventName} onChange={(event) => setImportEventName(event.target.value)} placeholder="e.g. Asheville Regional" />
          <p className="text-xs text-muted-foreground">Avalanche creates the schedule ID automatically from this name.</p>
        </div>
        <div className="rounded-lg border border-dashed border-border/80 bg-background/30 p-4">
          <Label htmlFor="competition-csv" className="flex cursor-pointer flex-wrap items-center justify-between gap-3 text-sm font-medium">
            <span className="flex items-center gap-2"><Upload className="h-4 w-4 text-primary" aria-hidden />Choose schedule CSV</span>
            <span className="text-xs font-normal text-muted-foreground">{fileName || 'Maximum 1 MB'}</span>
          </Label>
          <Input id="competition-csv" className="sr-only" type="file" accept=".csv,text/csv" onChange={handleFileChange} />
          {preview.length > 0 && <pre className="mt-3 max-h-28 overflow-auto rounded-md bg-muted/50 p-3 text-xs text-muted-foreground whitespace-pre-wrap">{preview.join('\n')}</pre>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={importCsv} disabled={isImporting || !csv} className="min-h-10">
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileSpreadsheet className="h-4 w-4" aria-hidden />}
            Import schedule
          </Button>
          <Button type="button" variant="outline" className="min-h-10" onClick={downloadTemplate}>
            <Download className="h-4 w-4" aria-hidden />Template CSV
          </Button>
          <Button type="button" variant="outline" className="min-h-10" onClick={() => setShowInstructions((current) => !current)} aria-expanded={showInstructions}>
            <Sparkles className="h-4 w-4" aria-hidden />Gemini instructions
          </Button>
        </div>
        {showInstructions && <div className="space-y-3 rounded-lg border border-border/60 bg-background/25 p-4 text-sm">
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>Take clear, straight-on photos of the schedule. Include its headers and every red and blue team number.</li>
            <li>Upload the photos to Gemini, then copy and paste this prompt.</li>
            <li>Download Gemini&apos;s attached <code>frc_match_schedule.csv</code> file and choose it above. If Gemini returned text instead, save that text as a <code>.csv</code> file.</li>
            <li>Gemini will also research team names from its FRC knowledge. These are included in the CSV after the match rows and will automatically populate team names in the app.</li>
          </ol>
          <p className="text-xs text-muted-foreground">Alternatively, download the template CSV, fill in your schedule manually, and upload it.</p>
          <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-foreground">Gemini prompt</p><Button type="button" variant="secondary" size="sm" onClick={copyPrompt}>{copied ? <><CheckCircle2 className="h-4 w-4" aria-hidden />Copied!</> : <><ClipboardCopy className="h-4 w-4" aria-hidden />Copy</>}</Button></div>
          <pre ref={promptRef} className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs text-muted-foreground select-all">{GEMINI_PROMPT}</pre>
          <p className="flex items-start gap-2 text-xs text-muted-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />Expected headers: <code>match_number,red_1,...,blue_3</code> followed by a blank line and <code>team_number,team_name</code></p>
        </div>}
      </CardContent>
    </Card>
  );
}
