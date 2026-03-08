import prisma from '../prisma';

/**
 * Weighted scoring model.
 * Total weight = 1.0
 * Discount prioritized intentionally.
 */
const SCORING_WEIGHTS = {
  discount: 0.50,
  playtime: 0.30,
  tagMatch: 0.15,
  rating: 0.03,
  tier: 0.02,
};

const TIER_MULTIPLIERS = {
  S: 1.2,
  A: 1.1,
  B: 1.0,
  C: 0.9,
  D: 0.8,
};

interface TagProfile {
  [tag: string]: {
    totalPlaytime: number;
    gameCount: number;
    avgRating: number;
    tierMultiplier: number;
  };
}

interface RecommendationResult {
  id: string;
  name: string;
  tags: string[];
  listPrice: number;
  currentPrice: number;
  discountPercent: number;
  finalScore: number;
  breakdown: {
    discountScore: number;
    playtimeScore: number;
    tagMatchScore: number;
    ratingScore: number;
    tierScore: number;
  };
  estimatedPlaytime: number;
  reasoning: string[];
}

class RecommendationService {
  // Build tag profile from library 
  private async buildTagProfile(userId: string): Promise<TagProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        libraryGames: {
          where: {
            playtimeForever: { gt: 0 },
          },
          select: {
            genres: true,
            userTags: true,
            playtimeForever: true,
            rating: true,
            tier: true,
          },
        },
      },
    });

    if (!user || !user.libraryGames) {
      return {};
    }

    const games = user.libraryGames;

    const profile: TagProfile = {};

    games.forEach((game) => {
      const allTags = [...game.genres, ...game.userTags];
      const tierMultiplier = TIER_MULTIPLIERS[game.tier as keyof typeof TIER_MULTIPLIERS] || 1.0;
      const rating = game.rating || 3;

      allTags.forEach((tag) => {
        if (!profile[tag]) {
          profile[tag] = {
            totalPlaytime: 0,
            gameCount: 0,
            avgRating: 0,
            tierMultiplier: 0,
          };
        }

        const current = profile[tag];
        current.totalPlaytime += game.playtimeForever;
        current.gameCount += 1;
        current.avgRating = (current.avgRating * (current.gameCount - 1) + rating) / current.gameCount;
        current.tierMultiplier = Math.max(current.tierMultiplier, tierMultiplier);
      });
    });

    return profile;
  }

  // Discount score (0-100) 
  private calculateDiscountScore(discountPercent: number): number {
    return Math.min(discountPercent, 100);
  }

  // Playtime score (0-100) 
  private calculatePlaytimeScore(gameTags: string[], profile: TagProfile): number {
    if (Object.keys(profile).length === 0) return 50;

    let totalWeightedPlaytime = 0;
    let matchCount = 0;

    gameTags.forEach((tag) => {
      if (profile[tag]) {
        totalWeightedPlaytime += profile[tag].totalPlaytime * profile[tag].tierMultiplier;
        matchCount++;
      }
    });

    if (matchCount === 0) return 20;

    const avgPlaytime = totalWeightedPlaytime / matchCount;
    return Math.min((avgPlaytime / 6000) * 100, 100);
  }

  // Tag match score (0-100) 
  private calculateTagMatchScore(gameTags: string[], profile: TagProfile): number {
    if (Object.keys(profile).length === 0) return 50;

    let matchedTags = 0;
    gameTags.forEach((tag) => {
      if (profile[tag]) matchedTags++;
    });

    return gameTags.length > 0 ? (matchedTags / gameTags.length) * 100 : 0;
  }

  // Rating score (0-100)
  private calculateRatingScore(gameTags: string[], profile: TagProfile): number {
    if (Object.keys(profile).length === 0) return 50;

    let totalRating = 0;
    let matchCount = 0;

    gameTags.forEach((tag) => {
      if (profile[tag]) {
        totalRating += profile[tag].avgRating;
        matchCount++;
      }
    });

    if (matchCount === 0) return 40;

    const avgRating = totalRating / matchCount;
    return (avgRating / 5) * 100;
  }

  private calculateTierScore(gameTags: string[], profile: TagProfile): number {
    if (Object.keys(profile).length === 0) return 50;

    let maxTierMultiplier = 0;
    gameTags.forEach((tag) => {
      if (profile[tag]) {
        maxTierMultiplier = Math.max(maxTierMultiplier, profile[tag].tierMultiplier);
      }
    });

    return maxTierMultiplier > 0 ? (maxTierMultiplier / 1.2) * 100 : 40;
  }

  private estimatePlaytime(gameTags: string[], profile: TagProfile): number {
    if (Object.keys(profile).length === 0) return 600;

    let totalPlaytime = 0;
    let matchCount = 0;

    gameTags.forEach((tag) => {
      if (profile[tag]) {
        totalPlaytime += profile[tag].totalPlaytime / profile[tag].gameCount;
        matchCount++;
      }
    });

    return matchCount > 0 ? totalPlaytime / matchCount : 600;
  }

  private generateReasoning(
    discountScore: number,
    playtimeScore: number,
    tagMatchScore: number,
    discountPercent: number
  ): string[] {
    const reasons: string[] = [];

    if (discountScore >= 50) {
      reasons.push(`${discountPercent}% discount`);
    }

    if (playtimeScore > 70) {
      reasons.push('High playtime potential');
    } else if (playtimeScore > 40) {
      reasons.push('Moderate playtime expected');
    }

    if (tagMatchScore > 70) {
      reasons.push('Strong tag match');
    } else if (tagMatchScore > 40) {
      reasons.push('Decent tag match');
    }

    if (reasons.length === 0) {
      reasons.push('Consider based on price');
    }

    return reasons;
  }

  // Generate recommendations 
  async getRecommendations(userId: string): Promise<RecommendationResult[]> {
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wishlistGames: true },
    });

    if (!user || user.wishlistGames.length === 0) {
      return [];
    }


    const profile = await this.buildTagProfile(userId);
    
    const recommendations: RecommendationResult[] = [];

    for (const game of user.wishlistGames) {
      const discountScore = this.calculateDiscountScore(game.discountPercent);
      const playtimeScore = this.calculatePlaytimeScore(game.tags, profile);
      const tagMatchScore = this.calculateTagMatchScore(game.tags, profile);
      const ratingScore = this.calculateRatingScore(game.tags, profile);
      const tierScore = this.calculateTierScore(game.tags, profile);

      const finalScore =
        discountScore * SCORING_WEIGHTS.discount +
        playtimeScore * SCORING_WEIGHTS.playtime +
        tagMatchScore * SCORING_WEIGHTS.tagMatch +
        ratingScore * SCORING_WEIGHTS.rating +
        tierScore * SCORING_WEIGHTS.tier;

      const estimatedPlaytime = this.estimatePlaytime(game.tags, profile);
      const reasoning = this.generateReasoning(
        discountScore,
        playtimeScore,
        tagMatchScore,
        game.discountPercent
      );

      recommendations.push({
        id: game.id,
        name: game.name,
        tags: game.tags,
        listPrice: game.listPrice,
        currentPrice: game.currentPrice,
        discountPercent: game.discountPercent,
        finalScore: Math.round(finalScore),
        breakdown: {
          discountScore: Math.round(discountScore),
          playtimeScore: Math.round(playtimeScore),
          tagMatchScore: Math.round(tagMatchScore),
          ratingScore: Math.round(ratingScore),
          tierScore: Math.round(tierScore),
        },
        estimatedPlaytime: Math.round(estimatedPlaytime / 60),
        reasoning,
      });
    }

    recommendations.sort((a, b) => b.finalScore - a.finalScore);

    for (const rec of recommendations) {
      await prisma.steamWishlist.update({
        where: { id: rec.id },
        data: { recommendationScore: rec.finalScore },
      });
    }

    return recommendations;
  }
}

export default new RecommendationService();