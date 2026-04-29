import { useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Download,
  FolderCog,
  Gamepad2,
  Gauge,
  Play,
  RefreshCcw,
  Settings,
  ShieldCheck,
  UserRound,
  Wrench,
} from 'lucide-react';
import { GAME_DEFINITIONS, type GameId, type GameStatus } from '@shared/games';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
import { useLauncherStore } from './store/launcher.store';

const games = Object.values(GAME_DEFINITIONS);

const statusLabels: Record<GameStatus, string> = {
  NOT_INSTALLED: '미설치',
  INSTALLED: '설치됨',
  UPDATE_REQUIRED: '업데이트 필요',
  DOWNLOADING: '다운로드 중',
  VERIFYING: '검증 중',
  READY_TO_PLAY: '실행 가능',
  RUNNING: '실행 중',
  ERROR: '오류',
};

const actionByStatus: Record<GameStatus, { label: string; icon: typeof Play; disabled?: boolean }> = {
  NOT_INSTALLED: { label: '설치', icon: Download },
  INSTALLED: { label: '검증 후 실행', icon: ShieldCheck },
  UPDATE_REQUIRED: { label: '업데이트', icon: Download },
  DOWNLOADING: { label: '다운로드 중', icon: Gauge, disabled: true },
  VERIFYING: { label: '검증 중', icon: ShieldCheck, disabled: true },
  READY_TO_PLAY: { label: '게임 실행', icon: Play },
  RUNNING: { label: '실행 중', icon: CheckCircle2, disabled: true },
  ERROR: { label: '재시도', icon: RefreshCcw },
};

const statusTone: Record<GameStatus, string> = {
  NOT_INSTALLED: 'bg-zinc-100 text-zinc-700',
  INSTALLED: 'bg-sky-100 text-sky-700',
  UPDATE_REQUIRED: 'bg-amber-100 text-amber-800',
  DOWNLOADING: 'bg-cyan-100 text-cyan-800',
  VERIFYING: 'bg-indigo-100 text-indigo-800',
  READY_TO_PLAY: 'bg-emerald-100 text-emerald-800',
  RUNNING: 'bg-lime-100 text-lime-800',
  ERROR: 'bg-rose-100 text-rose-800',
};

