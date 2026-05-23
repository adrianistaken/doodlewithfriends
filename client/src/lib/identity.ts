import { nanoid } from 'nanoid';
import type { ClientUser } from '../types/shared';
import { randomUserColor } from './colors';

const ADJECTIVES = [
  'Wobbly', 'Sneaky', 'Curious', 'Sleepy', 'Brave', 'Goofy', 'Jolly',
  'Mighty', 'Nifty', 'Plucky', 'Quirky', 'Rowdy', 'Speedy', 'Witty',
  'Zesty', 'Cosmic', 'Cheery', 'Fuzzy', 'Lucky', 'Sunny',
];

const ANIMALS = [
  'Otter', 'Penguin', 'Fox', 'Llama', 'Capybara', 'Narwhal', 'Axolotl',
  'Panda', 'Koala', 'Hedgehog', 'Wombat', 'Sloth', 'Quokka', 'Ferret',
  'Dolphin', 'Toucan', 'Walrus', 'Beaver', 'Lemur', 'Mongoose',
];

function randomName(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const b = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${a} ${b}`;
}

const STORAGE_KEY = 'doodlewithfriends.identity.v1';

export function getOrCreateIdentity(): ClientUser {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ClientUser;
      if (parsed.id && parsed.name && parsed.color) return parsed;
    }
  } catch {
    // ignore; regenerate
  }
  const fresh: ClientUser = {
    id: nanoid(),
    name: randomName(),
    color: randomUserColor(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  } catch {
    // localStorage unavailable; identity will be ephemeral
  }
  return fresh;
}
