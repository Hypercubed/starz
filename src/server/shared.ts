export const PartyServerMessageTypes = {
  LEADERBOARD_UPDATED: 'LEADERBOARD_UPDATED'
} as const;

export type PartyServerMessageType = typeof PartyServerMessageTypes[keyof typeof PartyServerMessageTypes];