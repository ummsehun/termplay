import { z } from 'zod';

export const gameIdSchema = z.enum(['miku', 'gascii']);
export type GameId = z.infer<typeof gameIdSchema>;

export const gameStatusSchema = z.enum([
  'NOT_INSTALLED',
  'INSTALLED',
  'UPDATE_REQUIRED',
  'DOWNLOADING',
  'VERIFYING',
  'READY_TO_PLAY',
  'RUNNING',
  'ERROR',
]);
export type GameStatus = z.infer<typeof gameStatusSchema>;

export type GameNotice = {
  id: string;
  title: string;
  category: '공지' | '이벤트' | '패치노트';
  date: string;
};

export type GameDefinition = {
  id: GameId;
  title: string;
  shortTitle: string;
  description: string;
  version: string;
  banner: {
    accent: string;
    imageHint: string;
  };
  notices: GameNotice[];
  workingDirectory: string;
  command: string;
  args: string[];
};

export const GAME_DEFINITIONS = {
  miku: {
    id: 'miku',
    title: 'Miku',
    shortTitle: 'MK',
    description: '임시 실행 대상: /Users/user/miku 에서 cargo start',
    version: '0.1.0-local',
    banner: {
      accent: 'from-cyan-200 via-sky-300 to-emerald-200',
      imageHint: 'Local Prototype',
    },
    notices: [
      {
        id: 'miku-notice-1',
        title: '로컬 실행 프로토타입 준비',
        category: '공지',
        date: '2026.04.29',
      },
      {
        id: 'miku-notice-2',
        title: 'v0.2 manifest 검증 흐름 예정',
        category: '패치노트',
        date: '2026.04.29',
      },
    ],
    workingDirectory: '/Users/user/miku',
    command: 'cargo',
    args: ['start'],
  },
  gascii: {
    id: 'gascii',
    title: 'Gascii',
    shortTitle: 'GS',
    description: '임시 실행 대상: /Users/user/Gascii 에서 cargo play',
    version: '0.1.0-local',
    banner: {
      accent: 'from-violet-200 via-fuchsia-200 to-rose-200',
      imageHint: 'ASCII Playground',
    },
    notices: [
      {
        id: 'gascii-notice-1',
        title: '로컬 플레이 명령 연결',
        category: '공지',
        date: '2026.04.29',
      },
      {
        id: 'gascii-notice-2',
        title: '복구 버튼은 다음 단계에서 manifest 기반으로 연결',
        category: '패치노트',
        date: '2026.04.29',
      },
    ],
    workingDirectory: '/Users/user/Gascii',
    command: 'cargo',
    args: ['play'],
  },
} as const satisfies Record<GameId, GameDefinition>;
