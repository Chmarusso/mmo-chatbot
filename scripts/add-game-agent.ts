import { PrismaClient } from "@prisma/client";
import { downloadAndUploadToSupabase } from "../lib/supabase-storage";

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
 */
async function searchGameplayImage(gameTitle: string): Promise<string> {
  console.log(`  🖼️  Searching for gameplay images...`);

  try {
    const response = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: `${gameTitle} gameplay 2025`,
        num: 10,
      }),
    });

    if (!response.ok) {
      console.warn(`  ⚠️  Image search failed: ${response.status}`);
      return "";
    }

    const data = await response.json();
    const images = data?.images || [];

    if (images.length === 0) {
      console.log(`  ⚠️  No gameplay images found`);
      return "";
    }

    // Filter out YouTube thumbnails and find first valid image
    const validImages = images.filter((img: any) => {
      const url = img?.imageUrl || "";
      return url && !url.includes("i.ytimg.com");
    });

    if (validImages.length === 0) {
      console.log(`  ⚠️  No valid gameplay images found (filtered out YouTube thumbnails)`);
      return "";
    }

    const imageUrl = validImages[0]?.imageUrl || "";

    if (imageUrl) {
      console.log(`  ✓ Found gameplay image`);
    }

    return imageUrl;
  } catch (error) {
    console.error(`  ❌ Image search error:`, error);
    return "";
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

  // If no screenshot found from scraping, search for gameplay images
  if (!screenshot) {
    console.log(`\n  📸 No screenshot found in scraped sources, searching for gameplay images...`);
    screenshot = await searchGameplayImage(gameTitle);
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

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Ensure description is within limit
    const description = parsed.description?.slice(0, 1200) || scrapedData.rawDescription.slice(0, 1200);

    console.log(`  ✓ AI analysis complete`);

    return {
      description,
      categorySlug: parsed.categorySlug || null,
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

    await prisma.game.update({
      where: { value: slug },
      data: {
        label: gameData.title,
        description: gameData.description,
        screenshot: gameData.screenshot || existing.screenshot,
        website: gameData.website || existing.website,
        categoryId: categoryId || existing.categoryId,
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

  // Step 4: Upload screenshot to Supabase if we have one
  let uploadedScreenshotUrl = scrapedData.screenshot;
  if (scrapedData.screenshot && !scrapedData.screenshot.includes("supabase.co")) {
    console.log(`\n📤 Uploading screenshot to Supabase...`);
    try {
      const slug = createSlug(gameTitle);
      const ext = scrapedData.screenshot.split(".").pop()?.split("?")[0] || "jpg";
      const filename = `${slug}-${Date.now()}.${ext}`;
      uploadedScreenshotUrl = await downloadAndUploadToSupabase(
        scrapedData.screenshot,
        "game-screenshots",
        filename
      );
      console.log(`  ✓ Screenshot uploaded successfully`);
    } catch (error) {
      console.error(`  ⚠️  Failed to upload screenshot, using original URL:`, error);
      uploadedScreenshotUrl = scrapedData.screenshot;
    }
  }

  // Step 5: Prepare game data
  const gameData: GameData = {
    title: gameTitle,
    description: analysis.description,
    screenshot: uploadedScreenshotUrl,
    website: scrapedData.website,
    categorySlug: analysis.categorySlug || undefined,
  };

  console.log(`\n📋 Game Summary:`);
  console.log("━".repeat(60));
  console.log(`  Title: ${gameData.title}`);
  console.log(`  Description: ${gameData.description.slice(0, 100)}...`);
  console.log(`  Category: ${gameData.categorySlug || "None"}`);
  console.log(`  Screenshot: ${gameData.screenshot ? "✓" : "✗"}`);
  console.log(`  Website: ${gameData.website ? "✓" : "✗"}`);

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
