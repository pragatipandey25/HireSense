import fs from 'fs';
import { createRequire } from 'module';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';

const require = createRequire(import.meta.url);
let pdfParseModule = null;
try {
  pdfParseModule = require('pdf-parse');
} catch (err) {
  console.warn('pdf-parse require notice:', err.message);
}

// Expanded skills list — 150+ technologies
const COMMON_SKILLS = [
  // Programming Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'Go', 'Rust',
  'PHP', 'Kotlin', 'Swift', 'Scala', 'Perl', 'R', 'MATLAB', 'Dart', 'Elixir',
  'Haskell', 'Clojure', 'Groovy', 'Lua', 'Solidity',
  // Frontend
  'React', 'Angular', 'Vue.js', 'Svelte', 'Next.js', 'Nuxt.js', 'Gatsby',
  'HTML', 'HTML5', 'CSS', 'CSS3', 'SASS', 'SCSS', 'LESS', 'Tailwind', 'Bootstrap',
  'Material UI', 'Chakra UI', 'Ant Design', 'Styled Components', 'Redux',
  'Zustand', 'Context API', 'Recoil', 'MobX', 'jQuery', 'Webpack', 'Vite',
  'Babel', 'ESLint', 'Prettier', 'Storybook',
  // Backend
  'Node.js', 'Express', 'Django', 'Flask', 'Spring Boot', 'Spring',
  'ASP.NET', 'Laravel', 'Symfony', 'Ruby on Rails', 'FastAPI',
  'GraphQL', 'REST API', 'RESTful', 'gRPC', 'WebSocket', 'Socket.io',
  'Apollo', 'Prisma', 'TypeORM', 'Sequelize', 'Mongoose',
  // Databases
  'MongoDB', 'PostgreSQL', 'MySQL', 'SQLite', 'Redis', 'Firebase',
  'Oracle', 'SQL Server', 'MariaDB', 'DynamoDB', 'Cassandra', 'Elasticsearch',
  'Neo4j', 'CouchDB', 'Supabase',
  // Cloud & DevOps
  'AWS', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes', 'CI/CD',
  'Jenkins', 'GitLab CI', 'GitHub Actions', 'CircleCI', 'Travis CI',
  'Terraform', 'Ansible', 'Puppet', 'Chef', 'Helm', 'Prometheus',
  'Grafana', 'Datadog', 'New Relic', 'Sentry',
  // Version Control
  'Git', 'GitHub', 'GitLab', 'Bitbucket', 'SVN', 'Mercurial',
  // Testing
  'Jest', 'Mocha', 'Chai', 'Cypress', 'Selenium', 'Playwright',
  'Puppeteer', 'Vitest', 'React Testing Library', 'JUnit', 'PyTest',
  'Jasmine', 'Karma', 'Enzyme',
  // Mobile
  'React Native', 'Flutter', 'Android', 'iOS', 'SwiftUI', 'UIKit',
  'Xamarin', 'Ionic', 'Cordova',
  // Data Science & ML
  'Machine Learning', 'Deep Learning', 'NLP', 'Natural Language Processing',
  'Computer Vision', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'Keras',
  'Pandas', 'NumPy', 'SciPy', 'Matplotlib', 'Seaborn', 'Jupyter',
  'OpenCV', 'Hugging Face', 'LangChain', 'LLM', 'Generative AI',
  'RAG', 'Vector Database', 'Pinecone', 'Weaviate',
  // Big Data
  'Apache Spark', 'Hadoop', 'Kafka', 'Airflow', 'Snowflake',
  'BigQuery', 'Redshift', 'Databricks', 'Flink',
  // Tools & Platforms
  'Linux', 'Unix', 'Bash', 'PowerShell', 'Zsh',
  'Nginx', 'Apache', 'PM2', 'HAProxy', 'Traefik',
  'Figma', 'Adobe XD', 'Sketch', 'Photoshop', 'Illustrator',
  'JIRA', 'Confluence', 'Trello', 'Asana', 'Notion', 'Slack',
  'Postman', 'Insomnia', 'Swagger', 'OpenAPI',
  // Project Management
  'Agile', 'Scrum', 'Kanban', 'Waterfall', 'Lean',
  // Business Intelligence
  'Tableau', 'Power BI', 'Excel', 'Looker', 'QuickSight',
  'MicroStrategy', 'QlikView',
  // Cybersecurity
  'Cybersecurity', 'Ethical Hacking', 'Penetration Testing',
  'CISSP', 'CEH', 'CompTIA', 'OWASP', 'SIEM', 'Firewall',
  // Soft Skills
  'Leadership', 'Communication', 'Team Management', 'Problem Solving',
  'Critical Thinking', 'Project Management', 'Time Management',
  'Mentoring', 'Cross-functional Collaboration',
];

