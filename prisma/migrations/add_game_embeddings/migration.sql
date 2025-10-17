-- Add vector column for embeddings (1536 dimensions for text-embedding-3-small)
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for fast similarity search using IVFFlat
-- This speeds up nearest neighbor searches significantly
CREATE INDEX IF NOT EXISTS game_embedding_idx ON "Game"
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add metadata columns for tracking embedding generation
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "embeddingModel" VARCHAR(50);
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "embeddingGeneratedAt" TIMESTAMP;

-- Create index on embeddingGeneratedAt for filtering
CREATE INDEX IF NOT EXISTS game_embedding_generated_at_idx ON "Game" ("embeddingGeneratedAt");
