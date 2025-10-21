import OpenAI from "openai";

const isTestRun = process.env.NODE_ENV === "test" || process.env.PLAYWRIGHT_TEST === "true";
const client =
  !isTestRun && process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export async function isImageSafe(dataUrl: string): Promise<boolean> {
  if (!client) {
    if (!isTestRun) {
      console.warn("NSFW check skipped: OPENAI_API_KEY not set");
    }
    return true;
  }

  if (isTestRun) {
    console.info("NSFW check skipped during test run");
    return true;
  }

  try {
    const response = await client.moderations.create({
      model: "omni-moderation-latest",
      input: [
        {
          type: "image_url",
          image_url: {
            url: dataUrl,
          },
        },
      ],
    });

    if (!response || !Array.isArray(response.results)) {
      console.warn("Unexpected moderation response format", response);
      return true;
    }

    return !response.results.some((result) => result.flagged);
  } catch (error) {
    console.error("Image moderation failed", error);
    throw error;
  }
}
