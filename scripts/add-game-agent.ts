import { PrismaClient, Prisma } from "@prisma/client";
import { downloadAndUploadToR2 } from "../lib/r2-storage";

const prisma = new PrismaClient();

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const SERPER_API_KEY = process.env.SERPER_API_KEY ?? "e5e0cb6d3ff90fe8ad121fbb9fccb01cae19cd23";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

interface ScrapedGameData {
  title: string;
  rawDescription: string;
  sonarInfo: string;
  website: string;
  screenshot: string;
  gameplayImages: string[]; // Array of gameplay images for fallback
  genres: string[];
  platforms: string[];
  releaseDate?: string;
  sources: string[];
}

interface GameData {
  title: string;
  description: string;
  screenshot: string;
  website: string;
  categorySlug?: string;
  summary?: string;
  featureSummary?: string;
  genreTags: string[];
  platformTags: string[];
  gameplayTags: string[];
  worldTags: string[];
  visualStyleTags: string[];
  monetization?: string | null;
  idealFor?: string | null;
  systemRequirements?: Prisma.JsonValue | null;
  ragProfile?: Prisma.JsonValue | null;
  sourceUrls: string[];
}

interface StructuredProfile {
  summary: string | null;
  featureSummary: string | null;
  genreTags: string[];
  platformTags: string[];
  gameplayTags: string[];
  worldTags: string[];
  visualStyleTags: string[];
  monetization: string | null;
  idealFor: string | null;
  systemRequirements: Prisma.JsonValue | null;
  ragProfile: Prisma.JsonValue | null;
}

function extractJsonFromContent(content: string): Record<string, unknown> | null {
  const fenceMatch = content.match(/```json([\s\S]*?)```/i);
  const rawBlock = fenceMatch ? fenceMatch[1] : content;
  const start = rawBlock.indexOf("{");
  const end = rawBlock.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  const candidate = rawBlock.slice(start, end + 1);
  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Extract text content from HTML
 */
function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Search using Serper.dev API for game information
 */
async function searchGoogle(gameTitle: string): Promise<string[]> {
  console.log(`  🔍 Searching Google (via Serper) for: "${gameTitle}"`);

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: `${gameTitle} game info`,
        num: 10,
      }),
    });

    if (!response.ok) {
      console.warn(`  ⚠️  Serper search failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const results = data?.organic || [];

    // Extract URLs from search results
    const urls = results.map((result: any) => result.link).filter(Boolean);

    // Filter for relevant game websites
    const relevantUrls = urls
      .filter((url: string) => {
        const lower = url.toLowerCase();
        return (
          !lower.includes("youtube.com") &&
          !lower.includes("facebook.com") &&
          !lower.includes("twitter.com") &&
          !lower.includes("instagram.com") &&
          (lower.includes("steam") ||
           lower.includes("playstation") ||
           lower.includes("xbox") ||
           lower.includes("nintendo") ||
           lower.includes("game") ||
           lower.includes(gameTitle.toLowerCase().replace(/\s+/g, "")))
        );
      })
      .slice(0, 10);

    console.log(`  ✓ Found ${relevantUrls.length} potential sources`);
    return relevantUrls;
  } catch (error) {
    console.error(`  ❌ Serper search error:`, error);
    return [];
  }
}

/**
 * Search for gameplay images using Serper.dev image search
 * Returns array of valid image URLs
 */
async function searchGameplayImage(gameTitle: string): Promise<string[]> {
  console.log(`  🖼️  Searching for gameplay images...`);

  try {
    const response = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: `${gameTitle} screenshot gameplay 2025`,
        num: 20, // Get more results for fallback options
      }),
    });

    if (!response.ok) {
      console.warn(`  ⚠️  Image search failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const images = data?.images || [];

    if (images.length === 0) {
      console.log(`  ⚠️  No gameplay images found`);
      return [];
    }

    // Filter out YouTube thumbnails and other unwanted sources
    const validImages = images
      .filter((img: any) => {
        const url = img?.imageUrl || "";
        return (
          url &&
          !url.includes("i.ytimg.com") &&
          !url.includes("ytimg.com") &&
          !url.includes("youtube.com") &&
          !url.includes("data:image") && // Skip data URIs
          (url.startsWith("http://") || url.startsWith("https://"))
        );
      })
      .map((img: any) => img.imageUrl);

    if (validImages.length === 0) {
      console.log(`  ⚠️  No valid gameplay images found after filtering`);
      return [];
    }

    console.log(`  ✓ Found ${validImages.length} gameplay images`);
    return validImages;
  } catch (error) {
    console.error(`  ❌ Image search error:`, error);
    return [];
  }
}