export const App = () => {
  const { launchGame, message, repairGame, selectGame, selectedGameId, statuses, updateGameStatus } =
    useLauncherStore();
  const selectedGame = GAME_DEFINITIONS[selectedGameId];
  const selectedStatus = statuses[selectedGameId];
  const action = actionByStatus[selectedStatus];
  const ActionIcon = action.icon;

  useEffect(() => {
    return window.launcher.onGameStatusChanged(updateGameStatus);
  }, [updateGameStatus]);

  const handlePrimaryAction = () => {
    if (selectedStatus === 'ERROR' || selectedStatus === 'READY_TO_PLAY' || selectedStatus === 'INSTALLED') {
      void launchGame(selectedGameId);
      return;
    }

    if (selectedStatus === 'NOT_INSTALLED' || selectedStatus === 'UPDATE_REQUIRED') {
      selectGame(selectedGameId);
    }
  };

  return (
    <main className="min-h-screen bg-[#edf3f7] text-zinc-950">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="flex min-h-screen flex-col bg-[#121923] text-white">
          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
            <div className="flex size-10 items-center justify-center rounded-md bg-cyan-300 text-zinc-950">
              <Gamepad2 className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-normal">Mini Launcher</h1>
              <p className="text-xs text-zinc-400">v0.1 local hub</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-3 py-5">
            {games.map((game) => {
              const isSelected = selectedGameId === game.id;
              const status = statuses[game.id];

              return (
                <button
                  key={game.id}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors',
                    isSelected ? 'bg-white text-zinc-950' : 'text-zinc-300 hover:bg-white/10 hover:text-white',
                  )}
                  onClick={() => selectGame(game.id)}
                  type="button"
                >
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-md text-sm font-semibold',
                      isSelected ? 'bg-zinc-950 text-white' : 'bg-white/10 text-cyan-200',
                    )}
                  >
                    {game.shortTitle}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{game.title}</span>
                    <span className={cn('mt-1 block text-xs', isSelected ? 'text-zinc-500' : 'text-zinc-500')}>
                      {statusLabels[status]}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 opacity-60" aria-hidden="true" />
                </button>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-4">
            <div className="flex items-center gap-3 rounded-md bg-white/5 p-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-white text-zinc-950">
                <UserRound className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">Local Player</p>
                <p className="text-xs text-zinc-500">로그인 없음</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-h-screen flex-col">
          <header className="flex h-20 items-center justify-between border-b border-zinc-200 bg-white px-6">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-normal text-cyan-700">Game Hub</p>
              <p className="mt-1 truncate text-sm text-zinc-500">{message}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" aria-label="공지">
                <Bell className="size-4" aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="설정">
                <Settings className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </header>

          <div className="flex-1 overflow-hidden p-6">
            <div className="grid h-full gap-6 xl:grid-cols-[1fr_340px]">
              <div className="flex min-h-0 flex-col gap-5">
                <section
                  className={cn(
                    'relative min-h-[300px] overflow-hidden rounded-lg bg-gradient-to-br p-8 shadow-sm',
                    selectedGame.banner.accent,
                  )}
                >
                  <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.65),transparent_58%)]" />
                  <div className="relative z-10 flex h-full max-w-2xl flex-col justify-between gap-10">
                    <div>
                      <span className="inline-flex rounded-md bg-white/70 px-3 py-1 text-xs font-medium text-zinc-700 backdrop-blur">
                        {selectedGame.banner.imageHint}
                      </span>
                      <h2 className="mt-5 text-5xl font-semibold leading-tight tracking-normal text-zinc-950">
                        {selectedGame.title}
                      </h2>
                      <p className="mt-4 max-w-xl text-base leading-7 text-zinc-700">{selectedGame.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        className="h-12 min-w-44 bg-zinc-950 px-6 text-white hover:bg-zinc-800"
                        disabled={action.disabled}
                        onClick={handlePrimaryAction}
                      >
                        <ActionIcon className="size-4" aria-hidden="true" />
                        {action.label}
                      </Button>
                      <span className={cn('rounded-md px-3 py-2 text-sm font-medium', statusTone[selectedStatus])}>
                        {statusLabels[selectedStatus]}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-white p-5 shadow-sm">
                    <p className="text-xs font-medium text-zinc-500">버전</p>
                    <p className="mt-2 text-lg font-semibold">{selectedGame.version}</p>
                  </div>
                  <div className="rounded-lg bg-white p-5 shadow-sm">
                    <p className="text-xs font-medium text-zinc-500">설치 경로</p>
                    <p className="mt-2 truncate text-sm font-medium">{selectedGame.workingDirectory}</p>
                  </div>
                  <div className="rounded-lg bg-white p-5 shadow-sm">
                    <p className="text-xs font-medium text-zinc-500">실행 명령</p>
                    <p className="mt-2 font-mono text-sm font-medium">
                      {selectedGame.command} {selectedGame.args.join(' ')}
                    </p>
                  </div>
                </section>

                <section className="rounded-lg bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold tracking-normal">공지</h3>
                      <p className="mt-1 text-sm text-zinc-500">선택한 게임의 로컬 런처 소식</p>
                    </div>
                  </div>
                  <div className="mt-4 divide-y divide-zinc-100">
                    {selectedGame.notices.map((notice) => (
                      <article key={notice.id} className="flex items-center gap-4 py-3">
                        <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                          {notice.category}
                        </span>
                        <p className="min-w-0 flex-1 truncate text-sm font-medium">{notice.title}</p>
                        <time className="text-xs text-zinc-400">{notice.date}</time>
                      </article>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="flex min-h-0 flex-col gap-5">
                <section className="rounded-lg bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold tracking-normal">관리</h3>
                  <div className="mt-4 grid gap-2">
                    <Button variant="secondary" className="justify-start bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
                      <FolderCog className="size-4" aria-hidden="true" />
                      설치 경로
                    </Button>
                    <Button
                      variant="secondary"
                      className="justify-start bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                      onClick={() => repairGame(selectedGameId)}
                    >
                      <Wrench className="size-4" aria-hidden="true" />
                      파일 복구
                    </Button>
                    <Button variant="secondary" className="justify-start bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
                      <CircleAlert className="size-4" aria-hidden="true" />
                      로그 보기
                    </Button>
                  </div>
                </section>

                <section className="rounded-lg bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-semibold tracking-normal">상태 흐름</h3>
                  <div className="mt-4 space-y-3">
                    {(['READY_TO_PLAY', 'RUNNING', 'VERIFYING', 'ERROR'] as GameStatus[]).map((status) => (
                      <div key={status} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-zinc-500">{statusLabels[status]}</span>
                        <span
                          className={cn(
                            'size-2 rounded-full',
                            selectedStatus === status ? 'bg-cyan-500' : 'bg-zinc-200',
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg bg-[#121923] p-5 text-white shadow-sm">
                  <div>
                    <h3 className="text-lg font-semibold tracking-normal">다음 단계</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      manifest, 다운로드, SHA-256 검증, 실제 repair는 v0.2에서 연결합니다.
                    </p>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