// Common certifications
const CERT_KEYWORDS = [
  'certified', 'certification', 'certificate', 'AWS Certified', 'Azure Certified',
  'Google Certified', 'PMP', 'Scrum Master', 'CISSP', 'CEH', 'CompTIA',
  'Oracle Certified', 'Cisco Certified', 'CCNA', 'CCNP', 'OCJP', 'OCP',
  'TOGAF', 'ITIL', 'Six Sigma', 'CPA', 'CFA', 'FRM', 'PRINCE2',
  'AWS Solutions Architect', 'AWS Developer', 'AWS DevOps',
  'Google Cloud Certified', 'Azure Administrator', 'Azure Developer',
  'Kubernetes Administrator', 'CKA', 'CKAD', 'RHCE', 'LFCS',
  'ISTQB', 'CSM', 'PSM', 'SAFe',
];

// Language keywords
const LANGUAGE_KEYWORDS = [
  'English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean',
  'Hindi', 'Arabic', 'Portuguese', 'Russian', 'Italian', 'Dutch',
  'Mandarin', 'Cantonese', 'Bengali', 'Urdu', 'Turkish', 'Vietnamese',
  'Polish', 'Swedish', 'Norwegian', 'Danish', 'Finnish', 'Greek',
  'Hebrew', 'Thai', 'Indonesian', 'Malay', 'Tagalog', 'Romanian',
  'Czech', 'Hungarian', 'Ukrainian', 'Catalan', 'Serbian', 'Croatian',
];

// Education keywords with degree levels
const EDU_KEYWORDS = {
  'phd': 10, 'ph.d': 10, 'doctorate': 10, 'doctor of philosophy': 10,
  'master': 8, 'm.tech': 8, 'm.e': 8, 'm.sc': 8, 'm.a': 8, 'm.b.a': 8, 'mba': 8, 'msc': 8,
  'bachelor': 6, 'b.tech': 6, 'b.e': 6, 'b.sc': 6, 'b.a': 6, 'b.com': 6, 'b.b.a': 6, 'bba': 6,
  'associate': 4, 'diploma': 3, 'high school': 2, 'higher secondary': 2, 'secondary': 1,
  'bachelor of science': 6, 'bachelor of arts': 6, 'bachelor of engineering': 6,
  'bachelor of technology': 6, 'bachelor of commerce': 6, 'bachelor of business administration': 6,
  'master of science': 8, 'master of arts': 8, 'master of engineering': 8,
  'master of technology': 8, 'master of business administration': 8, 'masters': 8,
};

/**
 * Universal buffer resolver supporting Node Buffers, MongoDB BSON Binary objects,
 * TypedArrays (Uint8Array), ArrayBuffers, and local filesystem paths.
 */
export function toBuffer(input) {
  if (!input) return null;
  if (Buffer.isBuffer(input)) return input;
  // MongoDB BSON Binary support
  if (input._bsontype === 'Binary' || typeof input.value === 'function') {
    try {
      const val = input.value ? input.value(true) : input.buffer;
      if (Buffer.isBuffer(val)) return val;
      return Buffer.from(val);
    } catch {}
  }
  if (input.buffer) {
    if (Buffer.isBuffer(input.buffer)) return input.buffer;
    if (input.buffer instanceof ArrayBuffer || ArrayBuffer.isView(input.buffer)) {
      return Buffer.from(input.buffer, input.byteOffset || 0, input.byteLength || input.length);
    }
  }
  if (input instanceof Uint8Array || ArrayBuffer.isView(input)) {
    return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  }
  if (typeof input === 'string') {
    try {
      if (fs.existsSync(input)) {
        return fs.readFileSync(input);
      }
    } catch {}
  }
  return null;
}

