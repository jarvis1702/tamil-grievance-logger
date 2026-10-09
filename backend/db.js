import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, 'database.sqlite');

// Connect to SQLite Database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Helper wrapper to run queries with promises
export const dbRun = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

export const dbGet = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const dbAll = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Initialize Tables and seed data
export const initDb = async () => {
  // Create complaints table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT UNIQUE NOT NULL,
      transcript_tamil TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL,
      issue TEXT,
      location TEXT,
      duration TEXT,
      affected_people TEXT,
      urgency_reason TEXT,
      department TEXT,
      summary_tamil TEXT,
      summary_english TEXT,
      status TEXT DEFAULT 'SUBMITTED',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Create status_history table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
    )
  `);

  // Check if complaints table is empty
  const rowCount = await dbGet('SELECT COUNT(*) as count FROM complaints');
  if (rowCount.count === 0) {
    console.log('Seeding database with sample Tamil complaints...');

    const sampleComplaints = [
      {
        ticket_id: 'TN-WTR-1001',
        transcript_tamil: 'எங்க ஊர் காட்டூர்ல மூணு நாளா தண்ணியே வரல. வயசானவங்க ரொம்ப கஷ்டப்படுறாங்க. (மாதிரி புகார்)',
        category: 'water',
        priority: 'high',
        issue: 'குடிநீர் வரவில்லை / Water supply disruption',
        location: 'காட்டூர் (Kattur)',
        duration: '3 நாட்கள் (3 days)',
        affected_people: 'முதியவர்கள் (Elderly residents)',
        urgency_reason: 'குடிநீர் இன்றி மக்கள் தவிப்பு',
        department: 'TWAD Board / குடிநீர் வடிகால் வாரியம்',
        summary_tamil: 'காட்டூரில் 3 நாட்களாக குடிநீர் விநியோகம் இல்லை. முதியவர்கள் அவதியுறுகின்றனர்.',
        summary_english: 'No water supply in Kattur for 3 days. Elderly residents are facing high difficulty.',
        status: 'SUBMITTED',
        created_at: new Date(Date.now() - 4 * 3600000).toISOString() // 4 hours ago
      },
      {
        ticket_id: 'TN-RD-1002',
        transcript_tamil: 'திருச்சி மெயின் ரோடுல பெரிய குழி இருக்கு. ஸ்கூல் பசங்க தினமும் அந்த வழியா போறாங்க, விழுந்துடுவாங்க போல இருக்கு. (மாதிரி புகார்)',
        category: 'road',
        priority: 'high',
        issue: 'சாலையில் பெரிய பள்ளம் / Large pothole on road',
        location: 'திருச்சி (Trichy)',
        duration: 'குறிப்பிடப்படவில்லை (Not specified)',
        affected_people: 'பள்ளி குழந்தைகள் மற்றும் பொதுமக்கள் (School children and public)',
        urgency_reason: 'விபத்து ஏற்படும் அபாயம்',
        department: 'Highways Department / நெடுஞ்சாலைத் துறை',
        summary_tamil: 'திருச்சி சாலையில் பெரிய பள்ளம் உள்ளது, பள்ளி குழந்தைகள் கடந்து செல்ல ஆபத்தாக உள்ளது.',
        summary_english: 'Large pothole on Trichy road posing danger to school children and commuters.',
        status: 'ASSIGNED',
        created_at: new Date(Date.now() - 24 * 3600000).toISOString() // 1 day ago
      },
      {
        ticket_id: 'TN-PWR-1003',
        transcript_tamil: 'மதுரை வீதியில டிரான்ஸ்பார்மர் பக்கத்துல மின்கம்பி அறுந்து கிடக்கு. யாராவது மிதிச்சா ஆபத்து, உடனே சரி பண்ணுங்க. (மாதிரி புகார்)',
        category: 'electricity',
        priority: 'critical',
        issue: 'அறுந்து கிடக்கும் மின்கம்பி / Snapped electrical wire',
        location: 'மதுரை (Madurai)',
        duration: 'இன்று (Today)',
        affected_people: 'அப்பகுதி மக்கள் மற்றும் பாதசாரிகள் (Locals and pedestrians)',
        urgency_reason: 'உயிர் ஆபத்து / Exposed electrical hazard',
        department: 'TANGEDCO / மின்சார வாரியம்',
        summary_tamil: 'மதுரையில் மின்மாற்றி அருகில் அறுந்த மின்கம்பி விழுந்து கிடக்கிறது. பெரும் ஆபத்து.',
        summary_english: 'Live snapped power line lying near transformer in Madurai. Extremely dangerous.',
        status: 'IN_PROGRESS',
        created_at: new Date(Date.now() - 36 * 3600000).toISOString() // 1.5 days ago
      },
      {
        ticket_id: 'TN-SAN-1004',
        transcript_tamil: 'சேலம் தெருவுல குப்பை எல்லாம் அள்ளாம தேங்கி கிடக்கு. நாற்றம் தாங்கல, கொசு தொல்லை அதிகமா இருக்கு. (மாதிரி புகார்)',
        category: 'sanitation',
        priority: 'low',
        issue: 'குப்பைகள் அகற்றப்படவில்லை / Garbage accumulation',
        location: 'சேலம் (Salem)',
        duration: 'ஒரு வாரம் (One week)',
        affected_people: 'தெருவாசிகள் (Street residents)',
        urgency_reason: 'நோய் பரவும் அபாயம் மற்றும் கொசுக்கள் பெருக்கம்',
        department: 'Salem Corporation / தூய்மைப் பணித் துறை',
        summary_tamil: 'சேலத்தில் ஒரு வாரமாக குப்பைகள் அகற்றப்படாமல் தேங்கி கிடக்கிறது. கொசுத் தொல்லை அதிகம்.',
        summary_english: 'Garbage accumulation in Salem for a week, causing foul smell and mosquito breeding.',
        status: 'RESOLVED',
        created_at: new Date(Date.now() - 72 * 3600000).toISOString() // 3 days ago
      },
      {
        ticket_id: 'TN-WTR-1005',
        transcript_tamil: 'தஞ்சாவூர்ல எங்களோட தெரு குழாய் உடைஞ்சு தண்ணி வீணா போயிட்டு இருக்கு. (மாதிரி புகார்)',
        category: 'water',
        priority: 'medium',
        issue: 'குடிநீர் குழாய் உடைப்பு / Broken public water tap leaking water',
        location: 'தஞ்சாவூர் (Thanjavur)',
        duration: '2 நாட்கள் (2 days)',
        affected_people: 'தெரு மக்கள் (Street residents)',
        urgency_reason: 'சுத்தமான குடிநீர் வீணாகிறது',
        department: 'Municipal Water Supply / நகராட்சி குடிநீர் வழங்கல்',
        summary_tamil: 'தஞ்சாவூரில் தெருக் குழாய் உடைந்து குடிநீர் வீணாக ஓடுகிறது.',
        summary_english: 'Broken public tap in Thanjavur leaking drinking water for two days.',
        status: 'ASSIGNED',
        created_at: new Date(Date.now() - 48 * 3600000).toISOString() // 2 days ago
      }
    ];

    for (const item of sampleComplaints) {
      const result = await dbRun(
        `INSERT INTO complaints (
          ticket_id, transcript_tamil, category, priority, issue, location, duration,
          affected_people, urgency_reason, department, summary_tamil, summary_english, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.ticket_id, item.transcript_tamil, item.category, item.priority, item.issue, item.location, item.duration,
          item.affected_people, item.urgency_reason, item.department, item.summary_tamil, item.summary_english, item.status,
          item.created_at, item.created_at
        ]
      );
      
      // Add initial status history
      const complaintId = result.lastID;
      await dbRun(
        `INSERT INTO status_history (complaint_id, status, note, created_at) VALUES (?, ?, ?, ?)`,
        [complaintId, item.status, 'மாதிரி புகார் உருவாக்கப்பட்டது (Sample complaint seeded)', item.created_at]
      );

      if (item.status === 'ASSIGNED' || item.status === 'IN_PROGRESS' || item.status === 'RESOLVED') {
        // Add follow-up status histories for older items
        if (item.status !== 'SUBMITTED') {
          await dbRun(
            `INSERT INTO status_history (complaint_id, status, note, created_at) VALUES (?, ?, ?, ?)`,
            [complaintId, 'ASSIGNED', `புகார் ${item.department} பிரிவுக்கு அனுப்பப்பட்டது.`, new Date(new Date(item.created_at).getTime() + 2 * 3600000).toISOString()]
          );
        }
        if (item.status === 'IN_PROGRESS' || item.status === 'RESOLVED') {
          await dbRun(
            `INSERT INTO status_history (complaint_id, status, note, created_at) VALUES (?, ?, ?, ?)`,
            [complaintId, 'IN_PROGRESS', 'பணியாளர்கள் களத்திற்கு அனுப்பப்பட்டுள்ளனர்.', new Date(new Date(item.created_at).getTime() + 5 * 3600000).toISOString()]
          );
        }
        if (item.status === 'RESOLVED') {
          await dbRun(
            `INSERT INTO status_history (complaint_id, status, note, created_at) VALUES (?, ?, ?, ?)`,
            [complaintId, 'RESOLVED', 'பிரச்சனை சரிசெய்யப்பட்டு, புகார் தீர்க்கப்பட்டது.', new Date(new Date(item.created_at).getTime() + 10 * 3600000).toISOString()]
          );
        }
      }
    }
    console.log('Database seeding complete.');
  }
};

export default db;
