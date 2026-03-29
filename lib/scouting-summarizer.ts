/**
 * Scouting Intelligence Summarizer
 * A lightweight, rule-based extractive summarizer designed for FRC scouting comments.
 * It provides intelligent, aggregated insights without the need for an external API key.
 */

const FRC_KEYWORDS: Record<string, number> = {
  // Positive Performance
  'fast': 1.5,
  'efficient': 1.5,
  'powerful': 1.3,
  'consistent': 1.8,
  'smooth': 1.2,
  'clean': 1.2,
  'impressive': 1.4,
  'climb': 1.6,
  'score': 1.2,
  'cycle': 1.4,
  'elite': 2.0,
  'incredible': 1.8,
  'aggressive': 1.3,
  'solid': 1.3,
  
  // Concerns / Issues
  'broke': 2.0,
  'failed': 1.8,
  'struggled': 1.5,
  'slow': 1.3,
  'disconnect': 1.8,
  'brownout': 1.7,
  'tippy': 1.6,
  'stuck': 1.5,
  'penalty': 1.4,
  'defense': 1.3,
  'interference': 1.2,
  
  // Scouting Status
  'reliable': 1.7,
  'effective': 1.4,
  'strategy': 1.2,
  'coordinated': 1.3,
  'alliance': 1.1
};

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'match', 'team', 'robot'
]);

/**
 * Generates an aggregated strategic summary from an array of match comments.
 */
export function generateScoutingSummary(comments: string[]): string {
  const filteredComments = comments
    .map(c => c?.trim())
    .filter(c => c && c.length > 5);

  if (filteredComments.length === 0) return "No significant qualitative data found for this team.";

  // 1. Calculate weighted word frequencies
  const wordFreq: Record<string, number> = {};
  
  filteredComments.forEach(comment => {
    const words = comment.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    words.forEach(word => {
      if (word.length < 3 || STOP_WORDS.has(word)) return;
      
      const weight = FRC_KEYWORDS[word] || 1.0;
      wordFreq[word] = (wordFreq[word] || 0) + weight;
    });
  });

  // 2. Score sentences based on word frequencies
  const scoredSentences: { text: string; score: number }[] = [];
  
  filteredComments.forEach(comment => {
    // Basic sentence splitting (improved for FRC punctuation)
    const sentences = comment.split(/(?<=[.!?])\s+(?=[A-Z])|(?<=[.!?])$/);
    
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length < 10) return;
      
      const words = trimmed.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
      let score = 0;
      
      words.forEach(word => {
        if (wordFreq[word]) {
          score += wordFreq[word];
        }
      });
      
      // Normalize by sentence length to avoid bias towards long rambling notes
      const normalizedScore = score / Math.sqrt(words.length + 1);
      
      scoredSentences.push({ text: trimmed, score: normalizedScore });
    });
  });

  // 3. Sort and pick top sentences, ensuring diversity (distinct thoughts)
  scoredSentences.sort((a, b) => b.score - a.score);
  
  const selected: string[] = [];
  const MAX_SUMMARY_SENTENCES = 3;
  
  for (const item of scoredSentences) {
    if (selected.length >= MAX_SUMMARY_SENTENCES) break;
    
    // Check for redundancy (avoid very similar sentences)
    const isRedundant = selected.some(existing => 
      calculateSentenceSimilarity(existing, item.text) > 0.4
    );
    
    if (!isRedundant) {
      selected.push(item.text);
    }
  }

  if (selected.length === 0) return filteredComments[0] || "No strategic summary available.";

  // 4. Final aggregation formatting
  return selected.join(" ").replace(/\s\s+/g, ' ');
}

/**
 * Calculates Jaccard similarity between two sentences.
 */
function calculateSentenceSimilarity(s1: string, s2: string): number {
  const words1 = new Set(s1.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => !STOP_WORDS.has(w)));
  const words2 = new Set(s2.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => !STOP_WORDS.has(w)));
  
  const intersection = new Set(Array.from(words1).filter(x => words2.has(x)));
  const union = new Set([...Array.from(words1), ...Array.from(words2)]);
  
  return intersection.size / union.size;
}
