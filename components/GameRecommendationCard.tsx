import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { GameRecommendation } from "@/types/ai";

interface GameRecommendationCardProps {
  game: GameRecommendation;
}

export function GameRecommendationCard({ game }: GameRecommendationCardProps) {
  // Convert game.value (with underscores) to permalink format (with hyphens)
  const permalink = game.value.replace(/_/g, "-");

  return (
    <Link
      href={`/games/${permalink}`}
      className="group flex flex-col overflow-hidden rounded-[0.4em] border border-accent-purple/30 bg-surface/60 shadow-md transition-all hover:border-accent-cyan/50 hover:shadow-glow sm:flex-row"
    >
      {/* Screenshot */}
      <div className="relative h-32 w-full flex-shrink-0 overflow-hidden bg-background/50 sm:h-auto sm:w-32">
        {game.screenshot ? (
          <Image
            src={game.screenshot}
            alt={game.label}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 128px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-center gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-white group-hover:text-accent-cyan transition-colors">
            {game.label}
          </h3>
          {game.similarity !== undefined && (
            <span className="flex-shrink-0 text-xs text-accent-cyan/80">
              {Math.round(game.similarity * 100)}% match
            </span>
          )}
        </div>

        {game.category && (
          <Badge variant="secondary" className="w-fit text-xs">
            {game.category.label}
          </Badge>
        )}

        {game.description && (
          <p className="line-clamp-2 text-xs text-text-secondary">
            {game.description}
          </p>
        )}
      </div>
    </Link>
  );
}
