import { getOfflineQueue } from '@/lib/offline-queue';
import { normalizePitPhotoUrls } from '@/lib/pit-images';

export type LocalPendingMatchRow = {
  id: string;
  competition_key: string;
  created_at: string;
  submitted_at: string;
  match_id: string;
  team_number: number;
  final_score: number;
  autonomous_points: number;
  teleop_points: number;
  defense_rating?: number;
  average_downtime?: number | null;
  broke?: boolean | null;
  notes: unknown;
  submitted_by_name?: string;
  submitted_by_email?: string;
  organization_id?: string;
  is_local_only: true;
};

export type LocalPendingPitRow = {
  id: string;
  created_at: string;
  team_number: number;
  team_name?: string;
  robot_name: string;
  drive_type: string;
  weight: number;
  notes: string;
  submitted_by_name: string;
  submitted_by_email: string;
  programming_language?: string;
  robot_image_url?: string | null;
  photos?: string[];
  overall_rating?: number;
  organization_id?: string;
  is_local_only: true;
};

export async function getLocalPendingMatchRows(organizationId?: string): Promise<LocalPendingMatchRow[]> {
  const queue = await getOfflineQueue();
  return queue
    .filter((item) => item.type === 'match-scouting')
    .filter((item) => !organizationId || item.metadata.organizationId === organizationId)
    .map((item) => {
      const data = item.data || {};
      return {
        id: `local-${item.id}`,
        competition_key: item.metadata.competitionKey || '',
        created_at: item.metadata.queuedAt,
        submitted_at: data.submitted_at || item.metadata.queuedAt,
        match_id: data.match_id || '',
        team_number: Number(data.team_number || 0),
        final_score: Number(data.final_score || 0),
        autonomous_points: Number(data.autonomous_points || 0),
        teleop_points: Number(data.teleop_points || 0),
        defense_rating: data.defense_rating != null ? Number(data.defense_rating) : undefined,
        average_downtime: data.average_downtime ?? null,
        broke: data.broke ?? null,
        notes: data.notes || {},
        submitted_by_name: data.submitted_by_name || 'Local Pending',
        submitted_by_email: data.submitted_by_email || '',
        organization_id: data.organization_id || item.metadata.organizationId,
        is_local_only: true as const,
      };
    });
}

export async function getLocalPendingPitRows(organizationId?: string): Promise<LocalPendingPitRow[]> {
  const queue = await getOfflineQueue();
  return queue
    .filter((item) => item.type === 'pit-scouting')
    .filter((item) => !organizationId || item.metadata.organizationId === organizationId)
    .map((item) => {
      const data = item.data?.submissionData || {};
      const photosNorm = normalizePitPhotoUrls({
        robot_image_url: data.robot_image_url,
        photos: data.photos,
      });
      const main =
        (data.robot_image_url != null && String(data.robot_image_url).trim()) || photosNorm[0] || null;
      return {
        id: `local-${item.id}`,
        created_at: item.metadata.queuedAt,
        team_number: Number(data.team_number || item.metadata.teamNumber || 0),
        team_name: undefined,
        robot_name: data.robot_name || 'Local Pending Robot',
        drive_type: data.drive_type || 'Unknown',
        weight: Number(data.weight || 0),
        notes: data.notes || '',
        submitted_by_name: data.submitted_by_name || 'Local Pending',
        submitted_by_email: data.submitted_by_email || '',
        programming_language: data.programming_language || 'Unknown',
        robot_image_url: main,
        photos: photosNorm,
        overall_rating: data.overall_rating != null ? Number(data.overall_rating) : undefined,
        organization_id: data.organization_id || item.metadata.organizationId,
        is_local_only: true as const,
      };
    });
}
