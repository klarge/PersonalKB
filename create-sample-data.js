// Script to create sample entries via API
const entries = [
  // Journal Entries
  {title: 'Monday Morning Reflections', content: 'Started the week with a long walk in the park. The autumn leaves are beginning to change color, creating a beautiful tapestry of reds and golds. I have been thinking about the upcoming project deadlines and how to better manage my time. There is something peaceful about the early morning hours when the world is still quiet. #productivity #nature #reflection', type: 'journal', date: '2024-10-15'},
  {title: 'Weekend Adventures', content: 'Spent Saturday exploring the farmers market downtown. Found some incredible heirloom tomatoes and had a great conversation with the vendor about sustainable farming practices. Later visited the art museums new contemporary exhibit. The interactive installations were thought-provoking. #weekends #art #local', type: 'journal', date: '2024-10-12'},
  {title: 'Technology Thoughts', content: 'Been reading about the latest developments in AI and machine learning. It is fascinating how rapidly the field is evolving. The potential applications seem endless, but I am also mindful of the ethical considerations. Need to dive deeper into the research papers. #technology #ai #learning', type: 'journal', date: '2024-10-08'},
  {title: 'Cooking Experiment', content: 'Tried making homemade pasta from scratch today. The process was more involved than expected, but incredibly satisfying. The texture was perfect, and paired beautifully with the simple tomato sauce. Definitely want to experiment more with Italian cuisine. #cooking #food #italian', type: 'journal', date: '2024-10-05'},
  {title: 'Book Club Discussion', content: 'Had an engaging discussion about The Seven Husbands of Evelyn Hugo at book club tonight. Everyone had different interpretations of the characters motivations. Sarah brought up some excellent points about unreliable narrators. Looking forward to next months selection. #books #discussion #friends', type: 'journal', date: '2024-10-02'},

  // Quick Notes  
  {title: 'Meeting Notes - Q4 Planning', content: 'Key decisions from todays planning meeting:\n- Budget increase for marketing campaigns\n- New hire for the design team by November\n- Focus on mobile optimization\n- Quarterly review scheduled for December 15th\n\nAction items: Follow up with HR about job posting, review mobile analytics', type: 'note', date: '2024-10-16'},
  {title: 'Gift Ideas', content: 'Birthday gift ideas for Mom:\n- That ceramic workshop she mentioned\n- New gardening gloves and tools\n- Subscription to her favorite magazine\n- Weekend trip to the coast\n\nNeed to decide by next week!', type: 'note', date: '2024-10-14'},
  {title: 'Research Topics', content: 'Topics to explore for the sustainability project:\n- Carbon footprint tracking methods\n- Renewable energy adoption rates\n- Waste reduction strategies in offices\n- Employee engagement in green initiatives\n\nStart with the carbon footprint analysis', type: 'note', date: '2024-10-11'},
  {title: 'Travel Checklist', content: 'Things to remember for the business trip:\n- Print boarding passes\n- Pack phone charger\n- Bring presentation materials\n- Confirm hotel reservation\n- Check weather forecast\n- Download offline maps', type: 'note', date: '2024-10-09'},
  {title: 'Recipe Ideas', content: 'New recipes to try this month:\n- Thai green curry with vegetables\n- Sourdough bread (finally!)\n- Chocolate chip cookies from scratch\n- Mushroom risotto\n- Greek lemon soup\n\nStart with the curry this weekend', type: 'note', date: '2024-10-07'},

  // People
  {title: 'Dr. Sarah Martinez', content: 'Met Sarah at the medical conference last month. She is doing groundbreaking research in neurology and has been incredibly helpful in understanding the latest treatment protocols. Very knowledgeable about brain imaging techniques. We discussed potential collaboration opportunities.', type: 'person', date: '2024-10-16', name: 'Dr. Sarah Martinez', email: 'sarah.martinez@medical.edu', phone: '(555) 123-4567', address: '1200 University Ave, Medical Center', dateOfBirth: '1985-03-15', company: 'University Medical Center', position: 'Research Neurologist', notes: 'Specializes in brain imaging, interested in collaboration'},
  {title: 'Marcus Thompson', content: 'Marcus is our lead developer who joined the team six months ago. Exceptional skills in full-stack development, particularly strong with React and Node.js. Always willing to help others and has great problem-solving abilities. Organized the recent team hackathon.', type: 'person', date: '2024-10-15', name: 'Marcus Thompson', email: 'marcus.t@company.com', phone: '(555) 234-5678', address: '456 Tech Street, Downtown', dateOfBirth: '1990-08-22', company: 'TechCorp Solutions', position: 'Senior Developer', notes: 'Full-stack expert, great mentor, hackathon organizer'},
  {title: 'Elena Rodriguez', content: 'Elena runs the local coffee shop where I work most mornings. She has been in business for over 10 years and has built an amazing community hub. Her espresso is the best in the city, and she remembers everyones order. Very passionate about supporting local artists.', type: 'person', date: '2024-10-13', name: 'Elena Rodriguez', email: 'elena@coffeelife.com', phone: '(555) 345-6789', address: '789 Main Street, Coffee District', dateOfBirth: '1978-11-30', company: 'Coffee Life Café', position: 'Owner', notes: 'Amazing coffee, supports local artists, community builder'},
  {title: 'Prof. David Chen', content: 'My former professor who now works as a consultant. David has incredible insights into market analysis and strategic planning. He has published several papers on consumer behavior and is always up for discussing new business concepts over dinner.', type: 'person', date: '2024-10-10', name: 'Prof. David Chen', email: 'dchen@business.edu', phone: '(555) 456-7890', address: '321 Academic Way, University District', dateOfBirth: '1972-06-12', company: 'Business Consulting Group', position: 'Senior Consultant', notes: 'Market analysis expert, published researcher, great mentor'},
  {title: 'Lisa Park', content: 'Lisa is my neighbor and an excellent graphic designer. She freelances for various tech companies and has a great eye for user interface design. Recently helped me with some design questions for a side project. Very creative and always experimenting with new tools.', type: 'person', date: '2024-10-08', name: 'Lisa Park', email: 'lisa.park.design@gmail.com', phone: '(555) 567-8901', address: '654 Residential Lane, Suburb', dateOfBirth: '1988-01-18', company: 'Freelance', position: 'Graphic Designer', notes: 'UI/UX specialist, creative, helpful neighbor'},

  // Places
  {title: 'Central Library', content: 'The main branch of our city library system. Incredible architecture with high ceilings and natural light flooding through large windows. The third floor has the best quiet study spaces, and they have an excellent collection of design and technology books. Free wifi and plenty of power outlets.', type: 'place', date: '2024-10-16', address: '100 Library Avenue, Downtown', website: 'www.citylibrary.org', phone: '(555) 111-2222', hours: 'Mon-Thu: 9am-9pm, Fri-Sat: 9am-6pm, Sun: 1pm-5pm', notes: 'Third floor best for studying, excellent design book collection'},
  {title: 'Mountain View Trail', content: 'A 3-mile hiking trail that offers stunning views of the valley below. The trail is well-maintained with clear markers every quarter mile. Best visited in the early morning when it is cooler and wildlife is more active. The viewpoint at the summit has benches and a small shelter.', type: 'place', date: '2024-10-14', address: 'Trail Head: 500 Forest Road, Mountain Park', website: 'www.mountainpark.gov', phone: '(555) 222-3333', hours: 'Dawn to Dusk', notes: '3-mile trail, best in early morning, summit viewpoint has shelter'},
  {title: 'Artisan Bakery', content: 'Small family-owned bakery that makes the most incredible sourdough bread. They use traditional techniques and source flour from local farms. The croissants are flaky perfection, and their seasonal fruit tarts are outstanding. Limited seating but worth the wait.', type: 'place', date: '2024-10-12', address: '234 Baker Street, Historic District', website: 'www.artisanbakery.com', phone: '(555) 333-4444', hours: 'Tue-Sun: 7am-3pm, Closed Mondays', notes: 'Amazing sourdough, traditional techniques, seasonal specialties'},
  {title: 'Innovation Hub', content: 'A co-working space and startup incubator downtown. Modern facilities with flexible workspace options, meeting rooms, and event spaces. Regular networking events and workshops. The community is very collaborative and supportive. Great coffee bar on the second floor.', type: 'place', date: '2024-10-10', address: '888 Innovation Drive, Business District', website: 'www.innovationhub.co', phone: '(555) 444-5555', hours: '24/7 for members, Office hours: Mon-Fri 8am-6pm', notes: 'Co-working space, networking events, collaborative community'},
  {title: 'Sunset Beach', content: 'A peaceful stretch of coastline perfect for evening walks and watching the sunset. Less crowded than the main beaches, with tide pools to explore at low tide. The nearby parking is free, and there are picnic tables available. Great spot for reflection and photography.', type: 'place', date: '2024-10-08', address: 'Coastal Highway Mile Marker 15', website: 'www.coastalparks.gov', phone: '(555) 555-6666', hours: 'Sunrise to Sunset', notes: 'Peaceful, tide pools, free parking, great for sunset photography'},

  // Things
  {title: 'Standing Desk', content: 'Electric height-adjustable desk that has transformed my work setup. Smooth transition between sitting and standing positions with memory presets. The desktop is spacious enough for dual monitors and has built-in cable management. Significantly improved my posture and energy levels during long work sessions.', type: 'thing', date: '2024-10-16', category: 'Office Furniture', brand: 'ErgoDesk Pro', model: 'ED-2000', purchaseDate: '2024-09-15', warrantyInfo: '5-year warranty, expires 2029-09-15', manualLink: 'www.ergodesk.com/manuals/ed2000', notes: 'Memory presets: sitting 28", standing 42", great cable management'},
  {title: 'Coffee Grinder', content: 'Burr grinder that produces consistently sized grounds for perfect coffee extraction. Much quieter than my previous blade grinder and the results are noticeably better. Easy to clean and adjust for different brewing methods. Essential tool for my morning coffee routine.', type: 'thing', date: '2024-10-14', category: 'Kitchen Appliances', brand: 'BrewMaster', model: 'BM-500', purchaseDate: '2024-08-20', warrantyInfo: '2-year warranty, expires 2026-08-20', manualLink: 'www.brewmaster.com/support/bm500', notes: 'Burr grinder, quiet operation, adjustable grind size'},
  {title: 'Wireless Headphones', content: 'Excellent noise-canceling headphones perfect for both work calls and music. Battery life easily lasts a full day, and the quick charge feature is incredibly convenient. Comfortable for extended wear and the sound quality is exceptional across all frequencies.', type: 'thing', date: '2024-10-12', category: 'Electronics', brand: 'SoundMax', model: 'SM-NC300', purchaseDate: '2024-07-10', warrantyInfo: '1-year warranty, expires 2025-07-10', manualLink: 'www.soundmax.com/manuals/nc300', notes: 'Noise-canceling, 24-hour battery, quick charge feature'},
  {title: 'Mechanical Keyboard', content: 'Tactile switches provide excellent typing feedback without being too loud for the office. The build quality is solid with a metal frame, and the key layout is perfect for programming. RGB lighting can be customized but I usually keep it minimal.', type: 'thing', date: '2024-10-10', category: 'Computer Accessories', brand: 'TypeCraft', model: 'TC-87', purchaseDate: '2024-06-05', warrantyInfo: '2-year warranty, expires 2026-06-05', manualLink: 'www.typecraft.com/support/tc87', notes: 'Tactile switches, metal frame, customizable RGB, great for programming'},
  {title: 'Plant Humidifier', content: 'Small ultrasonic humidifier specifically for maintaining optimal humidity around my houseplants. Quiet operation and the mist output is adjustable. Has made a noticeable difference in plant health, especially during dry winter months. Easy to refill and clean.', type: 'thing', date: '2024-10-08', category: 'Home & Garden', brand: 'PlantCare', model: 'PC-200', purchaseDate: '2024-05-15', warrantyInfo: '1-year warranty, expires 2025-05-15', manualLink: 'www.plantcare.com/manuals/pc200', notes: 'Ultrasonic, adjustable mist, quiet operation, great for plant health'}
];

async function createEntries() {
  console.log('Creating sample entries...');
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    try {
      const response = await fetch('http://localhost:5000/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'connect.sid=your-session-id' // This would need to be set properly
        },
        body: JSON.stringify(entry)
      });
      
      if (response.ok) {
        const created = await response.json();
        console.log(`Created entry ${i + 1}/${entries.length}: ${entry.title}`);
      } else {
        console.log(`Failed to create entry: ${entry.title} - ${response.status}`);
      }
    } catch (error) {
      console.log(`Error creating entry: ${entry.title} - ${error.message}`);
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('Finished creating sample entries');
}

createEntries();