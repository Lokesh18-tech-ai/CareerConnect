/**
 * Database seed script — Indian Job Portal Demo Data
 * Run: pnpm --filter @workspace/db run seed
 *
 * IMPORTANT: Company names are used as illustrative demo/sample data only.
 * These are NOT real job postings. Salary ranges are example figures in INR
 * (LPA = Lakhs Per Annum) clearly meant as demo content, not real offers.
 * No official company logos are downloaded or used — the app's initials-
 * avatar system renders all company icons.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvFile(envPath: string) {
  try {
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch { /* no .env file */ }
}

loadEnvFile(resolve(process.cwd(), "../../.env"));
loadEnvFile(resolve(process.cwd(), ".env"));

import crypto from "crypto";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema/index.js";
import { eq } from "drizzle-orm";

const { Pool } = pg;
function hash(pw: string) {
  return crypto.createHash("sha256").update(pw + "careerconnect_salt").digest("hex");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db   = drizzle(pool, { schema });

// ─── 20 Major Indian Companies (demo/illustrative) ───────────────────────────
const COMPANIES = [
  {
    name: "Tata Consultancy Services",
    industry: "IT Services & Consulting",
    size: "10000+",
    location: "Mumbai, Maharashtra",
    founded: 1968,
    website: "https://www.tcs.com",
    description: "Demo entry inspired by TCS — one of the world's largest IT services companies, headquartered in Mumbai with delivery centres across Bengaluru, Hyderabad, Pune, and Chennai.",
  },
  {
    name: "Infosys",
    industry: "IT Services & Consulting",
    size: "10000+",
    location: "Bengaluru, Karnataka",
    founded: 1981,
    website: "https://www.infosys.com",
    description: "Demo entry inspired by Infosys — a global leader in digital transformation, consulting, and IT services, headquartered in Bengaluru.",
  },
  {
    name: "Wipro",
    industry: "IT Services & Consulting",
    size: "10000+",
    location: "Bengaluru, Karnataka",
    founded: 1945,
    website: "https://www.wipro.com",
    description: "Demo entry inspired by Wipro — technology, consulting, and business process services provider based in Bengaluru.",
  },
  {
    name: "HCLTech",
    industry: "Technology",
    size: "10000+",
    location: "Noida, Uttar Pradesh",
    founded: 1976,
    website: "https://www.hcltech.com",
    description: "Demo entry inspired by HCLTech — a global technology company delivering enterprise modernisation, digital and analytics, and IoT solutions from Noida.",
  },
  {
    name: "Tech Mahindra",
    industry: "IT Services & Consulting",
    size: "10000+",
    location: "Pune, Maharashtra",
    founded: 1986,
    website: "https://www.techmahindra.com",
    description: "Demo entry inspired by Tech Mahindra — IT services and consulting company specialising in digital transformation, with HQ in Pune.",
  },
  {
    name: "LTIMindtree",
    industry: "Technology",
    size: "5000-10000",
    location: "Mumbai, Maharashtra",
    founded: 2022,
    website: "https://www.ltimindtree.com",
    description: "Demo entry inspired by LTIMindtree — technology services and consulting firm formed by the merger of L&T Infotech and Mindtree.",
  },
  {
    name: "Accenture India",
    industry: "Consulting & Technology",
    size: "10000+",
    location: "Bengaluru, Karnataka",
    founded: 1989,
    website: "https://www.accenture.com/in-en",
    description: "Demo entry inspired by Accenture India — technology consulting, systems integration, and managed services across industries.",
  },
  {
    name: "Capgemini India",
    industry: "IT Services & Consulting",
    size: "10000+",
    location: "Mumbai, Maharashtra",
    founded: 1967,
    website: "https://www.capgemini.com/in-en",
    description: "Demo entry inspired by Capgemini India — a global leader in consulting, technology services and digital transformation.",
  },
  {
    name: "Cognizant",
    industry: "IT Services & Consulting",
    size: "10000+",
    location: "Chennai, Tamil Nadu",
    founded: 1994,
    website: "https://www.cognizant.com",
    description: "Demo entry inspired by Cognizant — IT services and consulting company with major delivery centres across Chennai, Hyderabad, and Bengaluru.",
  },
  {
    name: "Reliance Industries",
    industry: "Conglomerate & Technology",
    size: "10000+",
    location: "Mumbai, Maharashtra",
    founded: 1966,
    website: "https://www.ril.com",
    description: "Demo entry inspired by Reliance Industries — India's largest private sector company with diversified interests in petrochemicals, retail, digital services, and media.",
  },
  {
    name: "Reliance Jio",
    industry: "Telecom & Technology",
    size: "10000+",
    location: "Mumbai, Maharashtra",
    founded: 2007,
    website: "https://www.jio.com",
    description: "Demo entry inspired by Reliance Jio — India's largest telecom operator and digital services platform with over 450 million subscribers.",
  },
  {
    name: "Bharti Airtel",
    industry: "Telecommunications",
    size: "10000+",
    location: "Gurugram, Haryana",
    founded: 1995,
    website: "https://www.airtel.in",
    description: "Demo entry inspired by Bharti Airtel — India's second-largest telecom operator with a presence across mobile, broadband, and enterprise services.",
  },
  {
    name: "HDFC Bank",
    industry: "Banking & Financial Services",
    size: "10000+",
    location: "Mumbai, Maharashtra",
    founded: 1994,
    website: "https://www.hdfcbank.com",
    description: "Demo entry inspired by HDFC Bank — India's largest private sector bank with extensive technology and digital banking operations.",
  },
  {
    name: "ICICI Bank",
    industry: "Banking & Financial Services",
    size: "10000+",
    location: "Mumbai, Maharashtra",
    founded: 1994,
    website: "https://www.icicibank.com",
    description: "Demo entry inspired by ICICI Bank — a leading private sector bank known for its digital banking innovation and technology teams.",
  },
  {
    name: "Larsen & Toubro",
    industry: "Engineering & Technology",
    size: "10000+",
    location: "Mumbai, Maharashtra",
    founded: 1938,
    website: "https://www.larsentoubro.com",
    description: "Demo entry inspired by L&T — a major technology, engineering, construction, manufacturing, and financial services conglomerate.",
  },
  {
    name: "Mahindra & Mahindra",
    industry: "Automotive & Technology",
    size: "10000+",
    location: "Mumbai, Maharashtra",
    founded: 1945,
    website: "https://www.mahindra.com",
    description: "Demo entry inspired by Mahindra — a global federation of companies with strong presence in automotive, IT services, and agribusiness.",
  },
  {
    name: "Tata Motors",
    industry: "Automotive & Technology",
    size: "10000+",
    location: "Mumbai, Maharashtra",
    founded: 1945,
    website: "https://www.tatamotors.com",
    description: "Demo entry inspired by Tata Motors — India's largest commercial vehicle manufacturer expanding into EVs and connected mobility.",
  },
  {
    name: "Axis Bank",
    industry: "Banking & Financial Services",
    size: "10000+",
    location: "Mumbai, Maharashtra",
    founded: 1993,
    website: "https://www.axisbank.com",
    description: "Demo entry inspired by Axis Bank — India's third-largest private sector bank with significant technology investment in digital banking.",
  },
  {
    name: "State Bank of India",
    industry: "Banking & Financial Services",
    size: "10000+",
    location: "Mumbai, Maharashtra",
    founded: 1955,
    website: "https://www.sbi.co.in",
    description: "Demo entry inspired by SBI — India's largest public sector bank with ongoing large-scale digital and technology modernisation initiatives.",
  },
  {
    name: "Kotak Mahindra Bank",
    industry: "Banking & Financial Services",
    size: "5000-10000",
    location: "Mumbai, Maharashtra",
    founded: 1985,
    website: "https://www.kotak.com",
    description: "Demo entry inspired by Kotak Mahindra Bank — one of India's leading private sector banks with a strong focus on digital-first banking.",
  },
];

// ─── 20 Realistic Job Postings ───────────────────────────────────────────────
type JobSeed = {
  title: string; companyName: string; location: string; type: string;
  level: string; salary: string; description: string; requirements: string; featured: boolean;
};

const JOBS: JobSeed[] = [
  {
    title: "Software Engineer — Full Stack",
    companyName: "Tata Consultancy Services",
    location: "Bengaluru, Karnataka",
    type: "full-time", level: "mid",
    salary: "₹8–14 LPA",
    description: "Build and maintain enterprise web applications for global banking and insurance clients using React, Node.js, and microservices. Work in an Agile team, participate in sprint planning, code reviews, and production deployments.",
    requirements: "3–5 years full-stack experience · React or Angular · Node.js / Spring Boot · REST APIs · SQL · Good communication skills",
    featured: true,
  },
  {
    title: "Senior Java Developer",
    companyName: "Infosys",
    location: "Hyderabad, Telangana",
    type: "full-time", level: "senior",
    salary: "₹15–22 LPA",
    description: "Design and develop high-performance Java microservices for large-scale financial platforms. Lead technical discussions, conduct code reviews, and mentor junior developers on best practices.",
    requirements: "5–8 years Java/Spring Boot · Microservices · Kafka · Docker/Kubernetes · Strong OOP and design patterns",
    featured: true,
  },
  {
    title: "DevOps Engineer",
    companyName: "Wipro",
    location: "Pune, Maharashtra",
    type: "full-time", level: "mid",
    salary: "₹10–16 LPA",
    description: "Manage and improve CI/CD pipelines, cloud infrastructure, and deployment automation for enterprise client projects. Ensure high availability, security, and scalability of production environments.",
    requirements: "3+ years DevOps · Jenkins / GitLab CI · Docker · Kubernetes · AWS or Azure · Terraform · Shell/Python scripting",
    featured: false,
  },
  {
    title: "Data Scientist",
    companyName: "HCLTech",
    location: "Noida, Uttar Pradesh",
    type: "full-time", level: "mid",
    salary: "₹12–20 LPA",
    description: "Build machine learning models and data pipelines that generate actionable business insights for Fortune 500 clients. Collaborate with data engineers and business analysts throughout the ML lifecycle.",
    requirements: "3+ years data science · Python (pandas, scikit-learn, PyTorch) · SQL · ML model deployment · Strong statistics fundamentals",
    featured: false,
  },
  {
    title: "Frontend Developer — React",
    companyName: "Tech Mahindra",
    location: "Pune, Maharashtra",
    type: "full-time", level: "entry",
    salary: "₹5–9 LPA",
    description: "Develop responsive, accessible, and performant React interfaces for telecom client portals used by millions of end users. Work closely with UX designers and backend teams.",
    requirements: "1–3 years React/TypeScript · HTML/CSS · REST API integration · Git · Eye for design detail",
    featured: false,
  },
  {
    title: "Cloud Architect",
    companyName: "LTIMindtree",
    location: "Mumbai, Maharashtra",
    type: "full-time", level: "lead",
    salary: "₹30–45 LPA",
    description: "Design cloud-native reference architectures and lead multi-cloud migration strategies for enterprise customers across banking, retail, and manufacturing sectors.",
    requirements: "10+ years · AWS Solutions Architect / GCP Professional certified · Multi-cloud architecture · Cost optimisation · Strong stakeholder management",
    featured: true,
  },
  {
    title: "AI/ML Engineer",
    companyName: "Accenture India",
    location: "Bengaluru, Karnataka",
    type: "full-time", level: "senior",
    salary: "₹20–32 LPA",
    description: "Build and deploy production-grade AI/ML models for Accenture's Applied Intelligence practice. Work on NLP, computer vision, and generative AI solutions for global enterprise clients.",
    requirements: "5+ years ML engineering · Python · PyTorch or TensorFlow · LLM fine-tuning · MLOps · Cloud deployment experience",
    featured: true,
  },
  {
    title: "Business Analyst — Digital Banking",
    companyName: "Capgemini India",
    location: "Mumbai, Maharashtra",
    type: "full-time", level: "mid",
    salary: "₹9–14 LPA",
    description: "Bridge the gap between business stakeholders and technology teams on digital banking transformation projects. Document requirements, create process flows, and facilitate workshops.",
    requirements: "3–5 years BA experience · Banking domain knowledge · JIRA / Confluence · UML or BPMN · Excellent written and verbal communication",
    featured: false,
  },
  {
    title: "QA Automation Engineer",
    companyName: "Cognizant",
    location: "Chennai, Tamil Nadu",
    type: "full-time", level: "entry",
    salary: "₹5–8 LPA",
    description: "Design and implement automated test frameworks for web and mobile applications across client delivery projects. Collaborate with developers on shift-left testing strategies.",
    requirements: "1–3 years QA automation · Selenium or Playwright · Java or Python · TestNG / Pytest · Basic API testing",
    featured: false,
  },
  {
    title: "Cybersecurity Analyst",
    companyName: "Reliance Industries",
    location: "Mumbai, Maharashtra",
    type: "full-time", level: "mid",
    salary: "₹12–18 LPA",
    description: "Monitor and protect enterprise infrastructure against cyber threats. Conduct vulnerability assessments, incident response, and security awareness training across group companies.",
    requirements: "3–5 years cybersecurity · SIEM tools · Penetration testing basics · CEH / CISSP a plus · Strong analytical mindset",
    featured: false,
  },
  {
    title: "Android Developer",
    companyName: "Reliance Jio",
    location: "Mumbai, Maharashtra",
    type: "full-time", level: "mid",
    salary: "₹10–17 LPA",
    description: "Build and ship features for Jio's consumer apps used by 450M+ subscribers. Work on performance optimisation, new feature development, and A/B experimentation at scale.",
    requirements: "3+ years Android (Kotlin) · MVVM/MVI architecture · Jetpack Compose · REST APIs · Familiarity with large-scale app performance",
    featured: true,
  },
  {
    title: "Network Engineer",
    companyName: "Bharti Airtel",
    location: "Gurugram, Haryana",
    type: "full-time", level: "mid",
    salary: "₹8–13 LPA",
    description: "Plan, deploy, and optimise Airtel's 4G/5G network infrastructure across circles. Troubleshoot network issues, perform capacity planning, and coordinate with OEM partners.",
    requirements: "3–5 years telecom networking · CCNA/CCNP preferred · 4G LTE or 5G knowledge · Network troubleshooting · Linux familiarity",
    featured: false,
  },
  {
    title: "Software Engineer — Payments Platform",
    companyName: "HDFC Bank",
    location: "Mumbai, Maharashtra",
    type: "full-time", level: "senior",
    salary: "₹18–28 LPA",
    description: "Build reliable, highly available payment processing services handling millions of transactions per day. Design for fault tolerance, observability, and regulatory compliance.",
    requirements: "5–8 years backend engineering · Java or Go · Payment systems or fintech · Event-driven architecture · Strong understanding of consistency and distributed systems",
    featured: false,
  },
  {
    title: "Data Engineer — Analytics Platform",
    companyName: "ICICI Bank",
    location: "Mumbai, Maharashtra",
    type: "full-time", level: "mid",
    salary: "₹11–18 LPA",
    description: "Design and build data pipelines, data warehouse models, and real-time streaming systems powering ICICI's analytics and credit risk models.",
    requirements: "3+ years data engineering · Python · Spark / Flink · Apache Kafka · SQL · Cloud data warehouse (Redshift, BigQuery, or Snowflake)",
    featured: false,
  },
  {
    title: "Product Manager — Digital Services",
    companyName: "Larsen & Toubro",
    location: "Mumbai, Maharashtra",
    type: "full-time", level: "senior",
    salary: "₹20–35 LPA",
    description: "Own the product roadmap for L&T's digital construction and engineering platforms. Define strategy, prioritise features based on customer and business needs, and lead cross-functional delivery.",
    requirements: "5+ years product management · B2B enterprise software · Strong analytical skills · Stakeholder management · MBA or engineering background preferred",
    featured: true,
  },
  {
    title: "Embedded Software Engineer",
    companyName: "Mahindra & Mahindra",
    location: "Pune, Maharashtra",
    type: "full-time", level: "mid",
    salary: "₹10–16 LPA",
    description: "Develop embedded software for Mahindra's EV and connected vehicle platforms, including ADAS, powertrain control, and telematics modules.",
    requirements: "3–5 years embedded C/C++ · RTOS · CAN/LIN protocols · Automotive software standards (AUTOSAR, ISO 26262) a plus",
    featured: false,
  },
  {
    title: "UI/UX Designer",
    companyName: "Tata Motors",
    location: "Pune, Maharashtra",
    type: "full-time", level: "mid",
    salary: "₹9–15 LPA",
    description: "Design intuitive in-vehicle infotainment interfaces and companion mobile apps for Tata Motors' EV lineup. Conduct user research, create wireframes, and collaborate with engineering.",
    requirements: "3+ years product design · Figma · User research · Interaction design · Automotive or mobility domain a plus",
    featured: false,
  },
  {
    title: "Associate Software Engineer",
    companyName: "Axis Bank",
    location: "Mumbai, Maharashtra",
    type: "full-time", level: "entry",
    salary: "₹5–8 LPA",
    description: "Join Axis Bank's technology team building digital banking features for retail and corporate customers. Gain hands-on experience across the SDLC in a large-scale financial system.",
    requirements: "B.Tech/BCA · Proficiency in any backend language (Java/Python/Node.js) · SQL basics · Strong problem-solving · Good communication",
    featured: false,
  },
  {
    title: "SDE Intern — Core Banking",
    companyName: "State Bank of India",
    location: "Mumbai, Maharashtra",
    type: "internship", level: "entry",
    salary: "₹20,000–35,000/month",
    description: "6-month internship working with SBI's technology modernisation team on core banking and digital channels. Build features, write tests, and participate in real production deployments under mentorship.",
    requirements: "Final-year B.Tech/BCA · Any programming language · Eagerness to learn banking technology · Good analytical skills",
    featured: false,
  },
  {
    title: "Technical Support Engineer",
    companyName: "Kotak Mahindra Bank",
    location: "Mumbai, Maharashtra",
    type: "full-time", level: "entry",
    salary: "₹4–7 LPA",
    description: "Provide Level 2 technical support for Kotak's digital banking applications. Diagnose and resolve issues reported by internal teams and customers, working closely with development and infrastructure.",
    requirements: "1–2 years technical support or IT · Basic networking · SQL for log analysis · Good customer communication · Banking application experience a plus",
    featured: false,
  },
];

// ─── Seed runner ──────────────────────────────────────────────────────────────
async function seed() {
  console.log("🌱 Seeding CareerConnect demo data (Indian companies)...\n");
  console.log("NOTE: All company names, job postings, and salary figures are");
  console.log("illustrative demo content only — not real job offers.\n");

  /* ── Companies ── */
  const existingCos = await db.select().from(schema.companiesTable);
  let companies = existingCos;

  if (existingCos.length === 0) {
    console.log("  Creating companies...");
    companies = await db.insert(schema.companiesTable)
      .values(COMPANIES.map(c => ({ ...c, logo: null })))
      .returning();
    console.log(`  ✅ Created ${companies.length} companies`);
  } else {
    console.log(`  ℹ️  ${existingCos.length} companies already exist, skipping`);
  }

  const byName = new Map(companies.map(c => [c.name, c]));

  /* ── Demo users ── */
  const demoUsers = [
    { email: "alex@example.com",   name: "Arjun Sharma",    role: "jobseeker", pw: "password123", companyId: null as number | null, skills: "JavaScript, React, Node.js, TypeScript, PostgreSQL", loc: "Bengaluru, Karnataka" },
    { email: "sarah@example.com",  name: "Shreya Nair",     role: "recruiter", pw: "password123", companyId: byName.get("Infosys")?.id ?? null, skills: null, loc: "Hyderabad, Telangana" },
    { email: "marcus@example.com", name: "Manish Kapoor",   role: "admin",     pw: "password123", companyId: null, skills: null, loc: "Pune, Maharashtra" },
  ];

  for (const u of demoUsers) {
    const existing = await db.select().from(schema.usersTable).where(eq(schema.usersTable.email, u.email));
    if (existing.length > 0) { console.log(`  ℹ️  User ${u.email} already exists`); continue; }
    const [created] = await db.insert(schema.usersTable).values({
      email: u.email, name: u.name, role: u.role,
      passwordHash: hash(u.pw), companyId: u.companyId,
      location: u.loc, skills: u.skills,
    }).returning();
    console.log(`  ✅ Created user: ${created.email} (${created.role})`);
  }

  /* ── Jobs ── */
  const existingJobs = await db.select().from(schema.jobsTable);
  if (existingJobs.length === 0) {
    console.log("  Creating jobs...");
    const recruiterId = (await db.select().from(schema.usersTable).where(eq(schema.usersTable.email, "sarah@example.com")))[0]?.id ?? null;

    const rows = JOBS
      .map(j => {
        const co = byName.get(j.companyName);
        if (!co) { console.warn(`  ⚠️  Company not found: ${j.companyName}`); return null; }
        return { title: j.title, companyId: co.id, location: j.location, type: j.type, level: j.level, description: j.description, requirements: j.requirements, salary: j.salary, featured: j.featured, active: true, postedById: recruiterId };
      })
      .filter((j): j is NonNullable<typeof j> => j !== null);

    await db.insert(schema.jobsTable).values(rows);
    console.log(`  ✅ Created ${rows.length} jobs`);
  } else {
    console.log(`  ℹ️  ${existingJobs.length} jobs already exist, skipping`);
  }

  await pool.end();
  console.log("\n✅ Seed complete!\n");
  console.log("Demo accounts:");
  console.log("  Job seeker : alex@example.com  / password123");
  console.log("  Recruiter  : sarah@example.com / password123");
  console.log("  Admin      : marcus@example.com / password123");
}

seed().catch(err => { console.error("❌ Seed failed:", err.message); process.exit(1); });
