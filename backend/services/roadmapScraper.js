import axios from 'axios';
import { formatRoadmapData } from './formatRoadmapData.js';

const roadmapList = [
  // Role-based Roadmaps
  'frontend',
  'backend',
  'full-stack',
  'devops',
  'data-analyst',
  'ai-engineer',
  'data-science', // AI and Data Scientist
  'data-engineer',
  'android',
  'machine-learning',
  'postgresql',
  'ios',
  'blockchain',
  'qa',
  'software-architect',
  'cyber-security',
  'ux-design',
  'technical-writer',
  'game-dev',
  'server-side-game-dev',
  'mlops',
  'product-manager',
  'engineering-manager',
  'developer-relations',
  'bi-analyst',
  
  // Skill-based Roadmaps
  'sql',
  'computer-science',
  'react',
  'vue',
  'angular',
  'javascript',
  'typescript',
  'nodejs',
  'python',
  'system-design',
  'java',
  'aspnet-core',
  'api-design',
  'spring-boot',
  'flutter',
  'cpp',
  'rust',
  'golang',
  'design-and-architecture',
  'graphql',
  'react-native',
  'design-system',
  'prompt-engineering',
  'mongodb',
  'linux',
  'kubernetes',
  'docker',
  'aws',
  'terraform',
  'datastructures-and-algorithms',
  'redis',
  'git-github',
  'php',
  'cloudflare',
  'ai-red-teaming',
  'ai-agents',
  'nextjs',
  'code-review',
  'kotlin',
  
  // Additional Technologies
  'azure',
  'gcp',
  'django',
  'flask',
  'laravel',
  'rails',
  'csharp',
  'ruby',
  'elasticsearch',
  'web3',
  'metaverse',
  'ar-vr',
  'iot',
  'edge-computing',
  'ui-design'
];

const fetchRoadmap = async (slug) => {
  // Try multiple API endpoints for roadmap.sh
  const endpoints = [
    `https://api.roadmap.sh/v1/roadmaps/${slug}`,
    `https://roadmap.sh/api/roadmaps/${slug}`,
    `https://roadmap.sh/${slug}.json`,
    `https://api.roadmap.sh/v1-json/${slug}`,
    `https://roadmap.sh/pdfs/roadmaps/${slug}.json`
  ];

  for (const url of endpoints) {
    try {
      console.log(`🔍 Trying to fetch ${slug} from: ${url}`);
      const res = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (res.data && (res.data.nodes || res.data.topics || res.data.sections || res.data.content)) {
        console.log(`✅ Successfully fetched ${slug} from ${url}`);
        return formatRoadmapData(slug, res.data);
      }
    } catch (err) {
      console.log(`❌ Failed to fetch ${slug} from ${url}: ${err.message}`);
      continue;
    }
  }
  
  console.log(`⚠️ All endpoints failed for ${slug}, will use fallback data`);
  return null;
};

const scrapeAllRoadmaps = async () => {
  const scrapedRoadmaps = [];
  
  console.log(`🚀 Starting to scrape ${roadmapList.length} roadmaps...`);
  
  // Try to scrape all available roadmaps for comprehensive coverage
  for (const roadmapName of roadmapList) {
    try {
      console.log(`📡 Scraping roadmap: ${roadmapName}`);
      
      const roadmapData = await fetchRoadmap(roadmapName);
      
      if (roadmapData) {
        scrapedRoadmaps.push(roadmapData);
        console.log(`✅ Successfully processed roadmap: ${roadmapName}`);
      } else {
        console.log(`⚠️ No data found for ${roadmapName}, will use fallback...`);
      }
      
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
      
    } catch (error) {
      console.log(`❌ Failed to fetch ${roadmapName}: ${error.message}`);
    }
  }
  
  // If no roadmaps were scraped successfully, use fallback data
  if (scrapedRoadmaps.length === 0) {
    console.log(`⚠️ No roadmaps scraped successfully, using fallback data...`);
    return getFallbackRoadmaps();
  }
  
  // Merge scraped data with fallback data for comprehensive coverage
  const fallbackRoadmaps = getFallbackRoadmaps();
  const scrapedNames = scrapedRoadmaps.map(r => r.name.toLowerCase());
  const additionalFallbacks = fallbackRoadmaps.filter(
    fallback => !scrapedNames.includes(fallback.name.toLowerCase())
  );
  
  const allRoadmaps = [...scrapedRoadmaps, ...additionalFallbacks];
  console.log(`🎉 Total roadmaps available: ${allRoadmaps.length} (${scrapedRoadmaps.length} scraped, ${additionalFallbacks.length} fallback)`);
  
  return allRoadmaps;
};

