import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get top 10 scores
export const getTopScores = query({
  args: {},
  handler: async (ctx) => {
    const scores = await ctx.db
      .query("scores")
      .withIndex("by_score")
      .order("desc")
      .take(10);
    return scores;
  },
});

// Submit a score
export const submitScore = mutation({
  args: {
    playerName: v.string(),
    playerId: v.string(),
    deltaScore: v.number(),
    tick: v.number(),
  },
  handler: async (ctx, args) => {
    // Remove the auth check for now
    // const identity = await ctx.auth.getUserIdentity();
    
    // Use a simple user ID based on player name or generate one
    const userId = args.playerId;

    const score = args.deltaScore;
    if (score !== 1 && score !== -1) throw new Error("Invalid deltaScore");
    
    const existingScore = await ctx.db
      .query("scores")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    let tick = existingScore?.tick ?? Number.MAX_SAFE_INTEGER;
    if (score > 0 && args.tick < tick) tick = args.tick;

    if (existingScore) {
      await ctx.db.patch(existingScore._id, {
        score: existingScore.score + score,
        tick,
        timestamp: Date.now(),
      });
      return { ...existingScore, score: existingScore.score + score, tick };
    }

    const scoreId = await ctx.db.insert("scores", {
      userId: userId,
      playerName: args.playerName,
      score,
      tick,
      timestamp: Date.now(),
    });

    return await ctx.db.get(scoreId);
  },
});

// Get user's personal best
export const getMyBestScore = query({
  args: {
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scores")
      .withIndex("by_user", (q) => q.eq("userId", args.playerId))
      .first();
  },
});