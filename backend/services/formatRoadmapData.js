// Helper function to format scraped roadmap data
export const formatRoadmapData = (roadmapName, rawData) => {
  const getIconForRoadmap = (slug) => {
    const iconMap = {
      'frontend': '🎨',
      'backend': '⚙️',
      'devops': '🔧',
      'react': '⚛️',
      'nodejs': '🟢',
      'android': '🤖',
      'qa': '🧪',
      'blockchain': '⛓️',
      'python': '🐍',
      'go': '🐹',
      'vue': '💚',
      'angular': '🅰️',
      'java': '☕',
      'typescript': '📘',
      'docker': '🐳',
      'postgresql': '🐘',
      'mongodb': '🍃',
      'cyber-security': '🔒',
      'ai': '🤖',
      'data-science': '📊',
      'flutter': '💙',
      'ios': '📱',
      'game-dev': '🎮',
      'product-manager': '📋'
    };
    return iconMap[slug] || '🛣️';
  };

  try {
    // Extract basic information
    const name = rawData.title || roadmapName.charAt(0).toUpperCase() + roadmapName.slice(1).replace('-', ' ');
    const description = rawData.description || `Complete ${name} learning path with comprehensive modules and resources`;
    const icon = getIconForRoadmap(roadmapName);
    
    // Extract milestones from different possible data structures
    let milestones = [];
    
    if (rawData.nodes && Array.isArray(rawData.nodes)) {
      // roadmap.sh format with nodes
      milestones = rawData.nodes
        .filter(node => node.type === 'topic' && node.title)
        .slice(0, 5) // Limit to 5 milestones
        .map((node, index) => ({
          title: node.title,
          description: node.description || `Learn ${node.title} concepts and implementation`,
          skills: extractSkills(node),
          resources: extractResources(node),
          estimatedTime: estimateTime(node.title),
          orderIndex: index
        }));
    } else if (rawData.topics && Array.isArray(rawData.topics)) {
      // Alternative format with topics
      milestones = rawData.topics
        .slice(0, 5)
        .map((topic, index) => ({
          title: topic.name || topic.title,
          description: topic.description || `Master ${topic.name || topic.title} fundamentals`,
          skills: topic.skills || extractSkillsFromTitle(topic.name || topic.title),
          resources: topic.resources || generateDefaultResources(topic.name || topic.title),
          estimatedTime: topic.duration || estimateTime(topic.name || topic.title),
          orderIndex: index
        }));
    } else if (rawData.sections && Array.isArray(rawData.sections)) {
      // Format with sections
      milestones = rawData.sections
        .slice(0, 5)
        .map((section, index) => ({
          title: section.title,
          description: section.description || `Complete ${section.title} learning module`,
          skills: section.skills || extractSkillsFromTitle(section.title),
          resources: section.resources || generateDefaultResources(section.title),
          estimatedTime: section.estimatedTime || estimateTime(section.title),
          orderIndex: index
        }));
    }
    
    // If no milestones found, generate default ones
    if (milestones.length === 0) {
      milestones = generateDefaultMilestones(roadmapName);
    }

    return {
      name,
      description,
      icon,
      difficulty: rawData.difficulty || getDifficultyForRoadmap(roadmapName),
      estimatedDuration: rawData.estimatedDuration || getEstimatedDuration(roadmapName),
      milestones
    };
  } catch (error) {
    console.error(`Error formatting roadmap data for ${roadmapName}:`, error);
    return generateFallbackRoadmap(roadmapName);
  }
};

const extractSkills = (node) => {
  if (node.skills && Array.isArray(node.skills)) {
    return node.skills;
  }
  
  if (node.children && Array.isArray(node.children)) {
    return node.children
      .filter(child => child.title)
      .map(child => child.title)
      .slice(0, 5);
  }
  
  return extractSkillsFromTitle(node.title);
};

const extractSkillsFromTitle = (title) => {
  const skillMaps = {
    'frontend': ['HTML5', 'CSS3', 'JavaScript', 'React', 'Responsive Design'],
    'backend': ['Node.js', 'Express.js', 'Databases', 'APIs', 'Authentication'],
    'devops': ['Docker', 'Kubernetes', 'CI/CD', 'Cloud Services', 'Monitoring'],
    'react': ['JSX', 'Components', 'Hooks', 'State Management', 'React Router'],
    'nodejs': ['Express.js', 'NPM', 'Async/Await', 'File System', 'HTTP Modules'],
    'python': ['Syntax', 'Data Structures', 'Libraries', 'OOP', 'Error Handling'],
    'javascript': ['ES6+', 'DOM Manipulation', 'Promises', 'Async/Await', 'Modules']
  };
  
  const lowerTitle = title.toLowerCase();
  for (const [key, skills] of Object.entries(skillMaps)) {
    if (lowerTitle.includes(key)) {
      return skills;
    }
  }
  
  return [title, 'Best Practices', 'Implementation', 'Testing', 'Optimization'];
};

const extractResources = (node) => {
  if (node.resources && Array.isArray(node.resources)) {
    return node.resources.map(resource => ({
      name: resource.title || resource.name,
      url: resource.url || resource.link
    }));
  }
  
  return generateDefaultResources(node.title);
};

