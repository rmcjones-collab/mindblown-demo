/*! MindBlown — © 2026 Rory Jones. All rights reserved. Source-available under the PolyForm Strict License 1.0.0 (see LICENSE.md); no copying, modification, redistribution or commercial use without written permission. */
/* MindBlown: Build — default categories, question bank and templates.
   Everything here is a starting point; the user can disable, edit, add to or replace it in the app. */
window.MINDBLOWN_BUILD = {
  // Category ids are stable; names and colours can be edited by the user. "you" is the centre.
  categories: [
    { id: 'you',      name: 'Identity',               color: '#ff8a3d' },
    { id: 'people',   name: 'People & Family',        color: '#f472b6' },
    { id: 'places',   name: 'Home & Places',          color: '#4fd1c5' },
    { id: 'work',     name: 'Work & Career',          color: '#60a5fa' },
    { id: 'learning', name: 'Learning & Skills',      color: '#a78bfa' },
    { id: 'body',     name: 'Body & Health',          color: '#34d399' },
    { id: 'mind',     name: 'Mind & Beliefs',         color: '#c084fc' },
    { id: 'play',     name: 'Hobbies & Play',         color: '#fbbf24' },
    { id: 'taste',    name: 'Taste',                  color: '#fb7185' },
    { id: 'money',    name: 'Money & Things',         color: '#86efac' },
    { id: 'travel',   name: 'Travel & Adventure',     color: '#38bdf8' },
    { id: 'memories', name: 'Memories & Milestones',  color: '#f9a8d4' },
    { id: 'rhythm',   name: 'Daily Life',             color: '#fcd34d' },
    { id: 'goals',    name: 'Goals & Dreams',         color: '#fb923c' },
    { id: 'creative', name: 'Creative Work',          color: '#e879f9' },
    { id: 'digital',  name: 'Digital Life',           color: '#22d3ee' },
    { id: 'pets',     name: 'Pets & Animals',         color: '#a3e635' },
  ],

  // Extra colours handed to user-made categories, in order.
  palette: ['#f59e0b', '#2dd4bf', '#818cf8', '#f43f5e', '#84cc16', '#06b6d4', '#d946ef', '#eab308', '#10b981', '#3b82f6', '#ef4444', '#a855f7'],

  /* Questions.
     cat      category id
     sub      neuron (subject) the answer lands on; "{name}" is replaced with the user's name
     type     text | long | list | choice | date | files
     list     answers are split into items; each item becomes its own neuron inside the category
     then     follow-up questions, asked soon after. "{item}" refers to a spawned neuron, "{answer}" to the answer text
     options  for choice questions
     first    asked before anything else (the name question) */
  questions: [
    // identity
    { id: 'name', cat: 'you', sub: 'Me', type: 'text', first: true, text: 'Hello. I am going to help you build a brain, one question at a time. What should I call you?' },
    { id: 'you.pronounce', cat: 'you', sub: 'Me', type: 'text', text: 'Nice to meet you, {name}. Is there a longer or different version of your name people use, and how do you like it pronounced?' },
    { id: 'you.birthday', cat: 'you', sub: 'Birthday', type: 'date', text: 'When were you born?' },
    { id: 'you.roots', cat: 'you', sub: 'Roots', type: 'long', text: 'Where are you from originally, and where does your family come from before that?' },
    { id: 'you.words', cat: 'you', sub: 'Me', type: 'list', list: false, text: 'If a friend had to describe you in three words, what would they say?' },
    { id: 'you.languages', cat: 'you', sub: 'Languages', type: 'list', text: 'Which languages do you speak, even a little?' },
    { id: 'you.live', cat: 'you', sub: 'Me', type: 'text', text: 'Where do you live these days, {name}?' },
    { id: 'you.title', cat: 'you', sub: 'Me', type: 'text', text: 'How do you introduce yourself when someone asks what you do?' },

    // people
    { id: 'people.closest', cat: 'people', sub: '', type: 'list', list: true, text: 'Who are the people closest to you? Give me first names, separated by commas, and I will make a neuron for each.',
      then: ['How do you know {item}, and what is your relationship like today?', 'What is one thing {item} would say about you?'] },
    { id: 'people.parents', cat: 'people', sub: 'Parents', type: 'long', text: 'Tell me about your parents. What are they like, and what did you pick up from them?' },
    { id: 'people.siblings', cat: 'people', sub: 'Siblings', type: 'long', text: 'Do you have brothers or sisters? Tell me about them.' },
    { id: 'people.kids', cat: 'people', sub: '', type: 'list', list: true, text: 'Do you have children? If so, what are their names?', then: ['Tell me about {item}. What are they into right now?', 'What is your favourite thing to do with {item}?'] },
    { id: 'people.partner', cat: 'people', sub: 'Partner', type: 'long', text: 'Is there a partner in your life, now or in the past, who shaped it? Tell me what you want remembered.' },
    { id: 'people.friends', cat: 'people', sub: '', type: 'list', list: true, text: 'Who are your oldest friends?', then: ['How did you and {item} meet?'] },
    { id: 'people.mentor', cat: 'people', sub: 'Mentors', type: 'long', text: 'Who has been a mentor or guide for you, officially or not?' },
    { id: 'people.lost', cat: 'people', sub: 'People I miss', type: 'long', text: 'Is there someone you have lost who you would like to keep a place for here?' },
    { id: 'people.traditions', cat: 'people', sub: 'Traditions', type: 'long', text: 'What family traditions, holidays or rituals matter in your house?' },

    // places
    { id: 'places.home', cat: 'places', sub: 'Home', type: 'long', text: 'Describe your home. What is it like, and what makes it yours?' },
    { id: 'places.hometown', cat: 'places', sub: 'Hometown', type: 'long', text: 'What was the place you grew up in like?' },
    { id: 'places.lived', cat: 'places', sub: '', type: 'list', list: true, text: 'Which cities or towns have you lived in?', then: ['What took you to {item}, and what do you remember most about living there?'] },
    { id: 'places.neighbourhood', cat: 'places', sub: 'Neighbourhood', type: 'long', text: 'What is your neighbourhood like, and where do you go around it?' },
    { id: 'places.room', cat: 'places', sub: 'Favourite spot', type: 'text', text: 'Where is your favourite spot at home, and what do you do there?' },
    { id: 'places.spots', cat: 'places', sub: '', type: 'list', list: true, text: 'Name a few places nearby you love: a cafe, a park, a shop, a trail.', then: ['What keeps you going back to {item}?'] },
    { id: 'places.dream', cat: 'places', sub: 'Dream home', type: 'long', text: 'If you could live anywhere, where would it be and why?' },
    { id: 'places.photos', cat: 'places', sub: 'Home', type: 'files', text: 'Would you like to add a few photos of your home or your favourite places?' },

    // work
    { id: 'work.now', cat: 'work', sub: 'Current work', type: 'long', text: 'What do you do for work right now, and what does a typical day involve?' },
    { id: 'work.path', cat: 'work', sub: 'Career path', type: 'long', text: 'How did you get into this line of work? Walk me through the path.' },
    { id: 'work.jobs', cat: 'work', sub: '', type: 'list', list: true, text: 'What jobs or roles have you held over the years? List them and I will give each its own neuron.', then: ['What did you learn at {item}?'] },
    { id: 'work.proud', cat: 'work', sub: 'Proud work', type: 'long', text: 'What piece of work are you proudest of?' },
    { id: 'work.hard', cat: 'work', sub: 'Hard lessons', type: 'long', text: 'What was the hardest thing you have dealt with at work, and what came out of it?' },
    { id: 'work.tools', cat: 'work', sub: 'Tools of the trade', type: 'list', list: true, text: 'What tools, gear or software do you rely on at work?' },
    { id: 'work.colleagues', cat: 'work', sub: '', type: 'list', list: true, text: 'Who do you work with most, past or present?', then: ['What is it like working with {item}?'] },
    { id: 'work.side', cat: 'work', sub: 'Side projects', type: 'long', text: 'Any side businesses, freelancing or projects outside the main job?' },
    { id: 'work.docs', cat: 'work', sub: 'Current work', type: 'files', text: 'Do you have a resume, portfolio or certificates you want stored here?' },

    // learning
    { id: 'learning.school', cat: 'learning', sub: 'School', type: 'long', text: 'Where did you go to school, and what did you study?' },
    { id: 'learning.teacher', cat: 'learning', sub: 'Teachers', type: 'long', text: 'Was there a teacher who changed how you think?' },
    { id: 'learning.skills', cat: 'learning', sub: '', type: 'list', list: true, text: 'What skills are you good at? List as many as you like.', then: ['How did you learn {item}?'] },
    { id: 'learning.now', cat: 'learning', sub: 'Learning now', type: 'long', text: 'What are you trying to learn at the moment?' },
    { id: 'learning.want', cat: 'learning', sub: 'Want to learn', type: 'list', list: true, text: 'What would you love to learn if time was no object?' },
    { id: 'learning.certs', cat: 'learning', sub: 'Certifications', type: 'list', list: true, text: 'Any licences, tickets or certifications you hold?' },
    { id: 'learning.books', cat: 'learning', sub: 'Books that taught me', type: 'long', text: 'Which book, course or video taught you the most?' },

    // body
    { id: 'body.move', cat: 'body', sub: 'Movement', type: 'long', text: 'How do you like to move your body: sports, walks, the gym, nothing at all?' },
    { id: 'body.sleep', cat: 'body', sub: 'Sleep', type: 'text', text: 'How is your sleep, honestly? When do you usually go to bed and get up?' },
    { id: 'body.food', cat: 'body', sub: 'Eating', type: 'long', text: 'How do you eat day to day? Any rules, allergies or things you avoid?' },
    { id: 'body.health', cat: 'body', sub: 'Health notes', type: 'long', text: 'Any health conditions, medications or history you want recorded for yourself?' },
    { id: 'body.doctor', cat: 'body', sub: 'Care team', type: 'list', list: true, text: 'Who looks after your health: doctor, dentist, therapist, trainer?' },
    { id: 'body.energy', cat: 'body', sub: 'Energy', type: 'text', text: 'When in the day do you have the most energy?' },
    { id: 'body.records', cat: 'body', sub: 'Health notes', type: 'files', text: 'Any health documents or records you want to keep here?' },

    // mind
    { id: 'mind.values', cat: 'mind', sub: 'Values', type: 'list', list: true, text: 'What values do you try to live by? A few words each is fine.', then: ['Where did {item} come from for you?'] },
    { id: 'mind.belief', cat: 'mind', sub: 'Beliefs', type: 'long', text: 'What do you believe about life, the universe or what matters? Faith, philosophy, or neither.' },
    { id: 'mind.stress', cat: 'mind', sub: 'Stress', type: 'long', text: 'What stresses you out, and what helps you come back down?' },
    { id: 'mind.happy', cat: 'mind', sub: 'Joy', type: 'long', text: 'What reliably makes you happy?' },
    { id: 'mind.fear', cat: 'mind', sub: 'Fears', type: 'long', text: 'What are you afraid of, big or small?' },
    { id: 'mind.changed', cat: 'mind', sub: 'Changed my mind', type: 'long', text: 'What is something you have changed your mind about?' },
    { id: 'mind.advice', cat: 'mind', sub: 'Advice', type: 'long', text: 'What is the best advice you have ever been given?' },
    { id: 'mind.personality', cat: 'mind', sub: 'Personality', type: 'choice', options: ['Introvert', 'Extrovert', 'Somewhere between', 'Depends on the day'], text: 'Where do you sit on the introvert to extrovert scale?' },

    // play
    { id: 'play.hobbies', cat: 'play', sub: '', type: 'list', list: true, text: 'What are your hobbies? List them and each becomes its own neuron.', then: ['How did you get into {item}?', 'What is the best thing that has come out of {item}?'] },
    { id: 'play.weekend', cat: 'play', sub: 'Weekends', type: 'long', text: 'What does a perfect weekend look like?' },
    { id: 'play.games', cat: 'play', sub: 'Games', type: 'list', list: true, text: 'Do you play games: board, video, cards, sport? Which ones?' },
    { id: 'play.collect', cat: 'play', sub: 'Collections', type: 'long', text: 'Do you collect anything?' },
    { id: 'play.outdoors', cat: 'play', sub: 'Outdoors', type: 'long', text: 'What do you like doing outdoors?' },
    { id: 'play.childhood', cat: 'play', sub: 'Childhood play', type: 'long', text: 'What did you love doing as a kid that you still love?' },
    { id: 'play.gear', cat: 'play', sub: 'Gear', type: 'files', text: 'Any photos of your hobby gear, projects or setups to keep here?' },

    // taste
    { id: 'taste.music', cat: 'taste', sub: 'Music', type: 'list', list: true, text: 'Which artists or bands do you come back to most?', then: ['What is your favourite {item} song or album, and when do you play it?'] },
    { id: 'taste.films', cat: 'taste', sub: 'Films & TV', type: 'list', list: true, text: 'What films or shows could you watch again and again?' },
    { id: 'taste.books', cat: 'taste', sub: 'Books', type: 'list', list: true, text: 'Favourite books or authors?' },
    { id: 'taste.food', cat: 'taste', sub: 'Food', type: 'list', list: true, text: 'What are your favourite foods or dishes?' },
    { id: 'taste.drink', cat: 'taste', sub: 'Drinks', type: 'text', text: 'What is your drink of choice: coffee, tea, something stronger, or none?' },
    { id: 'taste.style', cat: 'taste', sub: 'Style', type: 'long', text: 'How would you describe your personal style, in clothes and in the things you buy?' },
    { id: 'taste.guilty', cat: 'taste', sub: 'Guilty pleasures', type: 'text', text: 'Any guilty pleasures?' },
    { id: 'taste.podcasts', cat: 'taste', sub: 'Podcasts & creators', type: 'list', list: true, text: 'Which podcasts, channels or creators do you follow?' },

    // money
    { id: 'money.approach', cat: 'money', sub: 'Money mindset', type: 'long', text: 'How do you think about money? Saver, spender, planner, avoider?' },
    { id: 'money.accounts', cat: 'money', sub: 'Accounts', type: 'list', list: true, text: 'Which banks, cards or financial services do you use? Names only; never store numbers here.' },
    { id: 'money.subs', cat: 'money', sub: 'Subscriptions', type: 'list', list: true, text: 'What subscriptions are you paying for?' },
    { id: 'money.big', cat: 'money', sub: 'Big purchases', type: 'long', text: 'What is the biggest or best purchase you have made?' },
    { id: 'money.things', cat: 'money', sub: '', type: 'list', list: true, text: 'What possessions matter most to you?', then: ['What is the story behind {item}?'] },
    { id: 'money.vehicle', cat: 'money', sub: 'Vehicles', type: 'long', text: 'What do you drive or ride, if anything?' },
    { id: 'money.goals', cat: 'money', sub: 'Money goals', type: 'long', text: 'What are your money goals for the next few years?' },
    { id: 'money.docs', cat: 'money', sub: 'Documents', type: 'files', text: 'Any insurance, warranty or ownership documents you want filed here?' },

    // travel
    { id: 'travel.been', cat: 'travel', sub: '', type: 'list', list: true, text: 'Where have you travelled? List the places that stand out.', then: ['What do you remember most from {item}?'] },
    { id: 'travel.best', cat: 'travel', sub: 'Best trip', type: 'long', text: 'What was your best trip ever, and why?' },
    { id: 'travel.list', cat: 'travel', sub: 'Bucket list', type: 'list', list: true, text: 'Where do you still want to go?' },
    { id: 'travel.style', cat: 'travel', sub: 'Travel style', type: 'choice', options: ['Planned to the hour', 'Loose plan', 'Wing it', 'I would rather stay home'], text: 'How do you like to travel?' },
    { id: 'travel.with', cat: 'travel', sub: 'Travel companions', type: 'text', text: 'Who do you travel best with?' },
    { id: 'travel.photos', cat: 'travel', sub: 'Best trip', type: 'files', text: 'Add a few photos from a trip you want to remember?' },

    // memories
    { id: 'memories.early', cat: 'memories', sub: 'Earliest memory', type: 'long', text: 'What is your earliest memory?' },
    { id: 'memories.proud', cat: 'memories', sub: 'Proudest moment', type: 'long', text: 'What moment in your life are you proudest of?' },
    { id: 'memories.turning', cat: 'memories', sub: 'Turning points', type: 'long', text: 'What was a turning point that changed the direction of your life?' },
    { id: 'memories.milestones', cat: 'memories', sub: '', type: 'list', list: true, text: 'List some milestones: graduations, moves, births, launches, firsts.', then: ['Tell me about {item}. When was it, and who was there?'] },
    { id: 'memories.funny', cat: 'memories', sub: 'Funny stories', type: 'long', text: 'What is a story you tell at parties?' },
    { id: 'memories.hard', cat: 'memories', sub: 'Hard times', type: 'long', text: 'What was a hard chapter, and how did you get through it?' },
    { id: 'memories.photos', cat: 'memories', sub: 'Photo album', type: 'files', text: 'Would you like to add photos or scans that hold memories?' },

    // rhythm
    { id: 'rhythm.morning', cat: 'rhythm', sub: 'Mornings', type: 'long', text: 'Walk me through your morning routine.' },
    { id: 'rhythm.evening', cat: 'rhythm', sub: 'Evenings', type: 'long', text: 'How do your evenings usually go?' },
    { id: 'rhythm.week', cat: 'rhythm', sub: 'The week', type: 'long', text: 'What does a normal week look like for you?' },
    { id: 'rhythm.chores', cat: 'rhythm', sub: 'Chores', type: 'text', text: 'Which chores do you not mind, and which do you dread?' },
    { id: 'rhythm.commute', cat: 'rhythm', sub: 'Getting around', type: 'text', text: 'How do you get around day to day?' },
    { id: 'rhythm.habits', cat: 'rhythm', sub: 'Habits', type: 'list', list: true, text: 'What habits are you keeping, or trying to build or break?' },

    // goals
    { id: 'goals.year', cat: 'goals', sub: 'This year', type: 'long', text: 'What do you want to get done this year?' },
    { id: 'goals.five', cat: 'goals', sub: 'Five years', type: 'long', text: 'Where do you want to be in five years?' },
    { id: 'goals.bucket', cat: 'goals', sub: 'Bucket list', type: 'list', list: true, text: 'What is on your bucket list?' },
    { id: 'goals.dream', cat: 'goals', sub: 'Big dream', type: 'long', text: 'What is the big dream you do not say out loud much?' },
    { id: 'goals.legacy', cat: 'goals', sub: 'Legacy', type: 'long', text: 'How do you want to be remembered?' },
    { id: 'goals.blockers', cat: 'goals', sub: 'In the way', type: 'long', text: 'What is getting in the way right now?' },

    // creative
    { id: 'creative.make', cat: 'creative', sub: '', type: 'list', list: true, text: 'What do you make or create? Writing, music, code, builds, art, food, anything.', then: ['What is your favourite thing you have made in {item}?'] },
    { id: 'creative.projects', cat: 'creative', sub: '', type: 'list', list: true, text: 'Name your current projects, big or small.', then: ['What is {item} about, and what stage is it at?', 'What would finished look like for {item}?'] },
    { id: 'creative.process', cat: 'creative', sub: 'Process', type: 'long', text: 'How do you work when you are making something? Rituals, tools, time of day?' },
    { id: 'creative.influences', cat: 'creative', sub: 'Influences', type: 'list', list: true, text: 'Who or what influences your work?' },
    { id: 'creative.share', cat: 'creative', sub: 'Sharing work', type: 'text', text: 'Where do you share what you make, if anywhere?' },
    { id: 'creative.files', cat: 'creative', sub: 'Portfolio', type: 'files', text: 'Would you like to attach samples of your work?' },

    // digital
    { id: 'digital.devices', cat: 'digital', sub: 'Devices', type: 'list', list: true, text: 'What devices do you use every day?' },
    { id: 'digital.apps', cat: 'digital', sub: 'Apps', type: 'list', list: true, text: 'Which apps or services do you live in?' },
    { id: 'digital.social', cat: 'digital', sub: 'Online presence', type: 'long', text: 'Where do you exist online, and how do you use it?' },
    { id: 'digital.setup', cat: 'digital', sub: 'Setup', type: 'long', text: 'Describe your desk, workstation or setup.' },
    { id: 'digital.security', cat: 'digital', sub: 'Security habits', type: 'text', text: 'How do you handle passwords and backups? Describe the approach, never the secrets.' },
    { id: 'digital.files', cat: 'digital', sub: 'Setup', type: 'files', text: 'A photo of your setup, or config files you want to keep?' },

    // pets
    { id: 'pets.have', cat: 'pets', sub: '', type: 'list', list: true, text: 'Do you have pets? Tell me their names.', then: ['Tell me about {item}: breed, personality, quirks.', 'How did {item} come to live with you?'] },
    { id: 'pets.past', cat: 'pets', sub: 'Past pets', type: 'long', text: 'Were there animals in your life growing up?' },
    { id: 'pets.wild', cat: 'pets', sub: 'Animals I love', type: 'text', text: 'What is your favourite animal, and why?' },
    { id: 'pets.photos', cat: 'pets', sub: 'Pet photos', type: 'files', text: 'Pet photos belong here. Want to add some?' },
  ],

  // Templates used for categories the user creates ("{cat}" is the category name).
  categoryTemplates: [
    { type: 'long', text: 'Tell me about {cat}. What does it mean in your life right now?' },
    { type: 'long', text: 'How did {cat} become part of your life?' },
    { type: 'list', list: true, text: 'Who do you share {cat} with? Names, separated by commas.', then: ['How does {item} fit into {cat} for you?'] },
    { type: 'list', list: true, text: 'What are the main parts of {cat}? List them and each becomes a neuron.', then: ['Tell me more about {item}.'] },
    { type: 'long', text: 'What is a memory tied to {cat} that stands out?' },
    { type: 'long', text: 'What do you want {cat} to look like a year from now?' },
    { type: 'files', text: 'Any pictures or documents about {cat} you would like to keep here?' },
  ],

  // Templates used to go deeper on a neuron the user has starred ("{sub}" is the neuron name).
  subjectTemplates: [
    { type: 'long', text: 'What is the story behind {sub}?' },
    { type: 'long', text: 'What is something about {sub} that most people would not know?' },
    { type: 'text', text: 'When did {sub} last come up, and what happened?' },
    { type: 'long', text: 'How has {sub} changed over time?' },
    { type: 'files', text: 'Is there a photo or file that belongs with {sub}?' },
  ],

  acks: ['Got it.', 'Noted.', 'Thank you.', 'That is a new synapse.', 'Added.', 'Understood.', 'Saved to your brain.', 'Good to know.'],
};
