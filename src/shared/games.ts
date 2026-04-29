import { z } from 'zod';

export const gameIdSchema = z.enum(['miku', 'gascii']);
export type GameId = z.infer<typeof gameIdSchema>;

export type GameDefinition = {
  id: GameId;
  title: string;
  description: string;
  workingDirectory: string;
  command: string;
  args: string[];
};

export const GAME_DEFINITIONS = {
  miku: {
    id: 'miku',
    title: 'Miku',
    description: '임시 실행 대상: /Users/user/miku 에서 cargo start',
    workingDirectory: '/Users/user/miku',
    command: 'cargo',
    args: ['start'],
  },
  gascii: {
    id: 'gascii',
    title: 'Gascii',
    description: '임시 실행 대상: /Users/user/Gascii 에서 cargo play',
    workingDirectory: '/Users/user/Gascii',
    command: 'cargo',
    args: ['play'],
  },
} as const satisfies Record<GameId, GameDefinition>;
