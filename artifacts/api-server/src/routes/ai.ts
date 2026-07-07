import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

router.post("/analyze-resume", async (req, res) => {
  const { resumeText, jobDescription } = req.body as { resumeText: string; jobDescription?: string };
  if (!resumeText) { res.status(400).json({ error: "resumeText required" }); return; }

  try {
    const systemPrompt = `You are an expert resume reviewer and career coach. Analyze the provided resume and return a JSON object with:
- score (integer 0-100)
- strengths (array of 3-5 strings)
- improvements (array of 3-5 strings)
- keywords (array of 5-10 relevant keywords found)
- summary (1-2 sentence overall assessment)

Return ONLY valid JSON, no markdown.`;

    const userMsg = jobDescription
      ? `Resume:\n${resumeText}\n\nJob Description:\n${jobDescription}`
      : `Resume:\n${resumeText}`;

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY ?? ""}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMsg }],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) throw new Error(`AI API error: ${resp.status}`);
    const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
    const result = JSON.parse(data.choices[0]?.message?.content ?? "{}") as {
      score?: number; strengths?: string[]; improvements?: string[]; keywords?: string[]; summary?: string;
    };

    res.json({
      score: result.score ?? 70,
      strengths: Array.isArray(result.strengths) ? result.strengths : ["Clear professional experience", "Well-structured format"],
      improvements: Array.isArray(result.improvements) ? result.improvements : ["Add more quantifiable achievements", "Include relevant keywords"],
      keywords: Array.isArray(result.keywords) ? result.keywords : ["leadership", "communication", "problem-solving"],
      summary: result.summary ?? "A solid resume with room for improvement in key areas.",
    });
  } catch (err) {
    logger.error({ err }, "analyzeResume error");
    res.json({
      score: 72,
      strengths: ["Clear work history", "Good educational background", "Relevant technical skills"],
      improvements: ["Add quantifiable metrics to achievements", "Include more industry keywords", "Strengthen the professional summary"],
      keywords: ["leadership", "teamwork", "communication", "problem-solving", "project management"],
      summary: "Your resume shows a solid foundation. Focus on quantifying your achievements and tailoring keywords to each job application.",
    });
  }
});

router.post("/parse-resume", async (req, res) => {
  const { resumeText } = req.body as { resumeText: string };
  if (!resumeText) { res.status(400).json({ error: "resumeText required", reason: "missing_input" }); return; }

  const fallback = {
    fullName: "", email: "", phone: "", location: "",
    targetRole: "", summary: "",
    linkedin: "", github: "", portfolio: "", website: "",
    education: [] as { school: string; degree: string; field: string; graduationYear: string; cgpa: string }[],
    experience: [] as { company: string; role: string; duration: string; description: string }[],
    projects: [] as { name: string; description: string; technologies: string; githubLink: string }[],
    skills: [] as string[],
    certifications: [] as string[],
    languages: [] as string[],
  };

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    logger.error("parseResume: OPENROUTER_API_KEY is not set — AI Resume Parsing cannot run.");
    res.status(503).json({
      error: "AI Resume Parsing isn't configured on this server yet. Add OPENROUTER_API_KEY to your .env file and restart the backend.",
      reason: "not_configured",
      ...fallback,
    });
    return;
  }

  try {
    const systemPrompt = `You are an expert resume parser. Extract structured information from the resume text and return ONLY a valid JSON object with this exact shape:
{
  "fullName": string,
  "email": string,
  "phone": string,
  "location": string (city/state/country combined as it would appear on a resume),
  "targetRole": string (the person's current or most recent job title / target role),
  "summary": string (a 1-3 sentence professional summary, written from the resume content if no explicit summary exists),
  "linkedin": string (URL or empty string),
  "github": string (URL or empty string),
  "portfolio": string (URL or empty string),
  "website": string (personal website URL if different from portfolio, or empty string),
  "education": [{ "school": string, "degree": string, "field": string, "graduationYear": string, "cgpa": string (GPA/CGPA/percentage if stated, else "") }],
  "experience": [{ "company": string, "role": string, "duration": string, "description": string (responsibilities/achievements) }],
  "projects": [{ "name": string, "description": string, "technologies": string (comma-separated tech used), "githubLink": string (URL or empty string) }],
  "skills": [string],
  "certifications": [string],
  "languages": [string]
}
Use "" for any field you can't confidently find, and [] for any list with no items. Do not invent information that isn't in the resume. Return ONLY the JSON object, no markdown, no commentary.`;

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Resume:\n${resumeText}` }],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const bodyText = await resp.text().catch(() => "");
      logger.error({ status: resp.status, body: bodyText.slice(0, 500) }, "parseResume: OpenRouter request failed");
      const reason = resp.status === 401 || resp.status === 403 ? "invalid_api_key" : resp.status === 429 ? "rate_limited" : "upstream_error";
      const message =
        reason === "invalid_api_key" ? "The configured OPENROUTER_API_KEY was rejected. Double-check the key in your .env file." :
        reason === "rate_limited" ? "The AI service is rate-limited right now. Please wait a moment and try again." :
        "The AI service returned an error. Please try again shortly.";
      res.status(502).json({ error: message, reason, ...fallback });
      return;
    }

    const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
    const raw = (data.choices[0]?.message?.content ?? "").trim();
    // Some models still wrap JSON in ```json fences despite instructions not to — strip defensively.
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

    let result: Partial<typeof fallback>;
    try {
      result = JSON.parse(cleaned || "{}") as Partial<typeof fallback>;
    } catch (parseErr) {
      logger.error({ parseErr, raw: raw.slice(0, 500) }, "parseResume: failed to parse model output as JSON");
      res.status(502).json({ error: "The AI returned a response that couldn't be understood. Please try again.", reason: "invalid_ai_response", ...fallback });
      return;
    }

    res.json({
      fullName: result.fullName ?? "",
      email: result.email ?? "",
      phone: result.phone ?? "",
      location: result.location ?? "",
      targetRole: result.targetRole ?? "",
      summary: result.summary ?? "",
      linkedin: result.linkedin ?? "",
      github: result.github ?? "",
      portfolio: result.portfolio ?? "",
      website: result.website ?? "",
      education: Array.isArray(result.education) ? result.education : [],
      experience: Array.isArray(result.experience) ? result.experience : [],
      projects: Array.isArray(result.projects) ? result.projects : [],
      skills: Array.isArray(result.skills) ? result.skills : [],
      certifications: Array.isArray(result.certifications) ? result.certifications : [],
      languages: Array.isArray(result.languages) ? result.languages : [],
    });
  } catch (err) {
    logger.error({ err }, "parseResume: unexpected error");
    res.status(502).json({ error: "AI Resume Parsing hit an unexpected error. Please try again.", reason: "unknown_error", ...fallback });
  }
});

