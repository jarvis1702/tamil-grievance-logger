import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { initDb, dbRun, dbGet, dbAll } from './db.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Setup Multer for memory storage (audio files)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

app.use(cors());
app.use(express.json());

// Initialize Database
initDb().then(() => {
  console.log('Database initialized successfully.');
}).catch((err) => {
  console.error('Failed to initialize database:', err);
});

// Helper: Get AI Clients
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
};

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
};

// Retry Wrapper for Gemini API calls to handle temporary 503/429 spikes
const callGeminiWithRetry = async (fn, retries = 3, delay = 1500) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isQuotaLimit = 
        err.message?.includes('Quota exceeded') || 
        err.message?.includes('exceeded your current quota') ||
        err.message?.includes('quota');

      const isRetryable = 
        (err.status === 503 || 
         err.status === 429 || 
         err.message?.includes('503') || 
         err.message?.includes('429') || 
         err.message?.includes('high demand') ||
         err.message?.includes('Service Unavailable') ||
         err.message?.includes('fetch failed') ||
         err.code === 'ENOTFOUND' ||
         err.code === 'ETIMEDOUT' ||
         err.code === 'ECONNRESET') && !isQuotaLimit;
        
      if (isRetryable && i < retries - 1) {
        console.warn(`Gemini API call failed (Attempt ${i + 1}/${retries}). Retrying in ${delay}ms... Error:`, err.message || err.code || err);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
      } else {
        throw err;
      }
    }
  }
};

// Model Rotation Fallback Helper: Rotates models if one returns 429 Quota Exceeded
const generateContentWithFallback = async (geminiAI, contents, generationConfig = {}) => {
  const models = [
    'gemini-flash-latest',
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-flash-lite-latest'
  ];
  let lastErr = null;

  for (const modelName of models) {
    try {
      console.log(`Attempting Gemini call with model: ${modelName}...`);
      const model = geminiAI.getGenerativeModel({ model: modelName, generationConfig });
      
      // Perform request using the standard retry (for 503/network spikes)
      const result = await callGeminiWithRetry(() => model.generateContent(contents));
      console.log(`✅ Gemini API success with model: ${modelName}`);
      return result;
    } catch (err) {
      const isQuotaExceeded = 
        err.status === 429 || 
        err.message?.includes('429') || 
        err.message?.includes('Quota exceeded') || 
        err.message?.includes('rate limit');
        
      if (isQuotaExceeded) {
        console.warn(`⚠️ Model "${modelName}" has exhausted its quota. Falling back to next model...`, err.message);
        lastErr = err;
        continue; // Try next model in sequence
      } else {
        throw err; // Re-throw other errors (e.g. invalid arguments)
      }
    }
  }
  throw lastErr || new Error('All Gemini fallback models exhausted their quota.');
};

// ----------------------------------------------------
// 1. API: Transcribe Audio (Speech-to-Text)
// ----------------------------------------------------
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded.' });
    }

    console.log(`Received audio file: ${req.file.originalname}, MIME: ${req.file.mimetype}, Size: ${req.file.size} bytes`);

    const geminiAI = getGeminiClient();
    const openai = getOpenAIClient();

    if (!geminiAI && !openai) {
      return res.status(500).json({
        error: 'No AI service configured. Please check GEMINI_API_KEY or OPENAI_API_KEY in the backend .env.'
      });
    }

    let transcript = '';
    let usedProvider = '';

    // 1. Try Gemini first (Multimodal with Model Rotation)
    if (geminiAI) {
      try {
        console.log('Using Gemini for speech-to-text...');
        const audioPart = {
          inlineData: {
            data: req.file.buffer.toString('base64'),
            mimeType: req.file.mimetype || 'audio/webm',
          },
        };
 
        const prompt = 'Listen to the audio. Please transcribe the spoken audio into Tamil text. Return ONLY the transcription text. Do not add any preamble, explanation, translations, or markdown formatting. If the audio has no speech or you cannot understand it, return a blank line.';
 
        const result = await generateContentWithFallback(geminiAI, [audioPart, prompt]);
        transcript = result.response.text().trim();
        usedProvider = 'gemini';
      } catch (geminiErr) {
        console.error('Gemini transcription failed after trying all fallback models:', geminiErr);
        if (!openai) throw geminiErr;
      }
    }

    // 2. Fallback or use OpenAI Whisper
    if (!transcript && openai) {
      try {
        console.log('Using OpenAI Whisper for speech-to-text...');
        // Wrap buffer in standard file-like object using OpenAI's utility
        const file = await OpenAI.toFile(req.file.buffer, 'audio.webm', { type: req.file.mimetype });
        const response = await openai.audio.transcriptions.create({
          file: file,
          model: 'whisper-1',
          language: 'ta', // Request Tamil
        });
        transcript = response.text.trim();
        usedProvider = 'openai-whisper';
      } catch (openaiErr) {
        console.error('OpenAI transcription failed:', openaiErr);
        throw openaiErr;
      }
    }

    if (!transcript) {
      return res.status(422).json({ error: 'Could not extract transcript from the audio. Please speak clearly.' });
    }

    console.log(`Transcribed successfully via ${usedProvider}: "${transcript}"`);

    res.json({
      transcript,
      language: 'ta',
      confidence: 0.95,
      provider: usedProvider
    });

  } catch (error) {
    console.error('Transcription endpoint error:', error);
    res.status(500).json({ error: 'Speech-to-text transcription failed. ' + error.message });
  }
});