const getFallbackRoadmaps = () => {
  return [
    {
      name: 'Frontend Developer',
      description: 'Complete frontend development learning path covering HTML, CSS, JavaScript, React, and modern tools',
      icon: '🎨',
      difficulty: 'Beginner to Advanced',
      estimatedDuration: '4-6 months',
      milestones: [
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
          description: 'Learn modern JavaScript programming',
          skills: ['ES6+', 'DOM Manipulation', 'Event Handling', 'Async/Await', 'Promises'],
          resources: [
            { name: 'JavaScript.info', url: 'https://javascript.info' },
            { name: 'Eloquent JavaScript', url: 'https://eloquentjavascript.net' }
          ],
          estimatedTime: '4-6 weeks',
          orderIndex: 1
        },
        {
          title: 'React Development',
          description: 'Build modern web applications with React',
          skills: ['JSX', 'Components', 'Props', 'State', 'Hooks', 'Context API'],
          resources: [
            { name: 'React Documentation', url: 'https://react.dev' },
            { name: 'React Tutorial', url: 'https://react.dev/learn' }
          ],
          estimatedTime: '6-8 weeks',
          orderIndex: 2
        }
      ]
    },
    {
      name: 'Backend Developer',
      description: 'Build robust server-side applications and APIs',
      icon: '⚙️',
      difficulty: 'Intermediate',
      estimatedDuration: '6-8 months',
      milestones: [
        {
          title: 'Programming Fundamentals',
          description: 'Master core programming concepts',
          skills: ['Data Structures', 'Algorithms', 'OOP', 'Design Patterns'],
          resources: [
            { name: 'Algorithm Visualizer', url: 'https://algorithm-visualizer.org' },
            { name: 'LeetCode', url: 'https://leetcode.com' }
          ],
          estimatedTime: '4-6 weeks',
          orderIndex: 0
        },
        {
          title: 'Database Design',
          description: 'Learn database concepts and SQL',
          skills: ['SQL', 'Database Design', 'Normalization', 'Indexing', 'Transactions'],
          resources: [
            { name: 'PostgreSQL Tutorial', url: 'https://www.postgresqltutorial.com' },
            { name: 'SQL Bolt', url: 'https://sqlbolt.com' }
          ],
          estimatedTime: '3-4 weeks',
          orderIndex: 1
        }
      ]
    },
    {
      name: 'Full Stack Developer',
      description: 'Master both frontend and backend development',
      icon: '🚀',
      difficulty: 'Advanced',
      estimatedDuration: '8-12 months',
      milestones: [
        {
          title: 'Frontend Mastery',
          description: 'Complete frontend development skills',
          skills: ['HTML/CSS', 'JavaScript', 'React/Vue', 'State Management', 'Testing'],
          resources: [
            { name: 'Frontend Masters', url: 'https://frontendmasters.com' },
            { name: 'React Docs', url: 'https://react.dev' }
          ],
          estimatedTime: '8-10 weeks',
          orderIndex: 0
        },
        {
          title: 'Backend Integration',
          description: 'Learn server-side development and APIs',
          skills: ['Node.js', 'Express', 'Databases', 'Authentication', 'Deployment'],
          resources: [
            { name: 'Node.js Docs', url: 'https://nodejs.org/en/docs' },
            { name: 'Express Guide', url: 'https://expressjs.com' }
          ],
          estimatedTime: '6-8 weeks',
          orderIndex: 1
        }
      ]
    },
    {
      name: 'DevOps Engineer',
      description: 'Learn infrastructure, automation, and deployment practices',
      icon: '🔧',
      difficulty: 'Advanced',
      estimatedDuration: '6-9 months',
      milestones: [
        {
          title: 'Containerization',
          description: 'Master Docker and container orchestration',
          skills: ['Docker', 'Kubernetes', 'Container Registry', 'Orchestration'],
          resources: [
            { name: 'Docker Docs', url: 'https://docs.docker.com' },
            { name: 'Kubernetes Tutorial', url: 'https://kubernetes.io/docs/tutorials' }
          ],
          estimatedTime: '4-6 weeks',
          orderIndex: 0
        },
        {
          title: 'CI/CD Pipelines',
          description: 'Implement continuous integration and deployment',
          skills: ['GitHub Actions', 'Jenkins', 'Pipeline Design', 'Testing Automation'],
          resources: [
            { name: 'GitHub Actions Docs', url: 'https://docs.github.com/en/actions' },
            { name: 'Jenkins Tutorial', url: 'https://www.jenkins.io/doc/tutorials' }
          ],
          estimatedTime: '3-5 weeks',
          orderIndex: 1
        }
      ]
    },
    {
      name: 'Data Science',
      description: 'Learn data analysis, machine learning, and statistical modeling',
      icon: '📊',
      difficulty: 'Intermediate to Advanced',
      estimatedDuration: '8-12 months',
      milestones: [
        {
          title: 'Python for Data Science',
          description: 'Master Python libraries for data analysis',
          skills: ['Python', 'Pandas', 'NumPy', 'Matplotlib', 'Jupyter'],
          resources: [
            { name: 'Pandas Documentation', url: 'https://pandas.pydata.org/docs' },
            { name: 'Python Data Science Handbook', url: 'https://jakevdp.github.io/PythonDataScienceHandbook' }
          ],
          estimatedTime: '6-8 weeks',
          orderIndex: 0
        },
        {
          title: 'Machine Learning Fundamentals',
          description: 'Learn core ML algorithms and techniques',
          skills: ['Scikit-learn', 'Supervised Learning', 'Unsupervised Learning', 'Model Evaluation'],
          resources: [
            { name: 'Scikit-learn Docs', url: 'https://scikit-learn.org/stable' },
            { name: 'Coursera ML Course', url: 'https://www.coursera.org/learn/machine-learning' }
          ],
          estimatedTime: '6-8 weeks',
          orderIndex: 1
        }
      ]
    },
    {
      name: 'Mobile App Developer (Android)',
      description: 'Build native Android applications with Kotlin and modern Android development',
      icon: '📱',
      difficulty: 'Intermediate',
      estimatedDuration: '6-8 months',
      milestones: [
        {
          title: 'Kotlin Programming',
          description: 'Learn Kotlin language fundamentals',
          skills: ['Kotlin Syntax', 'OOP in Kotlin', 'Coroutines', 'Collections'],
          resources: [
            { name: 'Kotlin Documentation', url: 'https://kotlinlang.org/docs' },
            { name: 'Kotlin Koans', url: 'https://play.kotlinlang.org/koans' }
          ],
          estimatedTime: '4-5 weeks',
          orderIndex: 0
        },
        {
          title: 'Android Development',
          description: 'Build Android apps with modern architecture',
          skills: ['Activities', 'Fragments', 'RecyclerView', 'Room Database', 'MVVM'],
          resources: [
            { name: 'Android Developer Guides', url: 'https://developer.android.com/guide' },
            { name: 'Android Jetpack', url: 'https://developer.android.com/jetpack' }
          ],
          estimatedTime: '8-10 weeks',
          orderIndex: 1
        }
      ]
    },
    {
      name: 'Machine Learning Engineer',
      description: 'Deploy and scale machine learning models in production',
      icon: '🤖',
      difficulty: 'Advanced',
      estimatedDuration: '10-12 months',
      milestones: [
        {
          title: 'ML Fundamentals & Statistics',
          description: 'Master statistical foundations and ML algorithms',
          skills: ['Statistics', 'Linear Algebra', 'Probability', 'ML Algorithms'],
          resources: [
            { name: 'Khan Academy Statistics', url: 'https://www.khanacademy.org/math/statistics-probability' },
            { name: 'Elements of Statistical Learning', url: 'https://hastie.su.domains/ElemStatLearn' }
          ],
          estimatedTime: '6-8 weeks',
          orderIndex: 0
        },
        {
          title: 'MLOps & Production',
          description: 'Deploy and monitor ML models at scale',
          skills: ['Docker', 'Kubernetes', 'MLflow', 'Model Monitoring', 'CI/CD for ML'],
          resources: [
            { name: 'MLOps Guide', url: 'https://ml-ops.org' },
            { name: 'MLflow Documentation', url: 'https://mlflow.org/docs/latest/index.html' }
          ],
          estimatedTime: '8-10 weeks',
          orderIndex: 1
        }
      ]
    },
    {
      name: 'Blockchain Developer',
      description: 'Build decentralized applications and smart contracts',
      icon: '⛓️',
      difficulty: 'Advanced',
      estimatedDuration: '8-10 months',
      milestones: [
        {
          title: 'Blockchain Fundamentals',
          description: 'Understand blockchain technology and cryptocurrencies',
          skills: ['Blockchain Concepts', 'Cryptography', 'Consensus Mechanisms', 'Bitcoin'],
          resources: [
            { name: 'Blockchain Basics', url: 'https://www.blockchain.com/learning-portal' },
            { name: 'Mastering Bitcoin', url: 'https://github.com/bitcoinbook/bitcoinbook' }
          ],
          estimatedTime: '4-6 weeks',
          orderIndex: 0
        },
        {
          title: 'Smart Contract Development',
          description: 'Build smart contracts with Solidity',
          skills: ['Solidity', 'Ethereum', 'Web3.js', 'Truffle', 'Hardhat'],
          resources: [
            { name: 'Solidity Documentation', url: 'https://docs.soliditylang.org' },
            { name: 'Ethereum Developer Portal', url: 'https://ethereum.org/en/developers' }
          ],
          estimatedTime: '8-10 weeks',
          orderIndex: 1
        }
      ]
    },
    {
      name: 'Cybersecurity Specialist',
      description: 'Protect systems and networks from cyber threats',
      icon: '🔒',
      difficulty: 'Advanced',
      estimatedDuration: '8-12 months',
      milestones: [
        {
          title: 'Security Fundamentals',
          description: 'Learn core cybersecurity concepts and practices',
          skills: ['Network Security', 'Cryptography', 'Risk Assessment', 'Security Policies'],
          resources: [
            { name: 'NIST Cybersecurity Framework', url: 'https://www.nist.gov/cyberframework' },
            { name: 'OWASP Top 10', url: 'https://owasp.org/www-project-top-ten' }
          ],
          estimatedTime: '6-8 weeks',
          orderIndex: 0
        },
        {
          title: 'Penetration Testing',
          description: 'Learn ethical hacking and vulnerability assessment',
          skills: ['Kali Linux', 'Metasploit', 'Burp Suite', 'Nmap', 'Wireshark'],
          resources: [
            { name: 'Kali Linux Documentation', url: 'https://www.kali.org/docs' },
            { name: 'OWASP Testing Guide', url: 'https://owasp.org/www-project-web-security-testing-guide' }
          ],
          estimatedTime: '8-10 weeks',
          orderIndex: 1
        }
      ]
    },
    {
      name: 'Cloud Solutions Architect (AWS)',
      description: 'Design and implement scalable cloud infrastructure on AWS',
      icon: '☁️',
      difficulty: 'Advanced',
      estimatedDuration: '6-9 months',
      milestones: [
        {
          title: 'AWS Core Services',
          description: 'Master fundamental AWS services and concepts',
          skills: ['EC2', 'S3', 'VPC', 'IAM', 'CloudFormation'],
          resources: [
            { name: 'AWS Documentation', url: 'https://docs.aws.amazon.com' },
            { name: 'AWS Well-Architected Framework', url: 'https://aws.amazon.com/architecture/well-architected' }
          ],
          estimatedTime: '6-8 weeks',
          orderIndex: 0
        },
        {
          title: 'Advanced Architecture Patterns',
          description: 'Design resilient and scalable cloud solutions',
          skills: ['Microservices', 'Serverless', 'Auto Scaling', 'Load Balancing', 'Disaster Recovery'],
          resources: [
            { name: 'AWS Architecture Center', url: 'https://aws.amazon.com/architecture' },
            { name: 'AWS Solutions Library', url: 'https://aws.amazon.com/solutions' }
          ],
          estimatedTime: '8-10 weeks',
          orderIndex: 1
        }
      ]
    },
    {
      name: 'Game Developer',
      description: 'Create engaging games using modern game engines and programming',
      icon: '🎮',
      difficulty: 'Intermediate to Advanced',
      estimatedDuration: '8-12 months',
      milestones: [
        {
          title: 'Game Programming Fundamentals',
          description: 'Learn core game development concepts',
          skills: ['C#', 'Game Physics', 'Game Loops', 'Object Pooling', 'State Machines'],
          resources: [
            { name: 'Unity Learn', url: 'https://learn.unity.com' },
            { name: 'Game Programming Patterns', url: 'https://gameprogrammingpatterns.com' }
          ],
          estimatedTime: '6-8 weeks',
          orderIndex: 0
        },
        {
          title: 'Unity Game Development',
          description: 'Build complete games with Unity engine',
          skills: ['Unity Editor', 'Scripting', 'Animation', 'UI Systems', 'Asset Management'],
          resources: [
            { name: 'Unity Documentation', url: 'https://docs.unity3d.com' },
            { name: 'Unity Tutorials', url: 'https://unity.com/learn/tutorials' }
          ],
          estimatedTime: '10-12 weeks',
          orderIndex: 1
        }
      ]
    }
  ];
};

