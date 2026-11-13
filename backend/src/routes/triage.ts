// triage.ts — Sarvam AI Kannada incident triage endpoint with deterministic fallback
import { Hono } from 'hono';

export const triageRoutes = new Hono();

interface TriageResponse {
  sourceText: string;
  detectedLanguage: string;
  translatedEnglish: string;
  incidentType: 'no_show' | 'full' | 'breakdown' | 'delay' | 'road_block';
  isExamDay: boolean;
  targetVillage: string;
  urgency: 'critical' | 'high' | 'normal';
  suggestedAction: string;
  provider: 'sarvam_ai' | 'deterministic_fallback';
}

// Deterministic Indic keyword parser as robust offline fallback
function parseKannadaDeterministic(text: string): Omit<TriageResponse, 'sourceText' | 'provider'> {
  const lower = text.toLowerCase();

  // Check for examination keywords (Kannada script & transliterated)
  const isExam = /exam|ಎಕ್ಸಾಮ್|ಪರೀಕ್ಷೆ|ಟೆಸ್ಟ್|test|9 gante|9:00|examination/.test(lower) || text.includes('ಎಕ್ಸಾಮ್') || text.includes('ಪರೀಕ್ಷೆ');

  // Check incident types
  let incidentType: TriageResponse['incidentType'] = 'no_show';
  if (/breakdown|ಬ್ರೇಕ್|ಕೆಟ್ಟು|repair|stroke/.test(lower) || text.includes('ಕೆಟ್ಟು')) {
    incidentType = 'breakdown';
  } else if (/full|ತುಂಬಿದೆ|ರಶ್|overcrowd|seat illa/.test(lower) || text.includes('ತುಂಬಿದೆ')) {
    incidentType = 'full';
  } else if (/late|ತಡ|delay|ಬರಲಿಲ್ಲ/.test(lower) || text.includes('ತಡ')) {
    incidentType = 'delay';
  } else if (/flood|ನೀರು|ಬ್ಲಾಕ್|block|road|ಮುಚ್ಚಿದೆ/.test(lower) || text.includes('ನೀರು')) {
    incidentType = 'road_block';
  }

  // Check village mentions
  let targetVillage = 'VLG-C';
  if (/village a|ರಾಮ್‌ಪುರ|rampur/.test(lower)) targetVillage = 'VLG-A';
  if (/village b|khetpur/.test(lower)) targetVillage = 'VLG-B';

  return {
    detectedLanguage: 'kn-IN (Kannada)',
    translatedEnglish: isExam 
      ? 'Bus did not arrive. Urgent: Student has examination scheduled at 09:00 AM.'
      : 'Bus is unavailable/delayed. Student commuting to college campus.',
    incidentType,
    isExamDay: isExam,
    targetVillage,
    urgency: isExam ? 'critical' : 'normal',
    suggestedAction: isExam
      ? 'Priority Tier-1 Rescue: Allocate to backup Van V1 before 09:00 AM deadline.'
      : 'Standard Rescue Allocation: Queue for verified institution vehicle.',
  };
}

triageRoutes.post('/sarvam', async (c) => {
  const body = await c.req.json() as { text: string };
  const text = (body.text || '').trim();

  if (!text) {
    return c.json({ error: 'Text prompt required' }, 400);
  }

  const sarvamKey = process.env.SARVAM_API_KEY;

  if (sarvamKey) {
    try {
      // Call Sarvam AI Translation or Chat API
      const sarvamRes = await fetch('https://api.sarvam.ai/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': sarvamKey,
        },
        body: JSON.stringify({
          input: text,
          source_language_code: 'kn-IN',
          target_language_code: 'en-IN',
          speaker_gender: 'Female',
          mode: 'formal',
        }),
      });

      if (sarvamRes.ok) {
        const sarvamData = await sarvamRes.json() as { translated_text: string };
        const english = sarvamData.translated_text || '';
        
        // Extract structured metadata from the translated text
        const deterministic = parseKannadaDeterministic(text + ' ' + english);

        const response: TriageResponse = {
          sourceText: text,
          detectedLanguage: 'kn-IN (Kannada)',
          translatedEnglish: english,
          incidentType: deterministic.incidentType,
          isExamDay: deterministic.isExamDay,
          targetVillage: deterministic.targetVillage,
          urgency: deterministic.urgency,
          suggestedAction: deterministic.suggestedAction,
          provider: 'sarvam_ai',
        };

        return c.json({ data: response });
      }
    } catch (err) {
      console.warn('[Sarvam AI] Translation API failed, falling back to deterministic parser:', err);
    }
  }

  // Graceful deterministic fallback
  const fallback = parseKannadaDeterministic(text);
  const response: TriageResponse = {
    sourceText: text,
    ...fallback,
    provider: 'deterministic_fallback',
  };

  return c.json({ data: response });
});
