import fetch from 'node-fetch'; // wait, we don't have node-fetch installed, but Node 18+ has native fetch! Let's use native fetch.
// Since server.js is running, we can check port 3001.

async function runTests() {
  console.log('--- STARTING PROGRAMMATIC API VERIFICATION ---');
  const baseUrl = 'http://localhost:3001/api';

  try {
    // 1. Verify Stats Endpoint
    console.log('1. Fetching dashboard stats...');
    const statsRes = await fetch(`${baseUrl}/dashboard/stats`);
    if (!statsRes.ok) throw new Error(`Stats failed: ${statsRes.statusText}`);
    const stats = await statsRes.json();
    console.log('Seeded Stats:', stats);
    if (stats.total !== 5) throw new Error(`Expected 5 total complaints, got ${stats.total}`);
    console.log('✓ Stats verified successfully.');

    // 2. Verify List Endpoint
    console.log('\n2. Fetching complaints list...');
    const listRes = await fetch(`${baseUrl}/complaints`);
    if (!listRes.ok) throw new Error(`List failed: ${listRes.statusText}`);
    const list = await listRes.json();
    console.log(`Retrieved ${list.length} complaints.`);
    if (list.length !== 5) throw new Error(`Expected 5 complaints, got ${list.length}`);
    console.log('✓ List verified successfully.');

    // 3. Verify Complaint Registration
    console.log('\n3. Creating a new complaint...');
    const testComplaint = {
      transcript_tamil: 'எங்கள் தெருவில் விளக்கு எரியவில்லை. திருட்டு பயமாக உள்ளது.',
      category: 'electricity',
      priority: 'high',
      issue: 'தெருவிளக்கு எரியவில்லை',
      location: 'நெய்வேலி (Neyveli)',
      duration: '4 நாட்கள்',
      affected_people: 'அப்பகுதி மக்கள்',
      urgency_reason: 'இருட்டாக இருப்பதால் திருட்டு பயம்',
      department: 'TANGEDCO / மின்சார வாரியம்',
      summary_tamil: 'நெய்வேலியில் தெருவிளக்கு எரியாமல் இருட்டாக உள்ளது.',
      summary_english: 'Street light not working in Neyveli, causing security concerns.'
    };

    const createRes = await fetch(`${baseUrl}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testComplaint)
    });
    if (!createRes.ok) throw new Error(`Creation failed: ${createRes.statusText}`);
    const newTicket = await createRes.json();
    console.log('Created Ticket:', newTicket.ticket_id, 'with Status:', newTicket.status);
    if (!newTicket.ticket_id.startsWith('TN-PWR-')) throw new Error(`Invalid ticket prefix: ${newTicket.ticket_id}`);
    console.log('✓ Complaint registration verified successfully.');

    // 4. Verify Single Complaint Fetch by Ticket ID
    console.log(`\n4. Fetching complaint by Ticket ID: ${newTicket.ticket_id}...`);
    const singleRes = await fetch(`${baseUrl}/complaints/${newTicket.ticket_id}`);
    if (!singleRes.ok) throw new Error(`Get ticket failed: ${singleRes.statusText}`);
    const single = await singleRes.json();
    console.log('Fetched Ticket Status:', single.status, 'History Log Count:', single.status_history?.length);
    if (single.status !== 'SUBMITTED') throw new Error(`Expected status SUBMITTED, got ${single.status}`);
    console.log('✓ Single ticket query verified successfully.');

    // 5. Verify Update Complaint Status & Notes
    console.log(`\n5. Updating Ticket ID: ${newTicket.ticket_id} (ID: ${newTicket.id}) status to IN_PROGRESS...`);
    const updateRes = await fetch(`${baseUrl}/complaints/${newTicket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'IN_PROGRESS',
        note: 'மின்சார வாரிய அதிகாரிகள் நெய்வேலிக்கு விரைந்துள்ளனர்.'
      })
    });
    if (!updateRes.ok) throw new Error(`Update failed: ${updateRes.statusText}`);
    const updated = await updateRes.json();
    console.log('Updated Ticket Status:', updated.status, 'Latest Note:', updated.status_history?.[updated.status_history.length - 1]?.note);
    if (updated.status !== 'IN_PROGRESS') throw new Error(`Expected status IN_PROGRESS, got ${updated.status}`);
    console.log('✓ Ticket status modification verified successfully.');

    // 6. Re-check Stats
    console.log('\n6. Fetching updated dashboard stats...');
    const statsRes2 = await fetch(`${baseUrl}/dashboard/stats`);
    const stats2 = await statsRes2.json();
    console.log('Updated Stats:', stats2);
    if (stats2.total !== 6) throw new Error(`Expected 6 total complaints, got ${stats2.total}`);
    console.log('✓ Updated stats verified successfully.');

    console.log('\n--- ALL API AND DATABASE TESTS COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('\n❌ Test execution failed:', err.message);
  }
}

runTests();