// Add function to get roadmap categories for better organization
const getRoadmapCategories = () => {
  return {
    'Role-based Roadmaps': [
      'frontend', 'backend', 'full-stack', 'devops', 'data-analyst', 'ai-engineer', 
      'data-science', 'data-engineer', 'android', 'machine-learning', 'postgresql', 
      'ios', 'blockchain', 'qa', 'software-architect', 'cyber-security', 'ux-design', 
      'technical-writer', 'game-dev', 'server-side-game-dev', 'mlops', 'product-manager', 
      'engineering-manager', 'developer-relations', 'bi-analyst'
    ],
    'Programming Languages': [
      'javascript', 'typescript', 'python', 'java', 'cpp', 'golang', 'rust', 
      'php', 'csharp', 'ruby', 'kotlin'
    ],
    'Frontend Technologies': [
      'react', 'vue', 'angular', 'nextjs', 'design-system', 'ui-design'
    ],
    'Backend Technologies': [
      'nodejs', 'spring-boot', 'django', 'flask', 'laravel', 'rails', 
      'aspnet-core', 'api-design', 'graphql'
    ],
    'Mobile Development': [
      'android', 'ios', 'flutter', 'react-native', 'kotlin'
    ],
    'Data & AI': [
      'data-science', 'machine-learning', 'ai-engineer', 'data-analyst', 
      'data-engineer', 'mlops', 'bi-analyst', 'prompt-engineering', 
      'ai-red-teaming', 'ai-agents'
    ],
    'Cloud & Infrastructure': [
      'aws', 'azure', 'gcp', 'kubernetes', 'docker', 'terraform', 
      'devops', 'cloudflare', 'linux'
    ],
    'Databases': [
      'postgresql', 'mongodb', 'redis', 'elasticsearch', 'sql'
    ],
    'System Design & Architecture': [
      'system-design', 'software-architect', 'design-and-architecture', 
      'computer-science', 'datastructures-and-algorithms'
    ],
    'Development Tools': [
      'git-github', 'code-review'
    ],
    'Emerging Technologies': [
      'blockchain', 'web3', 'metaverse', 'ar-vr', 'iot', 'edge-computing'
    ]
  };
};

export { scrapeAllRoadmaps, getFallbackRoadmaps, roadmapList, getRoadmapCategories };