// ----------------------------------------------------
// 2. API: Analyze Transcript (LLM / Structured Output)
// ----------------------------------------------------
app.post('/api/analyze', async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required.' });
    }

    const geminiAI = getGeminiClient();
    const openai = getOpenAIClient();

    if (!geminiAI && !openai) {
      return res.status(500).json({
        error: 'No LLM service configured. Please check GEMINI_API_KEY or OPENAI_API_KEY in the backend .env.'
      });
    }

    const systemPrompt = `You are a Tamil civic grievance analysis system.
Analyze the citizen's complaint carefully.
The complaint may contain ONE or MORE separate civic issues (e.g., "roads are bad and street lights are not working" contains two grievances: road and electricity).
If the citizen mentions multiple issues that belong to different categories or concern different areas, split them into separate items in the "grievances" array. If they describe only one issue, return an array containing exactly one item.

For each grievance in the "grievances" list, determine:
1. category: Must be exactly one of "water", "road", "electricity", "sanitation", or "other".
2. category_tamil: Corresponding Tamil word for the category (e.g. குடிநீர், சாலை, மின்சாரம், சுகாதாரம், இதர).
3. priority: Must be exactly one of "critical", "high", "medium", or "low".
   - If the complaint describes an immediate electrical, fire, safety, water flooding, medical, or life-threatening danger (like snapped live wires), mark priority as critical.
4. issue: Concise summary of the specific issue in Tamil (e.g. "குடிநீர் விநியோகம் இல்லை" or "சாலையில் பெரிய பள்ளம்").
5. location: Mentioned location in Tamil. If not mentioned, return "Not specified".
6. duration: How long has this issue existed (e.g. "3 நாட்கள்"). If not mentioned, return "Not specified".
7. affected_people: Who is affected in Tamil (e.g. "வயதானவர்கள்" or "பள்ளி குழந்தைகள்"). If not mentioned, return "Not specified".
8. urgency_reason: Why is this urgent in Tamil. If not urgent or specified, return null.
9. department: Responsible civic department in Tamil/English (e.g. "குடிநீர் வடிகால் வாரியம் (TWAD Board)" or "நெடுஞ்சாலைத் துறை (Highways Department)").
10. summary_tamil: A very concise one-sentence summary of the grievance in Tamil.
11. summary_english: A very concise one-sentence summary of the grievance in English.

Return ONLY a valid JSON object matching this schema:
{
  "grievances": [
    {
      "category": "water | road | electricity | sanitation | other",
      "category_tamil": "...",
      "priority": "critical | high | medium | low",
      "issue": "...",
      "location": "...",
      "duration": "...",
      "affected_people": "...",
      "urgency_reason": "...",
      "department": "...",
      "summary_tamil": "...",
      "summary_english": "..."
    }
  ]
}`;

    let jsonResultText = '';
    let usedProvider = '';

    // 1. Try Gemini (with Model Rotation)
    if (geminiAI) {
      try {
        console.log('Using Gemini for text analysis...');
        const result = await generateContentWithFallback(geminiAI, [
          systemPrompt,
          `Transcript to analyze: "${transcript}"`
        ], {
          responseMimeType: 'application/json'
        });
 
        jsonResultText = result.response.text().trim();
        usedProvider = 'gemini';
      } catch (geminiErr) {
        console.error('Gemini analysis failed after trying all fallback models:', geminiErr);
        if (!openai) throw geminiErr;
      }
    }

    // 2. Try OpenAI
    if (!jsonResultText && openai) {
      try {
        console.log('Using OpenAI GPT-4o for text analysis...');
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Transcript to analyze: "${transcript}"` }
          ],
          response_format: { type: 'json_object' }
        });

        jsonResultText = completion.choices[0].message.content.trim();
        usedProvider = 'openai-gpt4o';
      } catch (openaiErr) {
        console.error('OpenAI analysis failed:', openaiErr);
        throw openaiErr;
      }
    }

    console.log(`Raw LLM response from ${usedProvider}:`, jsonResultText);

    // Parse the JSON output
    let structuredData;
    try {
      structuredData = JSON.parse(jsonResultText);
    } catch (e) {
      console.warn('JSON parsing failed. Attempting to extract JSON string...', e);
      // Fallback: try to regex match the JSON block
      const match = jsonResultText.match(/\{[\s\S]*\}/);
      if (match) {
        structuredData = JSON.parse(match[0]);
      } else {
        throw new Error('LLM failed to output parseable JSON.');
      }
    }

    res.json({
      ...structuredData,
      provider: usedProvider
    });

  } catch (error) {
    console.error('Analyze endpoint error:', error);
    res.status(500).json({ error: 'LLM analysis failed. ' + error.message });
  }
});

// ----------------------------------------------------
// 3. API: Create Complaint (Submit Ticket)
// ----------------------------------------------------
app.post('/api/complaints', async (req, res) => {
  try {
    const data = req.body;
    let grievances = [];
    let transcript = '';

    if (data.grievances && Array.isArray(data.grievances)) {
      grievances = data.grievances;
      transcript = data.transcript_tamil;
    } else {
      grievances = [data];
      transcript = data.transcript_tamil;
    }

    if (!transcript || grievances.length === 0) {
      return res.status(400).json({ error: 'Transcript and grievances are required.' });
    }

    const createdComplaints = [];
    const now = new Date().toISOString();

    for (const item of grievances) {
      const {
        category,
        priority,
        issue,
        location,
        duration,
        affected_people,
        urgency_reason,
        department,
        summary_tamil,
        summary_english
      } = item;

      if (!category || !priority) {
        return res.status(400).json({ error: 'Category and priority are required for each grievance.' });
      }

      // Generate dynamic ticket ID: TN-<CAT>-<RANDOM_4_DIGIT>
      const categoryCodes = {
        water: 'WTR',
        road: 'RD',
        electricity: 'PWR',
        sanitation: 'SAN',
        other: 'OTH'
      };
      const catCode = categoryCodes[category] || 'OTH';
      
      // Ensure uniqueness of ticket_id
      let ticketId = '';
      let isUnique = false;
      while (!isUnique) {
        const num = Math.floor(1000 + Math.random() * 9000); // 1000 to 9999
        ticketId = `TN-${catCode}-${num}`;
        const existing = await dbGet('SELECT id FROM complaints WHERE ticket_id = ?', [ticketId]);
        if (!existing) {
          isUnique = true;
        }
      }

      const insertResult = await dbRun(
        `INSERT INTO complaints (
          ticket_id, transcript_tamil, category, priority, issue, location, duration,
          affected_people, urgency_reason, department, summary_tamil, summary_english, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?)`,
        [
          ticketId,
          transcript,
          category,
          priority,
          issue || 'குறிப்பிடப்படவில்லை',
          location || 'குறிப்பிடப்படவில்லை',
          duration || 'குறிப்பிடப்படவில்லை',
          affected_people || 'குறிப்பிடப்படவில்லை',
          urgency_reason || null,
          department || 'பொதுத் துறை',
          summary_tamil || 'புகார் பதிவு செய்யப்பட்டுள்ளது.',
          summary_english || 'Grievance registered.',
          now,
          now
        ]
      );

      const complaintId = insertResult.lastID;

      // Write to status history
      await dbRun(
        `INSERT INTO status_history (complaint_id, status, note, created_at) VALUES (?, 'SUBMITTED', 'குடிமக்களால் புகார் பதிவு செய்யப்பட்டது.', ?)`,
        [complaintId, now]
      );

      // Retrieve full inserted record
      const newComplaint = await dbGet('SELECT * FROM complaints WHERE id = ?', [complaintId]);
      createdComplaints.push(newComplaint);
      console.log(`Created new ticket: ${ticketId} (ID: ${complaintId})`);
    }

    res.status(201).json(createdComplaints);

  } catch (error) {
    console.error('Error creating complaints:', error);
    res.status(500).json({ error: 'Failed to create complaints. ' + error.message });
  }
});

// ----------------------------------------------------
// 4. API: Get Single Complaint by Ticket ID
// ----------------------------------------------------
app.get('/api/complaints/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const complaint = await dbGet('SELECT * FROM complaints WHERE ticket_id = ?', [ticketId.toUpperCase().trim()]);

    if (!complaint) {
      return res.status(404).json({ error: `Grievance with Ticket ID "${ticketId}" not found.` });
    }

    // Get status history
    const history = await dbAll(
      'SELECT * FROM status_history WHERE complaint_id = ? ORDER BY created_at ASC',
      [complaint.id]
    );

    res.json({
      ...complaint,
      status_history: history
    });

  } catch (error) {
    console.error('Error getting single complaint:', error);
    res.status(500).json({ error: 'Failed to retrieve complaint.' });
  }
});

// ----------------------------------------------------
// 5. API: Get Filtered Complaints List (for Admin)
// ----------------------------------------------------
app.get('/api/complaints', async (req, res) => {
  try {
    const { category, priority, status } = req.query;

    let query = 'SELECT * FROM complaints WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }
    if (priority && priority !== 'all') {
      query += ' AND priority = ?';
      params.push(priority);
    }
    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const complaints = await dbAll(query, params);
    res.json(complaints);

  } catch (error) {
    console.error('Error getting complaints list:', error);
    res.status(500).json({ error: 'Failed to retrieve complaints list.' });
  }
});

// ----------------------------------------------------
// 6. API: Update Complaint Status / Details (for Admin)
// ----------------------------------------------------
app.patch('/api/complaints/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, department, note } = req.body;

    const complaint = await dbGet('SELECT * FROM complaints WHERE id = ?', [id]);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (priority) {
      updates.push('priority = ?');
      params.push(priority);
    }
    if (department) {
      updates.push('department = ?');
      params.push(department);
    }

    if (updates.length > 0) {
      const now = new Date().toISOString();
      updates.push('updated_at = ?');
      params.push(now);

      params.push(id);

      await dbRun(
        `UPDATE complaints SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      // Write status history record
      const historyStatus = status || complaint.status;
      const historyNote = note || `அதிகாரியால் புகார் தகவல்கள் புதுப்பிக்கப்பட்டன. (Details updated by admin)`;
      await dbRun(
        `INSERT INTO status_history (complaint_id, status, note, created_at) VALUES (?, ?, ?, ?)`,
        [id, historyStatus, historyNote, now]
      );
    }

    const updatedComplaint = await dbGet('SELECT * FROM complaints WHERE id = ?', [id]);
    const history = await dbAll('SELECT * FROM status_history WHERE complaint_id = ? ORDER BY created_at ASC', [id]);

    res.json({
      ...updatedComplaint,
      status_history: history
    });

  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({ error: 'Failed to update complaint. ' + error.message });
  }
});

// ----------------------------------------------------
// 7. API: Get Dashboard Stats
// ----------------------------------------------------
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    // Totals
    const totalRow = await dbGet('SELECT COUNT(*) as count FROM complaints');
    const pendingRow = await dbGet("SELECT COUNT(*) as count FROM complaints WHERE status != 'RESOLVED'");
    const highRow = await dbGet("SELECT COUNT(*) as count FROM complaints WHERE priority IN ('high', 'critical')");
    const resolvedRow = await dbGet("SELECT COUNT(*) as count FROM complaints WHERE status = 'RESOLVED'");

    // Category breakdown
    const categoryRows = await dbAll('SELECT category, COUNT(*) as count FROM complaints GROUP BY category');
    const categories = {
      water: 0,
      road: 0,
      electricity: 0,
      sanitation: 0,
      other: 0
    };
    categoryRows.forEach(row => {
      if (categories[row.category] !== undefined) {
        categories[row.category] = row.count;
      } else {
        categories.other += row.count;
      }
    });

    res.json({
      total: totalRow.count,
      pending: pendingRow.count,
      highPriority: highRow.count,
      resolved: resolvedRow.count,
      categories
    });

  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard statistics.' });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
