import { Gamepad2, Play, Terminal } from 'lucide-react';
import { GAME_DEFINITIONS, type GameId } from '@shared/games';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { useLauncherStore } from './store/launcher.store';

const games = Object.values(GAME_DEFINITIONS);

export const App = () => {
  const { activeGameId, launchGame, message, status } = useLauncherStore();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-8 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-md bg-emerald-400 text-zinc-950">
              <Gamepad2 className="size-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">Game Launcher</h1>
              <p className="text-sm text-zinc-400">Electron 임시 런처</p>
            </div>
          </div>

          <div className="rounded-md border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-300">
            {message}
          </div>
        </header>

        <div className="grid flex-1 content-center gap-5 py-10 md:grid-cols-2">
          {games.map((game) => (
            <Card key={game.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{game.title}</CardTitle>
                    <CardDescription>{game.description}</CardDescription>
                  </div>
                  <Terminal className="size-5 shrink-0 text-zinc-500" aria-hidden="true" />
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <dl className="grid gap-3 text-sm">
                  <div className="rounded-md bg-zinc-950 p-3">
                    <dt className="text-zinc-500">디렉터리</dt>
                    <dd className="mt-1 break-all text-zinc-200">{game.workingDirectory}</dd>
                  </div>
                  <div className="rounded-md bg-zinc-950 p-3">
                    <dt className="text-zinc-500">명령</dt>
                    <dd className="mt-1 font-mono text-zinc-200">
                      {game.command} {game.args.join(' ')}
                    </dd>
                  </div>
                </dl>

                <Button
                  className="w-full"
                  disabled={status === 'launching' && activeGameId === game.id}
                  onClick={() => void launchGame(game.id as GameId)}
                >
                  <Play className="size-4" aria-hidden="true" />
                  실행
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
};