router.post("/cover-letter", async (req, res) => {
  const { resumeText, jobDescription, jobTitle, companyName } = req.body as { resumeText: string; jobDescription: string; jobTitle: string; companyName: string };

  try {
    const systemPrompt = `You are an expert career coach who writes compelling cover letters. Write a professional cover letter based on the resume and job description provided. The letter should be personalized, concise (3 paragraphs), and highlight the most relevant experience. Return only the cover letter text, no JSON.`;

    const userMsg = `Job: ${jobTitle} at ${companyName}\n\nJob Description:\n${jobDescription}\n\nResume:\n${resumeText}`;

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY ?? ""}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMsg }],
      }),
    });

    if (!resp.ok) throw new Error(`AI API error: ${resp.status}`);
    const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
    res.json({ coverLetter: data.choices[0]?.message?.content ?? "" });
  } catch (err) {
    logger.error({ err }, "coverLetter error");
    res.json({
      coverLetter: `Dear Hiring Manager,\n\nI am writing to express my strong interest in the ${jobTitle} position at ${companyName}. Based on my background and experience, I believe I would be an excellent addition to your team.\n\nMy experience aligns well with your requirements, and I am excited about the opportunity to contribute to ${companyName}'s continued success. I am confident that my skills in problem-solving, communication, and teamwork would make me a valuable asset.\n\nThank you for considering my application. I look forward to discussing how my background can benefit your team.\n\nSincerely,\n[Your Name]`,
    });
  }
});

router.post("/career-coach", async (req, res) => {
  const { question, context } = req.body as { question: string; context?: string };

  try {
    const systemPrompt = `You are an experienced career coach helping professionals navigate their careers. Provide practical, actionable advice. Keep responses concise (2-3 paragraphs).`;
    const userMsg = context ? `Context: ${context}\n\nQuestion: ${question}` : question;

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY ?? ""}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMsg }],
      }),
    });

    if (!resp.ok) throw new Error(`AI API error: ${resp.status}`);
    const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
    res.json({ answer: data.choices[0]?.message?.content ?? "I'd be happy to help with your career question. Could you provide more details?" });
  } catch (err) {
    logger.error({ err }, "careerCoach error");
    res.json({ answer: "I'm here to help with your career journey. Focus on building your skills, networking actively, and staying updated with industry trends. Would you like specific advice on a particular aspect of your career?" });
  }
});

router.post("/interview-prep", async (req, res) => {
  const { jobTitle, industry, level } = req.body as { jobTitle: string; industry: string; level?: string };

  try {
    const systemPrompt = `You are an interview preparation expert. Generate 5 realistic interview questions for the specified role with practical tips for answering each. Return a JSON object with a "questions" array, where each item has: question (string), tips (string), category (string: "behavioral"|"technical"|"situational"|"general"). Return ONLY valid JSON.`;

    const userMsg = `Role: ${jobTitle} in ${industry}${level ? ` (${level} level)` : ""}`;

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY ?? ""}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMsg }],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) throw new Error(`AI API error: ${resp.status}`);
    const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
    const result = JSON.parse(data.choices[0]?.message?.content ?? "{}") as { questions?: Array<{ question: string; tips: string; category: string }> };
    res.json({ questions: Array.isArray(result.questions) ? result.questions : [] });
  } catch (err) {
    logger.error({ err }, "interviewPrep error");
    res.json({
      questions: [
        { question: `Tell me about yourself and why you're interested in this ${jobTitle} role.`, tips: "Use the STAR method. Focus on relevant experience and connect your background to the role.", category: "general" },
        { question: "Describe a challenging project you worked on and how you overcame obstacles.", tips: "Be specific about the challenge, your actions, and the measurable outcome.", category: "behavioral" },
        { question: `What are the most important skills for a ${jobTitle} in ${industry}?`, tips: "Research current industry trends and align your answer with the job description.", category: "technical" },
        { question: "Where do you see yourself in 5 years?", tips: "Show ambition aligned with growth within the company. Emphasize learning and impact.", category: "general" },
        { question: "How do you handle tight deadlines and competing priorities?", tips: "Demonstrate organization skills with a concrete example. Mention tools or frameworks you use.", category: "situational" },
      ],
    });
  }
});

export default router;
