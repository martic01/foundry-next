import { Laptop, ExternalLink, Download } from 'lucide-react';
import { createClient } from '../../../lib/supabase/server';
import { LAPTOP_SPECS } from '../../../lib/laptop-specs';
import { INSTALLATION_OS } from '../../../lib/installation-content';
import { toCloudinaryDownloadUrl } from '../../../lib/cloudinary';
import Tabs from '../../../components/Tabs';
import VideoEmbed from '../../../components/VideoEmbed';
import InstallCheckboxes from '../../../components/dashboard/InstallCheckboxes';

export const metadata = { title: 'Installation — The Foundry' };

function ToolPanel({ tool }) {
  // `direct` tools are hosted on Cloudinary now, not this repo (see the
  // comment in lib/installation-content.js on why) -- fl_attachment is
  // what makes the browser actually download the file instead of just
  // navigating to it, since `download` alone doesn't reliably work
  // cross-origin without it.
  const href = tool.direct ? toCloudinaryDownloadUrl(tool.downloadUrl) : tool.downloadUrl;

  return (
    <div className="flex flex-col gap-4">
      {tool.video && <VideoEmbed url={tool.video} title={tool.label} />}
      {tool.image && (
        // eslint-disable-next-line @next/next/no-img-element -- a static
        // reference infographic, not a photo needing next/image's
        // optimization pipeline
        <img src={tool.image} alt={`${tool.label} install steps`} className="w-full rounded-lg border border-line" />
      )}
      {!tool.video && !tool.image && (
        <p className="text-xs text-inkdim">No video for this one yet — follow the written steps below.</p>
      )}
      <ol className="flex flex-col gap-2">
        {tool.steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-ink">
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-surfaceMuted text-xs font-semibold text-inkdim">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      {href ? (
        <div
          className={`rounded-lg border p-3 ${
            tool.direct ? 'border-brand/40 bg-brand-light' : 'border-line bg-surfaceMuted'
          }`}
        >
          {/* `direct` tools get a real `download` attribute so the
              browser saves the file instead of navigating -- and a
              visually distinct gold-tinted button, since this is
              genuinely a different action from "opens a website" below. */}
          <a
            href={href}
            {...(tool.direct
              ? { download: true }
              : { target: '_blank', rel: 'noopener noreferrer' })}
            className="cta-btn mb-1.5 inline-flex w-fit"
          >
            {tool.direct ? <Download className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
            {tool.downloadLabel || (tool.direct ? 'Download' : 'Open download page')}
          </a>
          {tool.downloadDescription && (
            <p className="text-xs text-inkdim">{tool.downloadDescription}</p>
          )}
        </div>
      ) : (
        tool.direct && (
          <p className="rounded-lg border border-line bg-surfaceMuted p-3 text-xs text-inkdim">
            Download link isn&apos;t set up yet — follow the written steps above in the meantime.
          </p>
        )
      )}
    </div>
  );
}

export default async function InstallationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('vscode_installed, git_installed')
    .eq('id', user.id)
    .maybeSingle();

  const osTabs = INSTALLATION_OS.map((os) => ({
    key: os.key,
    label: os.label,
    content: (
      <div>
        <p className="mb-4 text-xs text-inkdim">{os.note}</p>
        <Tabs
          tabs={[
            { key: 'vscode', label: os.tools.vscode.label, content: <ToolPanel tool={os.tools.vscode} /> },
            { key: 'git', label: os.tools.git.label, content: <ToolPanel tool={os.tools.git} /> }
          ]}
        />
      </div>
    )
  }));

  return (
    <div>
      <p className="eyebrow mb-2">Installation</p>
      <h1 className="mb-2 font-display text-2xl font-extrabold text-ink">Set up VS Code &amp; Git</h1>
      <p className="mb-6 text-sm text-inkdim">
        This is <span className="font-semibold text-ink">required before your first class</span> --
        you won&apos;t be able to follow along without both installed.
      </p>

      <div className="card mb-6 p-5">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
          <Laptop className="h-4 w-4" /> Minimum laptop specs
        </p>
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {LAPTOP_SPECS.map((spec) => (
            <li key={spec} className="text-sm text-inkdim">
              {spec}
            </li>
          ))}
        </ul>
      </div>

      <InstallCheckboxes vscodeInstalled={profile?.vscode_installed || false} gitInstalled={profile?.git_installed || false} />

      <div className="card mt-6 p-6">
        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-inkdim">Choose your operating system</p>
        <Tabs tabs={osTabs} />
      </div>
    </div>
  );
}
