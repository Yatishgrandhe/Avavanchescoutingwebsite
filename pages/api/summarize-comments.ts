import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { comments } = req.body;
  if (!comments || !Array.isArray(comments)) {
    return res.status(400).json({ message: 'Invalid comments' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Return a clear error so the UI can handle it (e.g. show "Not configured")
    return res.status(500).json({ message: 'GEMINI_API_KEY not configured in Vercel' });
  }

  // Filter out empty or too short comments to save tokens and improve quality
  const validComments = comments
    .map(c => c?.trim())
    .filter(c => c && c.length > 3);

  if (validComments.length === 0) {
    return res.status(200).json({ summary: "No qualitative match reports available to summarize." });
  }

  try {
    const prompt = `You are a professional FRC (First Robotics Competition) strategy analyst and lead scout. 
    Review these raw scouting notes from multiple matches and provide a high-level, ONE-PARA GRAPH strategic summary (max 3-4 sentences total).
    
    Focus on:
    1. Overall robot reliability and consistency (did it break? did it always work?).
    2. Primary scoring strengths (speed, efficiency, accuracy).
    3. Defensive capabilities or weaknesses (tippiness, speed, aggression).
    4. Integration and overall utility in an alliance.
    
    Raw Scouting Notes:
    ${validComments.map((c, i) => `Match ${i + 1}: ${c}`).join('\n')}
    
    Your summary should be objective, professional, and actionable for an alliance selection captain.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Gemini API Error Response:', errorData);
        throw new Error(errorData.error?.message || 'Failed to call Gemini API');
    }

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!summary) {
      throw new Error('No summary generated in the response');
    }

    res.status(200).json({ summary: summary.trim() });
  } catch (error: any) {
    console.error('Summarize API Error:', error);
    res.status(500).json({ message: error.message || 'Error generating summary' });
  }
}
