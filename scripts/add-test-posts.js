const mongoose = require('mongoose');
const Post = require('../src/models/Post');
const User = require('../src/models/User');

const testContent = [
  'Just finished working on an amazing React project! 🚀',
  'Learning WebRTC for real-time communication. Exciting stuff!',
  'Code review tips for junior developers:\n1. Be kind and constructive\n2. Focus on the code, not the person\n3. Suggest improvements\n4. Acknowledge good practices',
  'Finally deployed my first production app. Years of learning paying off!',
  'Debug story: Spent 2 hours finding a typo. Remember to check console logs! 😅',
  'Best practices for MongoDB schema design:\n- Plan your queries first\n- Use indexes wisely\n- Denormalize when needed\n- Monitor performance',
  'Working on a mentorship platform connecting senior devs with juniors. Come join!',
  'JavaScript async/await vs promises - which do you prefer and why?',
  'Hot take: CSS is actually easier when you understand flexbox properly',
  'Just learned about WebSocket vs REST APIs. Game changer for real-time apps!',
  'Contributing to open source for the first time. A bit nervous but excited!',
  'Test-driven development changed how I write code. Write tests first!',
  'GraphQL vs REST - pros and cons in my experience',
  'Database optimization tips that saved us 10x query time',
  'Refactoring legacy code is like archaeology - what stories does it tell?',
];

async function addTestPosts() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/devlink', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Get a user to create posts for
    let user = await User.findOne();
    if (!user) {
      console.log('No user found. Creating test user...');
      user = new User({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'hashed_password',
      });
      await user.save();
    }

    console.log(`Using user: ${user.firstName} ${user.lastName}`);

    // Create test posts
    for (let i = 0; i < testContent.length; i++) {
      const post = new Post({
        author: user._id,
        content: testContent[i],
        media: [],
        likes: [],
        comments: [],
      });
      await post.save();
      console.log(`✅ Created post ${i + 1}/${testContent.length}`);
    }

    console.log('✅ All test posts created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

addTestPosts();