export async function extractTextFromPDF(filePathOrBuffer) {
  const dataBuffer = toBuffer(filePathOrBuffer);
  if (!dataBuffer || dataBuffer.length === 0) {
    return '';
  }

  const uint8Array = new Uint8Array(dataBuffer);

  // Strategy 1: pdf-parse (pure Node.js / serverless-compatible)
  if (pdfParseModule) {
    try {
      if (typeof pdfParseModule.PDFParse === 'function') {
        const parser = new pdfParseModule.PDFParse(uint8Array);
        await parser.load();
        const res = await parser.getText();
        const extracted = res?.text || (res?.pages ? res.pages.map(p => p.text).join('\n') : '');
        if (extracted && extracted.trim().length > 20) {
          return extracted.trim();
        }
      } else if (typeof pdfParseModule === 'function') {
        const res = await pdfParseModule(dataBuffer);
        if (res?.text && res.text.trim().length > 20) {
          return res.text.trim();
        }
      }
    } catch (pdfParseErr) {
      console.warn('PDF parsing with pdf-parse notice:', pdfParseErr.message);
    }
  }

  // Strategy 2: pdfjs-dist coordinate-aware text extractor
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useSystemFonts: false,
      disableFontFace: true,
      verbosity: 0,
      isEvalSupported: false,
    });
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        let smartLines = [];
        let currentLine = '';
        let lastY = null;

        for (const item of textContent.items) {
          const str = typeof item?.str === 'string' ? item.str : '';
          if (!str && !item.hasEOL) continue;

          const y = item.transform ? Math.round(item.transform[5]) : null;
          // When vertical Y-coordinate changes by more than 3 units, it's a new line
          if (lastY !== null && y !== null && Math.abs(y - lastY) > 3) {
            if (currentLine.trim()) smartLines.push(currentLine.trim());
            currentLine = '';
          }
          currentLine += (currentLine ? ' ' : '') + str;
          if (item.hasEOL) {
            if (currentLine.trim()) smartLines.push(currentLine.trim());
            currentLine = '';
            lastY = null;
            continue;
          }
          lastY = y;
        }
        if (currentLine.trim()) smartLines.push(currentLine.trim());

        fullText += smartLines.join('\n') + '\n';
      } catch (pageErr) {
        console.warn(`Warning: failed to extract text from PDF page ${i}:`, pageErr.message);
      }
    }
    const cleanText = fullText.trim();
    if (cleanText.length > 20) {
      return cleanText;
    }
  } catch (pdfErr) {
    console.warn('PDF parsing with pdfjs-dist encountered notice:', pdfErr.message);
  }

  // Strategy 3: extract ASCII / readable strings directly from PDF binary stream
  try {
    const binaryString = dataBuffer.toString('binary');
    const matches = binaryString.match(/\(([^\(\)\\]*(?:\\.[^\(\)\\]*)*)\)\s*T[jJ]/g) ||
                    binaryString.match(/\[([^\[\]]*)\]\s*TJ/g);
    if (matches && matches.length > 0) {
      const fallbackText = matches
        .map(m => m.replace(/^[\(\[]/, '').replace(/[\]\)]\s*T[jJ]$/, '').replace(/\\(.)/g, '$1'))
        .join(' ')
        .trim();
      if (fallbackText.length > 20) {
        return fallbackText;
      }
    }
  } catch {}

  return '';
}

export async function extractTextFromDOCX(filePathOrBuffer) {
  const dataBuffer = toBuffer(filePathOrBuffer);
  if (!dataBuffer || dataBuffer.length === 0) {
    return '';
  }
  try {
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    return (result.value || '').trim();
  } catch (docxErr) {
    console.warn('DOCX extraction notice:', docxErr.message);
    return '';
  }
}

/**
 * Improved years of experience extraction
 * Handles formats like "5 years", "5+ years exp", "Jan 2018 - Present", etc.
 */
