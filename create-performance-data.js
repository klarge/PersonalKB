import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const sampleData = {
  journal: {
    titles: [
      "Morning Reflections", "Weekend Adventures", "Daily Progress", "Life Updates", 
      "Thoughts on Growth", "Today's Insights", "Weekly Review", "Personal Goals",
      "Creative Inspiration", "Mindfulness Practice", "Career Development", "Health Journey"
    ],
    content: [
      "Had a productive morning routine today. Started with meditation and journaling, which really helped center my thoughts before diving into work.",
      "Spent the weekend exploring a new hiking trail with friends. The view from the summit was absolutely breathtaking and worth every step.",
      "Made significant progress on my current project today. The new approach I'm taking seems to be working much better than my previous attempts.",
      "Reflecting on the past month and all the changes that have happened. It's amazing how much can shift in such a short period of time.",
      "Been thinking a lot about personal growth lately. Reading this new book has given me some fresh perspectives on old challenges.",
      "Today I had an interesting conversation with a colleague about innovation in our industry. It sparked some new ideas for future projects."
    ]
  },
  note: {
    titles: [
      "Meeting Notes", "Research Findings", "Project Ideas", "Technical Documentation",
      "Book Summary", "Learning Notes", "Quick Thoughts", "Reference Material",
      "Code Snippets", "Design Concepts", "Process Documentation", "Best Practices"
    ],
    content: [
      "Key takeaways from today's team meeting: focus on user experience improvements, prioritize mobile responsiveness, and implement better error handling.",
      "Research shows that implementing progressive web app features can improve user engagement by up to 40% across mobile devices.",
      "New project idea: create a tool that automatically generates documentation from code comments and function signatures.",
      "Important design principle: always prioritize accessibility and ensure the interface works well for users with disabilities.",
      "Code review best practices: focus on readability, maintainability, and performance. Always provide constructive feedback.",
      "Database optimization techniques: proper indexing, query optimization, and connection pooling can significantly improve performance."
    ]
  },
  person: {
    titles: [
      "John Smith", "Sarah Johnson", "Mike Chen", "Emma Wilson", "David Brown",
      "Lisa Garcia", "Alex Rodriguez", "Jennifer Lee", "Robert Taylor", "Maria Gonzalez",
      "James Anderson", "Ashley Davis", "Michael Martinez", "Jessica Thompson", "Christopher White"
    ],
    content: [
      "Met at the tech conference last month. Brilliant insights on machine learning applications in healthcare. Currently working at a startup.",
      "College friend who's now a successful entrepreneur. Always has great advice on business strategy and startup challenges.",
      "Colleague from my previous job. Expert in data science and analytics. We collaborated on several successful projects together.",
      "Client from the marketing project. Very detail-oriented and has excellent communication skills. A pleasure to work with.",
      "Mentor from my early career days. Provided invaluable guidance on professional development and leadership skills."
    ],
    structuredData: [
      { email: "john.smith@email.com", phone: "555-0123", company: "TechCorp", role: "Senior Developer" },
      { email: "sarah.j@startup.com", phone: "555-0456", company: "InnovateCo", role: "Product Manager" },
      { email: "mike.chen@datatech.com", phone: "555-0789", company: "DataTech Solutions", role: "Data Scientist" },
      { email: "emma.wilson@marketing.com", phone: "555-0321", company: "Creative Agency", role: "Marketing Director" },
      { email: "david.brown@consulting.com", phone: "555-0654", company: "Strategy Consulting", role: "Senior Consultant" }
    ]
  },
  place: {
    titles: [
      "Central Park Coffee", "Downtown Library", "Riverside Walking Trail", "Tech Hub Coworking",
      "Mountain View Restaurant", "City Art Museum", "Beachside Cafe", "Urban Fitness Center",
      "Historic District", "Innovation Campus", "Sunset Viewpoint", "Local Bookstore"
    ],
    content: [
      "Great place for morning coffee and remote work. Fast wifi, comfortable seating, and excellent pastries. Usually not too crowded before 10am.",
      "Perfect quiet space for focused reading and research. Extensive collection and helpful staff. The architecture is beautiful too.",
      "Peaceful walking path along the river. Great for morning jogs or evening strolls. Well-maintained with beautiful scenery.",
      "Modern coworking space with all the amenities. Great networking opportunities and regular events. Excellent for productivity.",
      "Amazing restaurant with panoramic city views. The food is exceptional and the atmosphere is perfect for special occasions."
    ],
    structuredData: [
      { address: "123 Park Ave", city: "New York", coordinates: "40.7831,-73.9712", category: "Coffee Shop" },
      { address: "456 Main St", city: "Boston", coordinates: "42.3601,-71.0589", category: "Library" },
      { address: "789 River Rd", city: "Portland", coordinates: "45.5152,-122.6784", category: "Recreation" },
      { address: "321 Tech Blvd", city: "San Francisco", coordinates: "37.7749,-122.4194", category: "Coworking" },
      { address: "654 Summit Dr", city: "Denver", coordinates: "39.7392,-104.9903", category: "Restaurant" }
    ]
  },
  thing: {
    titles: [
      "MacBook Pro M2", "Notion Productivity App", "The Lean Startup Book", "Sony WH-1000XM4 Headphones",
      "Tesla Model 3", "iPhone 14 Pro", "Kindle Paperwhite", "Standing Desk Setup",
      "Mechanical Keyboard", "4K Monitor", "Fitness Tracker", "Espresso Machine"
    ],
    content: [
      "Excellent laptop for development work. The M2 chip provides incredible performance and battery life. Perfect for both coding and creative work.",
      "Game-changing productivity tool. The flexibility of databases, pages, and templates makes organizing information incredibly efficient.",
      "Essential reading for anyone interested in entrepreneurship. Provides practical frameworks for building successful startups.",
      "Outstanding noise-canceling headphones. Perfect for focus work in noisy environments. The sound quality is exceptional.",
      "Revolutionary electric vehicle. Impressive range, advanced autopilot features, and minimal maintenance requirements."
    ],
    structuredData: [
      { category: "Electronics", brand: "Apple", model: "MacBook Pro M2", price: "$1999" },
      { category: "Software", brand: "Notion Labs", model: "Notion", price: "$10/month" },
      { category: "Book", brand: "Eric Ries", model: "The Lean Startup", price: "$15" },
      { category: "Electronics", brand: "Sony", model: "WH-1000XM4", price: "$349" },
      { category: "Vehicle", brand: "Tesla", model: "Model 3", price: "$42990" }
    ]
  }
};

