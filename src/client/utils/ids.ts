import { customAlphabet, nanoid } from 'nanoid';

const FRIENDLY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ234567';

export const createId = () => nanoid(5);
export const createPlayerId = customAlphabet(FRIENDLY_ALPHABET, 15);
export const createPlayerToken = customAlphabet(FRIENDLY_ALPHABET, 15);