const generateDefaultResources = (title) => {
  const resourceMaps = {
    'html': [
      { name: 'MDN HTML Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML' },
      { name: 'HTML5 Tutorial', url: 'https://www.w3schools.com/html/' }
    ],
    'css': [
      { name: 'CSS Tricks', url: 'https://css-tricks.com/' },
      { name: 'MDN CSS Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/CSS' }
    ],
    'javascript': [
      { name: 'JavaScript.info', url: 'https://javascript.info/' },
      { name: 'Eloquent JavaScript', url: 'https://eloquentjavascript.net/' }
    ],
    'react': [
      { name: 'React Documentation', url: 'https://react.dev/' },
      { name: 'React Tutorial', url: 'https://react.dev/learn' }
    ],
    'node': [
      { name: 'Node.js Documentation', url: 'https://nodejs.org/en/docs/' },
      { name: 'Express.js Guide', url: 'https://expressjs.com/' }
    ]
  };
  
  const lowerTitle = title.toLowerCase();
  for (const [key, resources] of Object.entries(resourceMaps)) {
    if (lowerTitle.includes(key)) {
      return resources;
    }
  }
  
  return [
    { name: `${title} Documentation`, url: `https://www.google.com/search?q=${encodeURIComponent(title + ' documentation')}` },
    { name: `${title} Tutorial`, url: `https://www.google.com/search?q=${encodeURIComponent(title + ' tutorial')}` }
  ];
};

const estimateTime = (title) => {
  const timeMap = {
    'fundamentals': '2-3 weeks',
    'basics': '2-3 weeks',
    'advanced': '4-6 weeks',
    'introduction': '1-2 weeks',
    'deep dive': '3-4 weeks',
    'mastery': '4-5 weeks',
    'project': '2-4 weeks'
  };
  
  const lowerTitle = title.toLowerCase();
  for (const [key, time] of Object.entries(timeMap)) {
    if (lowerTitle.includes(key)) {
      return time;
    }
  }
  
  return '2-4 weeks';
};

const getDifficultyForRoadmap = (roadmapName) => {
  const difficultyMap = {
    'frontend': 'Beginner to Intermediate',
    'backend': 'Intermediate',
    'devops': 'Advanced',
    'react': 'Intermediate',
    'nodejs': 'Intermediate',
    'python': 'Beginner to Intermediate',
    'javascript': 'Beginner to Advanced',
    'blockchain': 'Advanced',
    'ai': 'Advanced',
    'data-science': 'Intermediate to Advanced'
  };
  
  return difficultyMap[roadmapName] || 'Intermediate';
};

const getEstimatedDuration = (roadmapName) => {
  const durationMap = {
    'frontend': '4-6 months',
    'backend': '5-7 months',
    'devops': '6-9 months',
    'react': '3-4 months',
    'nodejs': '3-5 months',
    'python': '4-6 months',
    'javascript': '3-5 months',
    'blockchain': '6-8 months',
    'ai': '8-12 months',
    'data-science': '6-10 months'
  };
  
  return durationMap[roadmapName] || '4-6 months';
};

const generateDefaultMilestones = (roadmapName) => {
  const milestoneTemplates = {
    'frontend': [
      {
        title: 'HTML & CSS Fundamentals',
        description: 'Learn the building blocks of web development',
        skills: ['HTML5', 'CSS3', 'Flexbox', 'Grid', 'Responsive Design'],
        resources: [
          { name: 'MDN HTML Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML' },
          { name: 'CSS Tricks', url: 'https://css-tricks.com/' }
        ],
        estimatedTime: '2-3 weeks',
        orderIndex: 0
      },
      {
        title: 'JavaScript Essentials',
        description: 'Master JavaScript fundamentals and ES6+ features',
        skills: ['JavaScript', 'ES6+', 'DOM Manipulation', 'Async/Await', 'Promises'],
        resources: [
          { name: 'JavaScript.info', url: 'https://javascript.info/' },
          { name: 'Eloquent JavaScript', url: 'https://eloquentjavascript.net/' }
        ],
        estimatedTime: '3-4 weeks',
        orderIndex: 1
      }
    ],
    'backend': [
      {
        title: 'Server-Side Fundamentals',
        description: 'Learn backend development concepts and architecture',
        skills: ['HTTP', 'REST APIs', 'Databases', 'Authentication', 'Security'],
        resources: [
          { name: 'Backend Development Guide', url: 'https://roadmap.sh/backend' },
          { name: 'API Design Best Practices', url: 'https://restfulapi.net/' }
        ],
        estimatedTime: '3-4 weeks',
        orderIndex: 0
      }
    ]
  };
  
  return milestoneTemplates[roadmapName] || [
    {
      title: `${roadmapName.charAt(0).toUpperCase() + roadmapName.slice(1)} Fundamentals`,
      description: `Learn the core concepts and fundamentals of ${roadmapName}`,
      skills: [`${roadmapName} Basics`, 'Best Practices', 'Implementation', 'Testing'],
      resources: [
        { name: `${roadmapName} Documentation`, url: `https://www.google.com/search?q=${roadmapName}+documentation` }
      ],
      estimatedTime: '3-4 weeks',
      orderIndex: 0
    }
  ];
};

const generateFallbackRoadmap = (roadmapName) => {
  return {
    name: roadmapName.charAt(0).toUpperCase() + roadmapName.slice(1).replace('-', ' '),
    description: `Complete ${roadmapName} learning path with structured modules`,
    icon: '🛣️',
    difficulty: 'Intermediate',
    estimatedDuration: '4-6 months',
    milestones: generateDefaultMilestones(roadmapName)
  };
};
