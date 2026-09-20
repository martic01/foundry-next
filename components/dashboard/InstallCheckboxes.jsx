'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { setInstallationStatus } from '../../app/dashboard/actions';

export default function InstallCheckboxes({ vscodeInstalled, gitInstalled }) {
  const [vscode, setVscode] = useState(vscodeInstalled);
  const [git, setGit] = useState(gitInstalled);
  const [isPending, startTransition] = useTransition();

  function update(nextVscode, nextGit) {
    setVscode(nextVscode);
    setGit(nextGit);
    startTransition(() => {
      setInstallationStatus(nextVscode, nextGit);
    });
  }

  return (
    <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={vscode}
            disabled={isPending}
            onChange={(e) => update(e.target.checked, git)}
            className="accent-brand"
          />
          I&apos;ve installed VS Code
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={git}
            disabled={isPending}
            onChange={(e) => update(vscode, e.target.checked)}
            className="accent-brand"
          />
          I&apos;ve installed Git
        </label>
      </div>
      {vscode && git && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> All set!
        </p>
      )}
    </div>
  );
}
