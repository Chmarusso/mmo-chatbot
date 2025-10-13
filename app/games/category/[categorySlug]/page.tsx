import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

interface CategoryPageProps {
  params: Promise<{
    categorySlug: string;
  }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { categorySlug } = await params;

  const category = await prisma.gameCategory.findUnique({
    where: { value: categorySlug },
  });

  if (!category) {
    return {
      title: "Category Not Found | MMO Match",
    };
  }

  const ogImageUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/og/game-category/${categorySlug}`;

  return {
    title: `${category.label} Games | MMO Match`,
    description: category.description || `Browse all ${category.label} games on MMO Match`,
    openGraph: {
      title: `${category.label} Games | MMO Match`,
      description: category.description || `Browse all ${category.label} games on MMO Match`,
      images: [{ url: ogImageUrl }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${category.label} Games | MMO Match`,
      description: category.description || `Browse all ${category.label} games on MMO Match`,
      images: [ogImageUrl],
    },
  };
}

export async function generateStaticParams() {
  const categories = await prisma.gameCategory.findMany({
    select: { value: true },
  });

  return categories.map((category) => ({
    categorySlug: category.value,
  }));
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { categorySlug } = await params;

  const category = await prisma.gameCategory.findUnique({
    where: { value: categorySlug },
    include: {
      games: {
        orderBy: { label: "asc" },
      },
    },
  });

  if (!category) {
    notFound();
  }

  // Get all other categories for the filter
  const allCategories = await prisma.gameCategory.findMany({
    orderBy: { label: "asc" },
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-12 pb-24 lg:px-12">
      {/* Back button */}
      <Link
        href="/games"
        className="inline-flex items-center gap-2 text-sm text-text-secondary transition hover:text-white w-fit"
      >
        <ArrowLeft size={16} />
        All Games
      </Link>

      {/* Category Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <Badge variant="default" className="text-base px-4 py-1.5">
            {category.label}
          </Badge>
        </div>
        <h1 className="text-3xl font-semibold text-white lg:text-4xl">
          {category.label} Games
        </h1>
        {category.description && (
          <p className="text-sm text-text-secondary lg:text-base max-w-3xl">
            {category.description}
          </p>
        )}
        <p className="text-sm text-text-secondary">
          {category.games.length} {category.games.length === 1 ? 'game' : 'games'} in this category
        </p>
      </header>

      {/* Category Filter */}
      <section className="flex flex-wrap gap-2">
        <Link href="/games">
          <Badge variant="outline" className="cursor-pointer">
            All Games
          </Badge>
        </Link>
        {allCategories.map((cat) => (
          <Link key={cat.id} href={`/games/category/${cat.value}`}>
            <Badge
              variant={cat.value === categorySlug ? "default" : "outline"}
              className="cursor-pointer"
            >
              {cat.label}
            </Badge>
          </Link>
        ))}
      </section>

      {/* Games Grid */}
      {category.games.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {category.games.map((game) => (
            <Link key={game.value} href={`/games/${game.value.replace(/_/g, '-')}`}>
              <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-accent-purple/20 bg-surface/80 transition hover:border-accent-purple/40">
                {game.screenshot && (
                  <div className="relative h-40 w-full">
                    <Image
                      src={game.screenshot}
                      alt={game.label}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-4">
                  <h2 className="text-lg font-semibold text-white mb-2">{game.label}</h2>
                  {game.description && (
                    <p className="mt-auto line-clamp-3 text-xs text-text-secondary">
                      {game.description}
                    </p>
                  )}
                </div>
              </article>
            </Link>
          ))}
        </section>
      ) : (
        <div className="py-12 text-center">
          <p className="text-text-secondary">No games found in this category yet.</p>
          <Link
            href="/games"
            className="mt-4 inline-block text-accent-purple hover:underline"
          >
            Browse all games
          </Link>
        </div>
      )}
    </main>
  );
}
