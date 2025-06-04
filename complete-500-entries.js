import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function complete500Entries() {
  const client = await pool.connect();
  
  try {
    const userId = '612d6bda-3a76-4492-ab9a-8a37a41859c2';
    
    // Current counts: journal:103, note:108, person:102, place:7, thing:5 = 325 total
    // Need 175 more entries
    
    const remaining = [
      { type: 'place', count: 93 },
      { type: 'thing', count: 82 }
    ];
    
    for (const { type, count } of remaining) {
      console.log(`Adding ${count} ${type} entries...`);
      
      for (let i = 0; i < count; i++) {
        let title, content, structuredData;
        
        if (type === 'place') {
          const places = [
            { title: 'Central Library', content: 'Quiet study space with excellent resources', address: '100 Library Way', city: 'San Francisco', coordinates: '37.7849,-122.4094', category: 'Library' },
            { title: 'Innovation Campus', content: 'Modern tech campus with collaborative spaces', address: '200 Innovation Dr', city: 'Palo Alto', coordinates: '37.4419,-122.1430', category: 'Campus' },
            { title: 'Riverside Park', content: 'Peaceful park along the water for recreation', address: '300 River Rd', city: 'San Jose', coordinates: '37.3382,-121.8863', category: 'Park' }
          ];
          const place = places[i % places.length];
          title = place.title + (i >= places.length ? ` ${Math.floor(i / places.length) + 1}` : '');
          content = place.content;
          structuredData = { address: place.address, city: place.city, coordinates: place.coordinates, category: place.category };
        } else {
          const things = [
            { title: 'iPhone 15 Pro', content: 'Latest smartphone with advanced camera system', category: 'Electronics', brand: 'Apple', model: 'iPhone 15 Pro', price: '$999' },
            { title: 'Notion Pro', content: 'Productivity app for organizing work and projects', category: 'Software', brand: 'Notion', model: 'Pro Plan', price: '$10/month' },
            { title: 'Herman Miller Chair', content: 'Ergonomic office chair for long work sessions', category: 'Furniture', brand: 'Herman Miller', model: 'Aeron', price: '$1200' }
          ];
          const thing = things[i % things.length];
          title = thing.title + (i >= things.length ? ` ${Math.floor(i / things.length) + 1}` : '');
          content = thing.content;
          structuredData = { category: thing.category, brand: thing.brand, model: thing.model, price: thing.price };
        }
        
        const entryDate = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000);
        
        await client.query(
          `INSERT INTO entries (title, content, type, date, user_id, structured_data, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [title, content, type, entryDate.toISOString(), userId, JSON.stringify(structuredData), entryDate.toISOString(), entryDate.toISOString()]
        );
      }
    }
    
    const final = await client.query(`SELECT type, COUNT(*) as count FROM entries WHERE user_id = $1 GROUP BY type ORDER BY type`, [userId]);
    console.log('Final counts:');
    let total = 0;
    final.rows.forEach(row => {
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

complete500Entries();
