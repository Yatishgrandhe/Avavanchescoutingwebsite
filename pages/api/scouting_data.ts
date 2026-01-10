import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { db } from '@/lib/supabase';
import { calculateScore } from '@/lib/utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    // Check if environment variables are set
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    // Create Supabase client with service role key for server-side operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      res.status(401).json({ error: 'Unauthorized - Missing token' });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('Token verification error:', error);
      res.status(401).json({ error: 'Unauthorized - Invalid token' });
      return;
    }

    if (!user) {
      console.error('No user found in token');
      res.status(401).json({ error: 'Unauthorized - No user' });
      return;
    }

  if (req.method === 'POST') {
    try {
      console.log('Received scouting data request:', req.body);
      
      const {
        match_id,
        matchNumber,
        team_number,
        teamNumber,
        alliance_color,
        allianceColor,
        autonomous_points,
        teleop_points,
        endgame_points,
        final_score,
        autonomous_cleansing,
        teleop_cleansing,
        defense_rating,
        comments,
        scout_id,
        notes,
        autonomous,
        teleop,
        endgame,
        miscellaneous,
      } = req.body;

      // Handle both old and new data formats
      const finalMatchId = match_id || `match_${matchNumber}`;
      const finalTeamNumber = team_number || teamNumber;
      const finalAllianceColor = alliance_color || allianceColor;

      // Validate required fields
      if (!finalMatchId || !finalTeamNumber || !finalAllianceColor) {
        console.error('Missing required fields:', { 
          match_id: finalMatchId, 
          team_number: finalTeamNumber, 
          alliance_color: finalAllianceColor,
          received_data: req.body
        });
        res.status(400).json({ 
          error: 'Missing required fields',
          expected: ['match_id or matchNumber', 'team_number or teamNumber', 'alliance_color or allianceColor'],
          received: Object.keys(req.body)
        });
        return;
      }

      // Handle scoring data - frontend might send pre-calculated scores or raw data
      let finalAutonomousPoints, finalTeleopPoints, finalEndgamePoints, finalScore, finalNotes, finalAutonomousCleansing, finalTeleopCleansing;

      if (autonomous_points !== undefined && teleop_points !== undefined && endgame_points !== undefined) {
        // Frontend sent pre-calculated scores
        finalAutonomousPoints = autonomous_points;
        finalTeleopPoints = teleop_points;
        finalEndgamePoints = endgame_points;
        finalScore = final_score || (autonomous_points + teleop_points + endgame_points);
        finalNotes = notes || {};
        finalAutonomousCleansing = autonomous_cleansing || 0;
        finalTeleopCleansing = teleop_cleansing || 0;
      } else {
        // Frontend sent raw scoring data, calculate scores
        const scoringNotes = {
          ...autonomous,
          ...teleop,
          ...endgame,
        };

        console.log('Scoring notes:', scoringNotes);

        const autonomousScore = calculateScore(autonomous || {});
        const teleopScore = calculateScore(teleop || {});
        const endgameScore = calculateScore(endgame || {});

        finalAutonomousPoints = autonomousScore.final_score;
        finalTeleopPoints = teleopScore.final_score;
        finalEndgamePoints = endgameScore.final_score;
        finalScore = autonomousScore.final_score + teleopScore.final_score + endgameScore.final_score;
        finalNotes = scoringNotes;
        finalAutonomousCleansing = 0; // Not used in REBUILT 2026
        finalTeleopCleansing = 0; // Not used in REBUILT 2026
      }

      // Create scouting data
      const scoutingData = {
        scout_id: user.id,
        match_id: finalMatchId,
        team_number: finalTeamNumber,
        alliance_color: finalAllianceColor,
        autonomous_points: finalAutonomousPoints,
        teleop_points: finalTeleopPoints,
        endgame_points: finalEndgamePoints,
        final_score: finalScore,
        autonomous_cleansing: finalAutonomousCleansing,
        teleop_cleansing: finalTeleopCleansing,
        notes: finalNotes,
        defense_rating: defense_rating || miscellaneous?.defense_rating || 0,
        comments: comments || miscellaneous?.comments || '',
        submitted_by_name: user.user_metadata?.full_name || user.email || 'Unknown',
        submitted_by_email: user.email || '',
        submitted_at: new Date().toISOString(),
      };

      console.log('Scouting data to insert:', scoutingData);

      // Insert directly using Supabase client to avoid the db helper issues
      const { data: result, error: insertError } = await supabase
        .from('scouting_data')
        .insert([scoutingData])
        .select()
        .single();

      if (insertError) {
        console.error('Database insert error:', insertError);
        res.status(500).json({ 
          error: 'Failed to insert scouting data',
          details: insertError.message
        });
        return;
      }

      console.log('Scouting data created successfully:', result);
      res.status(201).json(result);
      return;
    } catch (error) {
      console.error('Error creating scouting data:', error);
      res.status(500).json({ 
        error: 'Failed to create scouting data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      return;
    }
  } else if (req.method === 'GET') {
    try {
      const { match_id, team_number, alliance_color } = req.query;

      let query = supabase.from('scouting_data').select('*').order('created_at', { ascending: false });
      
      if (match_id) query = query.eq('match_id', match_id as string);
      if (team_number) query = query.eq('team_number', parseInt(team_number as string));
      if (alliance_color) query = query.eq('alliance_color', alliance_color as string);

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Database fetch error:', fetchError);
        res.status(500).json({ 
          error: 'Failed to fetch scouting data',
          details: fetchError.message
        });
        return;
      }

      res.status(200).json(data);
      return;
    } catch (error) {
      console.error('Error fetching scouting data:', error);
      res.status(500).json({ error: 'Failed to fetch scouting data' });
      return;
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  } catch (error) {
    console.error('Unexpected error in scouting_data API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