/**
 * Search Reddit for game discussions and player insights
 */
async function searchReddit(gameTitle: string): Promise<string> {
  console.log(`  🔍 Searching Reddit for player insights...`);

  const searchQuery = encodeURIComponent(`${gameTitle} game`);
  const searchUrl = `https://www.reddit.com/search.json?q=${searchQuery}&sort=relevance&limit=10`;

  try {
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.warn(`  ⚠️  Reddit search failed: ${response.status}`);
      return "";
    }

    const data = await response.json();
    const posts = data?.data?.children || [];

    if (posts.length === 0) {
      console.log(`  ⚠️  No Reddit posts found`);
      return "";
    }

    // Extract titles and self-text from posts
    const insights = posts
      .slice(0, 5)
      .map((post: any) => {
        const title = post.data?.title || "";
        const selftext = post.data?.selftext || "";
        return `${title} ${selftext}`.slice(0, 500);
      })
      .join(" ");

    console.log(`  ✓ Found Reddit discussions (${posts.length} posts)`);
    return insights;
  } catch (error) {
    console.error(`  ❌ Reddit search error:`, error);
    return "";
  }
}

/**
 * Search using Perplexity Sonar for real-time game information
 */
async function searchWithSonar(gameTitle: string): Promise<string> {
  if (!OPENROUTER_KEY) {
    console.log(`  ⚠️  Skipping Sonar search (no OpenRouter key)`);
    return "";
  }

  console.log(`  🔮 Searching with Perplexity Sonar...`);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": APP_URL,
        "X-Title": "MMOPLAYA Game Agent",
      },
      body: JSON.stringify({
        model: "perplexity/sonar",
        messages: [
          {
            role: "user",
            content: `Search for comprehensive information about the video game "${gameTitle}". Include: official website, release date, genres, platforms, key gameplay features, and what makes it unique. Focus on factual information from reliable gaming sources.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.warn(`  ⚠️  Sonar search failed: ${response.status}`);
      return "";
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      console.warn(`  ⚠️  No response from Sonar`);
      return "";
    }

    console.log(`  ✓ Sonar found comprehensive game information`);
    return content;
  } catch (error) {
    console.error(`  ❌ Sonar search error:`, error);
    return "";
  }
}

/**
 * Scrape a website for game information
 */
async function scrapeWebsite(url: string): Promise<{ text: string; screenshot: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      return { text: "", screenshot: "" };
    }

    const html = await response.text();

    // Extract meta description
    const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    const metaDesc = metaDescMatch?.[1] || "";

    // Extract og:description
    const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
    const ogDesc = ogDescMatch?.[1] || "";

    // Extract screenshots - try multiple meta tags
    let screenshot = "";

    // Try og:image (most common)
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    screenshot = ogImageMatch?.[1] || "";

    // Try twitter:image if og:image not found
    if (!screenshot) {
      const twitterImageMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
      screenshot = twitterImageMatch?.[1] || "";
    }

    // Try twitter:image:src
    if (!screenshot) {
      const twitterImageSrcMatch = html.match(/<meta\s+property=["']twitter:image:src["']\s+content=["']([^"']+)["']/i);
      screenshot = twitterImageSrcMatch?.[1] || "";
    }

    // Try image_src link tag
    if (!screenshot) {
      const imageSrcMatch = html.match(/<link\s+rel=["']image_src["']\s+href=["']([^"']+)["']/i);
      screenshot = imageSrcMatch?.[1] || "";
    }

    // Extract main content text
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyHtml = bodyMatch?.[1] || html;
    const bodyText = extractTextFromHtml(bodyHtml).slice(0, 2000);

    const combinedText = `${metaDesc} ${ogDesc} ${bodyText}`;

    return { text: combinedText, screenshot };
  } catch (error) {
    return { text: "", screenshot: "" };
  }
}

/**
 * Gather game information from web sources
 */
async function gatherGameInfo(gameTitle: string): Promise<ScrapedGameData | null> {
  console.log(`\n📡 Gathering information from the web...\n`);

  // Step 1: Search with Perplexity Sonar for comprehensive info
  const sonarInfo = await searchWithSonar(gameTitle);

  // Step 2: Search Google for relevant URLs
  const urls = await searchGoogle(gameTitle);

  if (urls.length === 0 && !sonarInfo) {
    console.error("❌ Could not find any relevant sources");
    return null;
  }

  // Step 3: Search Reddit for community insights
  const redditInsights = await searchReddit(gameTitle);

  // Step 3: Scrape multiple sources
  console.log(`\n  📄 Scraping ${Math.min(urls.length, 10)} sources...`);

  let combinedDescription = redditInsights;
  let screenshot = "";
  let officialWebsite = "";
  const sources: string[] = [];

  for (let i = 0; i < Math.min(urls.length, 10); i++) {
    const url = urls[i];
    console.log(`    ${i + 1}. ${url.slice(0, 60)}...`);

    const scraped = await scrapeWebsite(url);

    if (scraped.text) {
      combinedDescription += " " + scraped.text;
      sources.push(url);
    }

    if (!screenshot && scraped.screenshot) {
      screenshot = scraped.screenshot;
    }

    // Prioritize official-looking websites
    if (!officialWebsite && (
      url.includes("steam") ||
      url.includes(".com") ||
      url.includes("official")
    )) {
      officialWebsite = url;
    }

    // Add delay to be respectful
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(`\n  ✓ Scraped ${sources.length} sources successfully`);

  // Always search for gameplay images - they're more representative than og:image tags
  console.log(`\n  📸 Searching for gameplay images...`);
  const gameplayImages = await searchGameplayImage(gameTitle);

  // Prefer gameplay image over scraped screenshot (og:image is often just a logo)
  if (gameplayImages.length > 0) {
    screenshot = gameplayImages[0]; // Will try fallbacks during upload
  } else if (screenshot) {
    console.log(`  ↪️  Using scraped screenshot as fallback`);
  }

  if (!combinedDescription && !sonarInfo) {
    console.error("❌ Could not extract meaningful information");
    return null;
  }

  return {
    title: gameTitle,
    rawDescription: combinedDescription.slice(0, 5000), // Limit for AI processing
    sonarInfo: sonarInfo.slice(0, 2000), // Limit Sonar info
    website: officialWebsite || urls[0] || "",
    screenshot,
    gameplayImages, // Include full array for fallback during upload
    genres: [],
    platforms: [],
    sources,
  };
}

/**
 * Use AI to analyze scraped data and create description
 */
async function analyzeGameWithAI(
  scrapedData: ScrapedGameData,
  availableCategories: Array<{ value: string; label: string }>
): Promise<{ description: string; categorySlug: string | null }> {
  if (!OPENROUTER_KEY) {
    console.warn("⚠️  OPENROUTER_API_KEY not set, using fallback description");
    return {
      description: scrapedData.rawDescription.slice(0, 1200),
      categorySlug: null,
    };
  }

  const categoriesList = availableCategories
    .map((cat) => `- ${cat.value}: ${cat.label}`)
    .join("\n");

  const sonarSection = scrapedData.sonarInfo
    ? `\n\nPerplexity Sonar Research (most reliable):\n${scrapedData.sonarInfo}\n`
    : "";

  const prompt = `You are a game database curator. Based on multiple sources of information about "${scrapedData.title}", create:

1. A comprehensive, well-formatted description (MAX 1200 characters) with the following structure:

**Overview** (2-3 sentences): What is the game and why is it notable?

**Gameplay** (3-4 sentences): Core mechanics, game modes, player experience. Be specific about what players actually do.

**Features** (2-3 sentences): Key features that make it unique - multiplayer, progression systems, customization, etc.

**Community & Appeal** (1-2 sentences): Who plays it, what makes it popular, target audience.

2. The most appropriate category from the available list
${sonarSection}
Web Scraped Content:
${scrapedData.rawDescription}

Available categories:
${categoriesList}

IMPORTANT:
- Description should be close to 1200 characters (use the space!)
- Use the markdown format with **bold headers** as shown above
- Make it exciting, informative, and player-focused
- Prioritize information from Perplexity Sonar (if available) as it's most accurate
- Extract real facts from the content, don't make things up
- Be specific about gameplay mechanics and features
- Write in engaging, natural language
- If you can't determine a category, set it to null

Respond in JSON format:
{
  "description": "Your formatted description here (use markdown, ~1200 chars)",
  "categorySlug": "category_value_here or null"
}`;

  console.log(`\n🤖 Analyzing content with AI...\n`);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": APP_URL,
        "X-Title": "MMOPLAYA Game Agent",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-haiku",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("No response from AI");
    }

    // Extract description and category using regex instead of JSON parsing
    // This is more robust against formatting issues
    let description = scrapedData.rawDescription.slice(0, 1200);
    let categorySlug: string | null = null;

    // Try to extract description (between "description": " and next ")
    const descMatch = content.match(/"description"\s*:\s*"([\s\S]*?)"\s*[,}]/);
    if (descMatch) {
      // Unescape the JSON string and clean it
      description = descMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "")
        .replace(/\\t/g, " ")
        .replace(/\\\\/g, "\\")
        .replace(/\\"/g, '"')
        .slice(0, 1200);
    }

    // Try to extract category slug
    const categoryMatch = content.match(/"categorySlug"\s*:\s*"([^"]+)"|"categorySlug"\s*:\s*null/);
    if (categoryMatch) {
      categorySlug = categoryMatch[1] || null;
    }

    console.log(`  ✓ AI analysis complete`);

    return {
      description,
      categorySlug,
    };
  } catch (error) {
    console.error("  ❌ AI analysis failed:", error);
    console.log("  ↪️  Using fallback description");

    return {
      description: scrapedData.rawDescription.slice(0, 1200),
      categorySlug: null,
    };
  }
}

/**
 * Generate structured metadata for richer RAG/embedding content
 */
async function generateStructuredProfile(
  scrapedData: ScrapedGameData,
  analyzedDescription: string
): Promise<StructuredProfile> {
  const fallback: StructuredProfile = {
    summary: analyzedDescription.slice(0, 500) || scrapedData.rawDescription.slice(0, 500) || null,
    featureSummary: null,
    genreTags: [],
    platformTags: [],
    gameplayTags: [],
    worldTags: [],
    visualStyleTags: [],
    monetization: null,
    idealFor: null,
    systemRequirements: null,
    ragProfile: null,
  };

  if (!OPENROUTER_KEY) {
    console.warn("⚠️  OPENROUTER_API_KEY not set, skipping structured profile generation");
    return fallback;
  }

  const combinedSources = [
    analyzedDescription,
    scrapedData.sonarInfo,
    scrapedData.rawDescription,
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 12000);

  const prompt = `You curate a knowledge base for MMORPG matchmaking. Based ONLY on the provided research, produce a JSON object capturing attributes players care about when choosing a game.

IMPORTANT RESPONSE RULES:
- Output MUST be valid JSON.
- Wrap the JSON in a \`\`\`json ... \`\`\` code block.
- Do NOT include commentary, explanations, or any text outside the JSON block.
- If data is unavailable, use null or an empty array.

Focus on grounded facts that appear in the text. If a field is unknown, use null or an empty array. Keep strings concise but descriptive.

Required JSON schema:
{
  "summary": "Concise 2-3 sentence overview capturing tone, world, and hook",
  "featureSummary": "Bullet-style paragraph (use plain text with • markers) highlighting standout mechanics, progression, social or competitive hooks, and content cadence",
  "genreTags": ["broad and sub-genre labels (e.g., mmorpg, sandbox, action combat)"],
  "platformTags": ["platforms or ecosystems (pc, xbox, playstation, mobile, cloud, browser)"],
  "gameplayTags": ["mechanics and experience notes (tab-target combat, action dodge, crafting-focused, raid-heavy, card-based, etc)"],
  "worldTags": ["world scope or structure (seamless open world, instanced hubs, procedural maps, turn-based arenas, etc)"],
  "visualStyleTags": ["visual/audio tone (stylized fantasy, grimdark realistic, anime, voxel, retro pixel, etc)"],
  "monetization": "Plain sentence on business model and monetization beats",
  "idealFor": "Plain sentence describing player archetypes who will enjoy it",
  "systemRequirements": {
    "minimum": { "cpu": "...", "gpu": "...", "ram": "...", "storage": "...", "notes": "..." },
    "recommended": { "cpu": "...", "gpu": "...", "ram": "...", "storage": "...", "notes": "..." },
    "additionalNotes": "Any other performance considerations" 
  },
  "ragProfile": {
    "coreLoop": "Short paragraph describing moment-to-moment play",
    "gameplayPillars": ["combat", "crafting", "exploration", etc],
    "progression": "Leveling & gearing summary",
    "pveFocus": "PVE emphasis or null",
    "pvpFocus": "PVP emphasis or null",
    "groupTypes": "Typical party/raid sizes or solo emphasis",
    "sessionPace": "Short, medium, long, grind-heavy, etc",
    "difficulty": "Relative difficulty or skill expectations",
    "socialFeatures": ["guilds, trading, housing, voice, etc"],
    "interfaceStyle": "HUD & control notes",
    "worldStructure": "Open world, hub-based, shard, instanced, etc",
    "notableMechanics": ["unique mechanics worth highlighting"],
    "extraInsights": ["any other key insights or community sentiments"]
  }
}

Research input (truncate if necessary):
${combinedSources}`;

  console.log(`\n🧠 Generating structured profile...`);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": APP_URL,
        "X-Title": "MMOPLAYA Game Agent",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-haiku",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content?.trim();

    if (!rawContent) {
      throw new Error("No response from model");
    }

    const parsed = extractJsonFromContent(rawContent);

    if (!parsed) {
      throw new Error("Model response did not contain valid JSON");
    }

    const toStringArray = (value: unknown): string[] =>
      Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];

    const profile: StructuredProfile = {
      summary: typeof parsed.summary === "string" && parsed.summary.trim().length > 0 ? parsed.summary.trim() : fallback.summary,
      featureSummary:
        typeof parsed.featureSummary === "string" && parsed.featureSummary.trim().length > 0
          ? parsed.featureSummary.trim()
          : fallback.featureSummary,
      genreTags: toStringArray(parsed.genreTags),
      platformTags: toStringArray(parsed.platformTags),
      gameplayTags: toStringArray(parsed.gameplayTags),
      worldTags: toStringArray(parsed.worldTags),
      visualStyleTags: toStringArray(parsed.visualStyleTags),
      monetization:
        typeof parsed.monetization === "string" && parsed.monetization.trim().length > 0
          ? parsed.monetization.trim()
          : fallback.monetization,
      idealFor:
        typeof parsed.idealFor === "string" && parsed.idealFor.trim().length > 0
          ? parsed.idealFor.trim()
          : fallback.idealFor,
      systemRequirements:
        parsed.systemRequirements && typeof parsed.systemRequirements === "object"
          ? (parsed.systemRequirements as Prisma.JsonValue)
          : fallback.systemRequirements,
      ragProfile:
        parsed.ragProfile && typeof parsed.ragProfile === "object"
          ? (parsed.ragProfile as Prisma.JsonValue)
          : fallback.ragProfile,
    };

    console.log("  ✓ Structured profile generated");
    return profile;
  } catch (error) {
    console.error("  ⚠️  Structured profile generation failed:", error);
    return fallback;
  }
}

/**
 * Create a slug from game title
 */
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

/**
 * Add game to database
 */
async function addGameToDatabase(gameData: GameData): Promise<void> {
  const slug = createSlug(gameData.title);

  // Check if category exists
  let categoryId: string | undefined;
  if (gameData.categorySlug) {
    const category = await prisma.gameCategory.findUnique({
      where: { value: gameData.categorySlug },
    });
    categoryId = category?.id;
  }

  // Check if game already exists
  const existing = await prisma.game.findUnique({
    where: { value: slug },
  });

  if (existing) {
    console.log(`\n📝 Game "${gameData.title}" already exists (slug: ${slug})`);
    console.log("   Updating with new data...");

    const existingSourceUrls = Array.isArray(existing.sourceUrls)
      ? existing.sourceUrls.map((item: unknown) => String(item))
      : [];

    await prisma.game.update({
      where: { value: slug },
      data: {
        label: gameData.title,
        description: gameData.description,
        screenshot: gameData.screenshot || existing.screenshot,
        website: gameData.website || existing.website,
        categoryId: categoryId || existing.categoryId,
        summary: gameData.summary ?? existing.summary,
        featureSummary: gameData.featureSummary ?? existing.featureSummary,
        genreTags: gameData.genreTags.length > 0 ? gameData.genreTags : existing.genreTags ?? [],
        platformTags:
          gameData.platformTags.length > 0 ? gameData.platformTags : existing.platformTags ?? [],
        gameplayTags:
          gameData.gameplayTags.length > 0 ? gameData.gameplayTags : existing.gameplayTags ?? [],
        worldTags: gameData.worldTags.length > 0 ? gameData.worldTags : existing.worldTags ?? [],
        visualStyleTags:
          gameData.visualStyleTags.length > 0
            ? gameData.visualStyleTags
            : existing.visualStyleTags ?? [],
        monetization: typeof gameData.monetization !== "undefined" ? gameData.monetization : existing.monetization,
        idealFor: typeof gameData.idealFor !== "undefined" ? gameData.idealFor : existing.idealFor,
        systemRequirements:
          typeof gameData.systemRequirements !== "undefined"
            ? (gameData.systemRequirements ?? Prisma.JsonNull)
            : (existing.systemRequirements ?? Prisma.JsonNull),
        ragProfile:
          typeof gameData.ragProfile !== "undefined"
            ? (gameData.ragProfile ?? Prisma.JsonNull)
            : (existing.ragProfile ?? Prisma.JsonNull),
        sourceUrls: gameData.sourceUrls.length > 0 ? gameData.sourceUrls : existingSourceUrls,
      },
    });

    console.log("   ✓ Updated successfully!");
    return;
  }

  // Create new game
  await prisma.game.create({
    data: {
      value: slug,
      label: gameData.title,
      description: gameData.description,
      screenshot: gameData.screenshot || null,
      website: gameData.website || null,
      categoryId: categoryId || null,
      summary: gameData.summary ?? null,
      featureSummary: gameData.featureSummary ?? null,
      genreTags: gameData.genreTags,
      platformTags: gameData.platformTags,
      gameplayTags: gameData.gameplayTags,
      worldTags: gameData.worldTags,
      visualStyleTags: gameData.visualStyleTags,
      monetization: gameData.monetization ?? null,
      idealFor: gameData.idealFor ?? null,
      systemRequirements: gameData.systemRequirements ?? Prisma.JsonNull,
      ragProfile: gameData.ragProfile ?? Prisma.JsonNull,
      sourceUrls: gameData.sourceUrls,
    },
  });

  console.log(`\n✓ Game "${gameData.title}" added successfully!`);
  console.log(`   Slug: ${slug}`);
}

/**
 * Main function
 */
async function main() {
  const [, , gameTitle] = process.argv;

  if (!gameTitle) {
    console.log("Usage: pnpm add-game <game title>");
    console.log("\nExample: pnpm add-game 'World of Warcraft'");
    console.log("\nOptional environment variables:");
    console.log("  OPENROUTER_API_KEY - For Perplexity Sonar & AI-enhanced descriptions");
    console.log("  SERPER_API_KEY - For Google search (defaults to built-in key)");
    console.log("\nThis script will:");
    console.log("  1. Search with Perplexity Sonar (real-time web search)");
    console.log("  2. Search Google via Serper.dev API for game information");
    console.log("  3. Search Reddit for player insights");
    console.log("  4. Scrape relevant websites");
    console.log("  5. Use AI to create engaging description");
    console.log("  6. Add or update game in database");
    process.exit(1);
  }

  console.log(`\n🎮 Adding game: "${gameTitle}"`);
  console.log("━".repeat(60));

  // Step 1: Gather information from web
  const scrapedData = await gatherGameInfo(gameTitle);

  if (!scrapedData) {
    console.error("\n❌ Failed to gather sufficient information");
    process.exit(1);
  }

  console.log(`\n✓ Information gathered from ${scrapedData.sources.length} sources`);

  // Step 2: Get available categories
  const categories = await prisma.gameCategory.findMany({
    select: { value: true, label: true },
  });

  // Step 3: Analyze with AI
  const analysis = await analyzeGameWithAI(scrapedData, categories);

  // Step 3.5: Build structured profile for RAG
  const structuredProfile = await generateStructuredProfile(scrapedData, analysis.description);

  // Step 4: Download and upload screenshot to R2 with fallback logic
  let uploadedScreenshotUrl = "";

  // Build list of images to try (gameplay images first, then scraped screenshot)
  const imagesToTry = [...scrapedData.gameplayImages];
  if (scrapedData.screenshot && !scrapedData.gameplayImages.includes(scrapedData.screenshot)) {
    imagesToTry.push(scrapedData.screenshot);
  }

  if (imagesToTry.length > 0) {
    console.log(`\n📤 Downloading and uploading screenshot (${imagesToTry.length} candidates)...`);

    const slug = createSlug(gameTitle);
    let attemptNum = 0;

    for (const imageUrl of imagesToTry) {
      attemptNum++;

      // Skip if already uploaded to R2
      if (imageUrl.startsWith(process.env.R2_PUBLIC_URL || "")) {
        console.log(`  ${attemptNum}. Already on R2, using existing URL`);
        uploadedScreenshotUrl = imageUrl;
        break;
      }

      console.log(`  ${attemptNum}. Downloading: ${imageUrl.slice(0, 60)}...`);

      try {
        const ext = imageUrl.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
        const filename = `${slug}-${Date.now()}-${attemptNum}.${ext}`;

        // Download and upload (with validation inside downloadAndUploadToR2)
        uploadedScreenshotUrl = await downloadAndUploadToR2(
          imageUrl,
          "game-screenshots",
          filename
        );
        console.log(`  ✓ Downloaded and uploaded successfully`);
        break; // Success! Stop trying other images
      } catch (error) {
        console.error(`  ✗ Failed (${error instanceof Error ? error.message : String(error)})`);

        // If this was the last image, give up
        if (attemptNum === imagesToTry.length) {
          console.warn(`  ⚠️  All ${imagesToTry.length} images failed, no screenshot will be saved`);
          uploadedScreenshotUrl = "";
        } else {
          console.log(`  ↪️  Trying next image...`);
        }
      }
    }
  } else {
    console.log(`\n⚠️  No screenshots found to upload`);
  }

  // Step 5: Prepare game data
  const gameData: GameData = {
    title: gameTitle,
    description: analysis.description,
    screenshot: uploadedScreenshotUrl,
    website: scrapedData.website,
    categorySlug: analysis.categorySlug || undefined,
    summary: structuredProfile.summary ?? undefined,
    featureSummary: structuredProfile.featureSummary ?? undefined,
    genreTags: structuredProfile.genreTags,
    platformTags: structuredProfile.platformTags,
    gameplayTags: structuredProfile.gameplayTags,
    worldTags: structuredProfile.worldTags,
    visualStyleTags: structuredProfile.visualStyleTags,
    monetization: structuredProfile.monetization,
    idealFor: structuredProfile.idealFor,
    systemRequirements: structuredProfile.systemRequirements,
    ragProfile: structuredProfile.ragProfile,
    sourceUrls: scrapedData.sources,
  };

  console.log(`\n📋 Game Summary:`);
  console.log("━".repeat(60));
  console.log(`  Title: ${gameData.title}`);
  console.log(`  Description: ${gameData.description.slice(0, 100)}...`);
  console.log(`  Category: ${gameData.categorySlug || "None"}`);
  console.log(`  Screenshot: ${gameData.screenshot ? "✓" : "✗"}`);
  console.log(`  Website: ${gameData.website ? "✓" : "✗"}`);
  console.log(`  Tags: ${gameData.genreTags.slice(0, 6).join(", ") || "None"}`);

  // Step 6: Add to database
  console.log(`\n💾 Saving to database...`);
  await addGameToDatabase(gameData);

  console.log("\n✨ Done!");
  console.log("━".repeat(60));
}

main()
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