async function generateSampleEntries() {
  const client = await pool.connect();
  
  try {
    console.log('Starting to generate 500 sample entries...');
    
    // Get the first user ID
    const userResult = await client.query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      throw new Error('No users found in database');
    }
    const userId = userResult.rows[0].id;
    
    const types = ['journal', 'note', 'person', 'place', 'thing'];
    const entriesPerType = 100; // 500 total entries
    
    for (const type of types) {
      console.log(`Creating ${entriesPerType} ${type} entries...`);
      
      for (let i = 0; i < entriesPerType; i++) {
        const typeData = sampleData[type];
        const titleIndex = i % typeData.titles.length;
        const contentIndex = i % typeData.content.length;
        
        const title = typeData.titles[titleIndex] + (i > typeData.titles.length - 1 ? ` ${Math.floor(i / typeData.titles.length) + 1}` : '');
        const content = typeData.content[contentIndex];
        
        // Generate a date within the last 6 months
        const now = new Date();
        const monthsAgo = Math.floor(Math.random() * 6);
        const daysAgo = Math.floor(Math.random() * 30);
        const entryDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, now.getDate() - daysAgo);
        
        let structuredData = {};
        if (typeData.structuredData) {
          const structIndex = i % typeData.structuredData.length;
          structuredData = typeData.structuredData[structIndex];
        }
        
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
    
    console.log('Successfully created 500 sample entries!');
    
    // Show summary
    const summary = await client.query(`
      SELECT type, COUNT(*) as count 
      FROM entries 
      WHERE user_id = $1 
      GROUP BY type 
      ORDER BY type
    `, [userId]);
    
    console.log('\nEntry summary:');
    summary.rows.forEach(row => {
      console.log(`${row.type}: ${row.count} entries`);
    });
    
  } catch (error) {
    console.error('Error creating sample entries:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

generateSampleEntries();