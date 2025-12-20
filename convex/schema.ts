import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  scores: defineTable({
    userId: v.string(),
    playerName: v.string(),
    score: v.number(), // number of wins
    tick: v.number(), // best tick time
    timestamp: v.number(),
  })
    .index("by_score", ["score"])
    .index("by_user", ["userId"]),
});