function extractYearsOfExperience(text) {
  // Direct mentions: "5 years of experience"
  const directMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?experience/i);
  if (directMatch) return parseInt(directMatch[1]);

  // Date ranges: "2018 - Present", "Jan 2018 - Dec 2022"
  const dateRanges = text.match(/(\d{4})\s*[-–to]+\s*(present|current|now|ongoing|\d{4})/gi);
  if (dateRanges) {
    let totalYears = 0;
    for (const range of dateRanges) {
      const years = range.match(/\d{4}/g);
      if (years) {
        const startYear = parseInt(years[0]);
        const endYear = years.length > 1 ? parseInt(years[1]) : new Date().getFullYear();
        totalYears += endYear - startYear;
      }
    }
    return Math.round(totalYears);
  }

  return 0;
}

/**
 * Extract LinkedIn and GitHub URLs
 */
function extractURLs(text) {
  const urls = {
    linkedin: '',
    github: '',
  };

  const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
  if (linkedinMatch) urls.linkedin = linkedinMatch[0];

  const githubMatch = text.match(/github\.com\/[\w-]+/i);
  if (githubMatch) urls.github = githubMatch[0];

  return urls;
}

export async function parseResumeText(text) {
  const lines = text.split('\n').filter(line => line.trim());
  const textLower = text.toLowerCase();
  
  const parsed = {
    name: '',
    email: '',
    phone: '',
    skills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    languages: [],
    urls: { linkedin: '', github: '' },
    summary: '',
    totalYearsOfExperience: 0,
  };

  // Extract URLs
  parsed.urls = extractURLs(text);

  // Extract email
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailMatch = text.match(emailRegex);
  if (emailMatch) {
    parsed.email = emailMatch[0];
  }

  // Extract phone number (standard, international, and grouped formats)
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,5}[-.\s]?\d{4}/g;
  const phoneMatch = text.match(phoneRegex);
  if (phoneMatch) {
    parsed.phone = phoneMatch[0].trim();
  }

  // Extract candidate name — multi-pattern scanner
  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    // Split line by commas, pipes, bullets, dashes, or 2+ consecutive spaces
    const parts = trimmed.split(/[\t,|•—–]|\s{2,}/).map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes('@') || phoneRegex.test(part) || /https?:\/\//i.test(part) || /linkedin\.com|github\.com/i.test(part)) {
        continue;
      }
      if (part.length < 3 || part.length > 40) continue;
      if (part.match(/^(experience|education|skills|projects|work|summary|profile|contact|objective|about|curriculum|resume|cv)/i)) {
        continue;
      }

      // Check for 2 to 4 word person names (supporting Title Case and UPPERCASE)
      const nameMatch = part.match(/^([A-Za-z]{2,}(?:\s+[A-Za-z]{2,}){1,3})$/);
      if (nameMatch) {
        const candidateName = nameMatch[1].trim();
        if (!candidateName.match(/(engineer|developer|manager|analyst|designer|architect|consultant|lead|head|director|specialist|summary|curriculum|vitae)/i)) {
          // Normalize to Title Case
          parsed.name = candidateName
            .split(/\s+/)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
          break;
        }
      }
    }
    if (parsed.name) break;
  }

  // Extract summary/objective section
  let currentSection = null;
  const sectionHeaders = [
    { match: /^(summary|professional summary|profile|about\s*me|objective|career\s*objective)/i, section: 'summary' },
    { match: /^(experience|work\s*experience|employment|professional\s*experience|work\s*history)/i, section: 'experience' },
    { match: /^(education|academic|academic\s*background|qualifications)/i, section: 'education' },
    { match: /^(projects|project|personal\s*projects|key\s*projects)/i, section: 'projects' },
    { match: /^(skills|technical\s*skills|core\s*competencies|key\s*skills|technologies)/i, section: 'skills' },
    { match: /^(certifications|certification|certificates|courses)/i, section: 'certifications' },
    { match: /^(languages|language)/i, section: 'languages' },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim().toLowerCase();

    // Detect section header
    for (const header of sectionHeaders) {
      if (line.match(header.match)) {
        currentSection = header.section;
        break;
      }
    }

    if (currentSection === 'summary') {
      const isHeaderLine = sectionHeaders.some(h => line.match(h.match));
      if (isHeaderLine) {
        let summaryLines = [];
        for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (nextLine && !sectionHeaders.some(h => nextLine.toLowerCase().match(h.match))) {
            summaryLines.push(nextLine);
          } else break;
        }
        if (summaryLines.length > 0) {
          parsed.summary = summaryLines.join(' ').trim();
        }
      }
    }
  }

  // Extract skills — case-insensitive matching with deduplication
  const foundSkills = [];
  for (const skill of COMMON_SKILLS) {
    // Use word boundary matching for better accuracy
    const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedSkill}\\b`, 'i');
    if (regex.test(text)) {
      foundSkills.push(skill);
    }
  }
  parsed.skills = [...new Set(foundSkills)];

  // Extract certifications — improved
  const seenCerts = new Set();
  for (const line of lines) {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();
    for (const keyword of CERT_KEYWORDS) {
      if (lower.includes(keyword.toLowerCase())) {
        if (!seenCerts.has(trimmed)) {
          seenCerts.add(trimmed);
          // Try to extract issuer info from surrounding context
          parsed.certifications.push({
            name: trimmed,
            issuer: '',
            year: '',
          });
        }
        break;
      }
    }
  }

  // Extract languages — improved with proficiency detection
  const seenLangs = new Set();
  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    for (const lang of LANGUAGE_KEYWORDS) {
      if (trimmed.includes(lang.toLowerCase()) && !seenLangs.has(lang)) {
        seenLangs.add(lang);
        parsed.languages.push(lang);
      }
    }
  }

  // Extract education — improved with better institution/degree/year parsing
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim().toLowerCase();
    
    // Detect education section
    if (line.match(/^(education|academic)/i)) {
      currentSection = 'education';
      continue;
    }

    if (currentSection === 'education' && line.length > 5) {
      // Check if line contains education keywords
      const hasEduKeyword = Object.keys(EDU_KEYWORDS).some(k => line.includes(k));
      if (hasEduKeyword) {
        const degreeLine = lines[i].trim();
        const institutionLine = lines[i + 1]?.trim() || '';
        const yearLine = lines[i + 2]?.trim() || '';
        
        // Extract year
        const yearMatch = yearLine.match(/(\d{4})/);
        const instYearMatch = institutionLine.match(/(\d{4})/);
        const degreeYearMatch = degreeLine.match(/(\d{4})/);
        
        let year = '';
        let institution = '';
        
        if (yearMatch) year = yearMatch[1];
        else if (instYearMatch) year = instYearMatch[1];
        else if (degreeYearMatch) year = degreeYearMatch[1];

        // Determine institution: the line that has university/college/institute keywords
        if (institutionLine.match(/(university|college|institute|school|academy)/i)) {
          institution = institutionLine.replace(/\d{4}/g, '').trim();
        } else if (degreeLine.match(/(university|college|institute|school|academy)/i)) {
          institution = degreeLine.replace(/\d{4}/g, '').trim();
          // Swap: degree line is actually institution
          parsed.education.push({
            degree: institutionLine,
            institution,
            year,
          });
          continue;
        }

        parsed.education.push({
          degree: degreeLine,
          institution,
          year,
        });
      }
    }
  }

  // Extract experience — improved with better date range and role/company parsing
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect experience section
    if (line.match(/^(experience|work\s*experience|employment|professional\s*experience)/i)) {
      currentSection = 'experience';
      continue;
    }

    if (currentSection === 'experience' && line.length > 5) {
      // Look for date patterns to identify experience entries
      const datePattern = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[.\s]*(\d{4})\b/i;
      const yearPattern = /\b(19|20)\d{2}\b/;
      const presentPattern = /\b(present|current|now|ongoing)\b/i;

      if (datePattern.test(line) || (yearPattern.test(line) && line.match(/-|–|—|to/)) || presentPattern.test(line)) {
        // Try to extract company from the line
        const companyMatch = line.match(/^([A-Za-z\s&.]+?)\s*(?:-|–|—|\|)/);
        const company = companyMatch ? companyMatch[1].trim() : line.replace(datePattern, '').replace(yearPattern, '').replace(/-|–|—|to.*$/, '').trim();
        
        // Role is usually the next non-empty line
        let role = '';
        let description = '';
        const nextLine = lines[i + 1]?.trim() || '';
        if (nextLine && !datePattern.test(nextLine) && !presentPattern.test(nextLine)) {
          role = nextLine;
          description = lines[i + 2]?.trim() || '';
        }

        parsed.experience.push({
          company: company || 'Company',
          role: role || 'Role',
          duration: line,
          description,
        });
      }
    }
  }

  // Extract projects — improved
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.match(/^(projects|project|personal\s*projects)/i)) {
      currentSection = 'projects';
      continue;
    }

    if (currentSection === 'projects' && line.length > 5) {
      const projName = line;
      const projDesc = lines[i + 1]?.trim() || '';
      const projTech = lines[i + 2]?.trim() || '';
      
      // Extract technologies mentioned in project context
      const projText = `${projName} ${projDesc} ${projTech}`.toLowerCase();
      const techUsed = parsed.skills.filter(skill => 
        projText.includes(skill.toLowerCase())
      );

      parsed.projects.push({
        name: projName,
        description: projDesc,
        technologies: techUsed,
      });
    }
  }

  // Calculate total years of experience
  const allExpText = parsed.experience.map(e => `${e.duration} ${e.role} ${e.company}`).join(' ');
  parsed.totalYearsOfExperience = extractYearsOfExperience(allExpText || text);

  // Deduplicate everything
  parsed.skills = [...new Set(parsed.skills)];
  parsed.languages = [...new Set(parsed.languages)];
  
  // Deduplicate experience by company+role
  const seenExp = new Set();
  parsed.experience = parsed.experience.filter(exp => {
    const key = `${exp.company}|${exp.role}`;
    if (seenExp.has(key)) return false;
    seenExp.add(key);
    return true;
  });

  // Deduplicate education by degree name
  const seenEdu = new Set();
  parsed.education = parsed.education.filter(edu => {
    const key = edu.degree;
    if (seenEdu.has(key)) return false;
    seenEdu.add(key);
    return true;
  });

  // Deduplicate certifications by name
  const seenCert = new Set();
  parsed.certifications = parsed.certifications.filter(cert => {
    const key = cert.name;
    if (seenCert.has(key)) return false;
    seenCert.add(key);
    return true;
  });

  // Deduplicate projects by name
  const seenProj = new Set();
  parsed.projects = parsed.projects.filter(proj => {
    const key = proj.name;
    if (seenProj.has(key)) return false;
    seenProj.add(key);
    return true;
  });

  return parsed;
}

export async function parseResume(filePathOrBuffer, fileType) {
  let text = '';
  const buffer = toBuffer(filePathOrBuffer);

  // Normalize fileType or detect automatically from buffer magic bytes
  let detectedType = (fileType || '').toLowerCase().trim();
  if (!detectedType || (!detectedType.includes('pdf') && !detectedType.includes('docx') && !detectedType.includes('doc'))) {
    if (buffer && buffer.length >= 4) {
      // PDF starts with %PDF (0x25, 0x50, 0x44, 0x46)
      if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
        detectedType = 'pdf';
      } else if (buffer[0] === 0x50 && buffer[1] === 0x4B) { // PK (ZIP/DOCX container)
        detectedType = 'docx';
      }
    }
    if (!detectedType && typeof filePathOrBuffer === 'string') {
      if (filePathOrBuffer.toLowerCase().endsWith('.pdf')) detectedType = 'pdf';
      else if (filePathOrBuffer.toLowerCase().match(/\.docx?$/)) detectedType = 'docx';
    }
  }

  try {
    if (detectedType.includes('pdf')) {
      text = await extractTextFromPDF(buffer || filePathOrBuffer);
      if (!text || text.trim().length < 20) {
        const altText = await extractTextFromDOCX(buffer || filePathOrBuffer);
        if (altText && altText.trim().length > (text ? text.length : 0)) text = altText;
      }
    } else if (detectedType.includes('docx') || detectedType.includes('doc')) {
      text = await extractTextFromDOCX(buffer || filePathOrBuffer);
      if (!text || text.trim().length < 20) {
        const altText = await extractTextFromPDF(buffer || filePathOrBuffer);
        if (altText && altText.trim().length > (text ? text.length : 0)) text = altText;
      }
    } else {
      text = await extractTextFromPDF(buffer || filePathOrBuffer);
      if (!text || text.trim().length < 20) {
        text = await extractTextFromDOCX(buffer || filePathOrBuffer);
      }
    }
  } catch (err) {
    console.warn(`Extraction notice for ${detectedType || fileType}:`, err.message);
  }

  const parsedData = await parseResumeText(text || '');
  return { rawText: text || '', parsedData };
}
