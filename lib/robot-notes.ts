import { generateScoutingSummary } from './scouting-summarizer';

export interface RobotNote {
  id: string;
  event_key: string;
  event_year: number;
  team_number: number;
  match_reference: string | null;
  body: string;
  author_id: string | null;
  author_name: string;
  created_at: string;
}

export interface NotesEvent {
  key: string;
  year: number;
  name: string;
  archived: boolean;
  competitionId?: string;
}

export interface RobotNotesResponse {
  events: NotesEvent[];
  event: NotesEvent | null;
  teams: { team_number: number; team_name: string }[];
  matches: { match_id: string; match_number: number }[];
  notes: RobotNote[];
}

export function summarizeRobotNotes(notes: RobotNote[]): string {
  const texts = notes.map((note) => `${note.match_reference ? `${note.match_reference}: ` : ''}${note.body}`);
  if (!texts.length) return 'No observations yet.';
  const summary = generateScoutingSummary(texts);
  return summary.startsWith('No significant qualitative') ? texts.slice(0, 3).join(' · ') : summary;
}
