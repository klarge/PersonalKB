import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function bulkInsertRemainingEntries() {
  const client = await pool.connect();
  
  try {
    // Get user ID
    const userResult = await client.query('SELECT id FROM users LIMIT 1');
    const userId = userResult.rows[0].id;
    
    // Check current counts
    const currentCounts = await client.query(`
      SELECT type, COUNT(*) as count 
      FROM entries 
      WHERE user_id = $1 
      GROUP BY type
    `, [userId]);
    
    console.log('Current entry counts:');
    currentCounts.rows.forEach(row => {
      console.log(`${row.type}: ${row.count}`);
    });
    
    // Generate remaining entries to reach 500 total
    const targetCounts = { journal: 100, note: 100, person: 100, place: 100, thing: 100 };
    const currentMap = {};
    currentCounts.rows.forEach(row => {
      currentMap[row.type] = parseInt(row.count);
    });
    
    const sampleData = {
      person: {
        entries: [
          { title: "Alice Cooper", content: "Marketing specialist with expertise in digital campaigns", email: "alice@company.com", phone: "555-0101", company: "DigitalCorp", role: "Marketing Manager" },
          { title: "Bob Smith", content: "Senior software engineer focusing on backend systems", email: "bob@techfirm.com", phone: "555-0102", company: "TechFirm", role: "Senior Engineer" },
          { title: "Carol Davis", content: "Product manager with 8 years of experience", email: "carol@startup.io", phone: "555-0103", company: "StartupIO", role: "Product Manager" },
          { title: "David Wilson", content: "UX designer passionate about user-centered design", email: "david@design.co", phone: "555-0104", company: "DesignCo", role: "UX Designer" }
        ]
      },
      place: {
        entries: [
          { title: "Golden Gate Park", content: "Beautiful urban park perfect for walking and picnics", address: "501 Stanyan St", city: "San Francisco", coordinates: "37.7694,-122.4862", category: "Park" },
          { title: "The Coffee Bean", content: "Cozy coffee shop with excellent wifi and atmosphere", address: "123 Main St", city: "Berkeley", coordinates: "37.8715,-122.2730", category: "Coffee Shop" },
          { title: "Tech Museum", content: "Interactive science and technology museum", address: "201 S Market St", city: "San Jose", coordinates: "37.3318,-121.8909", category: "Museum" },
          { title: "Marina Beach", content: "Scenic waterfront area great for morning runs", address: "Marina Blvd", city: "San Francisco", coordinates: "37.8058,-122.4661", category: "Beach" }
        ]
      },
      thing: {
        entries: [
          { title: "Dell XPS 13", content: "Compact laptop perfect for development work", category: "Electronics", brand: "Dell", model: "XPS 13", price: "$999" },
          { title: "Figma Pro", content: "Essential design tool for UI/UX work", category: "Software", brand: "Figma", model: "Pro Plan", price: "$12/month" },
          { title: "Herman Miller Chair", content: "Ergonomic office chair for long work sessions", category: "Furniture", brand: "Herman Miller", model: "Aeron", price: "$1200" },
          { title: "iPhone 15", content: "Latest smartphone with excellent camera", category: "Electronics", brand: "Apple", model: "iPhone 15", price: "$799" }
        ]
      }
    };
    
    for (const [type, target] of Object.entries(targetCounts)) {
      const current = currentMap[type] || 0;
      const needed = target - current;
      
      if (needed > 0) {
        console.log(`Creating ${needed} additional ${type} entries...`);
        
        for (let i = 0; i < needed; i++) {
          let title, content, structuredData = {};
          
          if (type === 'journal') {
            title = `Journal Entry ${current + i + 1}`;
            content = `Daily reflection and thoughts from ${new Date().toLocaleDateString()}. Today was productive with several important tasks completed.`;
          } else if (type === 'note') {
            title = `Research Note ${current + i + 1}`;
            content = `Important findings and insights from recent research. This information will be useful for future reference and planning.`;
          } else if (sampleData[type]) {
            const sample = sampleData[type].entries[i % sampleData[type].entries.length];
            title = sample.title + (i >= sampleData[type].entries.length ? ` ${Math.floor(i / sampleData[type].entries.length) + 1}` : '');
            content = sample.content;
            structuredData = { ...sample };
            delete structuredData.title;
            delete structuredData.content;
          }
          
          // Generate date within last 6 months
          const now = new Date();
          const daysAgo = Math.floor(Math.random() * 180);
          const entryDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
          
          await client.query(
            `INSERT INTO entries (title, content, type, date, user_id, structured_data, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              title,
              content,
              type,
              entryDate.toISOString(),
              userId,
              JSON.stringify(structuredData),
              entryDate.toISOString(),
              entryDate.toISOString()
            ]
          );
        }
      }
    }
    
    // Final count
    const finalCounts = await client.query(`
      SELECT type, COUNT(*) as count 
      FROM entries 
      WHERE user_id = $1 
      GROUP BY type
    `, [userId]);
    
    console.log('\nFinal entry counts:');
    let total = 0;
    finalCounts.rows.forEach(row => {
      console.log(`${row.type}: ${row.count}`);
      total += parseInt(row.count);
    });
    console.log(`Total: ${total} entries`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

bulkInsertRemainingEntries();