// Single source of truth for the Installation page. Each OS has two
// tools: vscode and git. `video` is a full YouTube URL (turned into an
// embed by components/VideoEmbed.jsx) or null when no verified video is
// available. `downloadUrl`/`downloadLabel` are links to the OFFICIAL
// vendor download pages (code.visualstudio.com, git-scm.com) -- not a
// direct file download, on purpose (see the note in
// app/dashboard/installation/page.jsx on why nothing is self-hosted
// here). `downloadDescription` exists specifically so the button never
// just says "Download" with no context -- it says what actually happens
// when you click it.
//
// Note on the Git tool write-ups: "Git Bash" specifically (that name) is
// a Windows-only product bundled with Git for Windows -- macOS and Linux
// already have a native bash shell, so installing Git there is just
// "install git, then use the Terminal you already have." The steps below
// reflect that distinction rather than treating "Git Bash" as if it were
// a separate app on every OS.
//
// `image` on a Fedora/Chromebook Git entry deliberately reuses the same
// Ubuntu/Linux screenshot -- Fedora and Chromebook's Linux container both
// run on the same underlying Linux terminal model that screenshot shows
// (open terminal, package manager, verify), even though the actual
// install COMMAND differs (dnf vs apt), which is why the write-up steps
// still use the correct command for each even while sharing one image.
const GIT_LINUX_IMAGE = '/installation/git-linux.png';

const GIT_AFTER_INSTALL_STEPS = [
  'One-time setup after installing, on any OS: run these two commands with your own name/email -- Git attaches this to every commit you make: git config --global user.name "Your Name" then git config --global user.email "you@example.com"',
  'When you first run `git init` in a new project, Git may still default new repos to a branch called "master". To make new repos use "main" instead (the modern default), run once: git config --global init.defaultBranch main -- on Windows, the installer itself also asks about this directly: on the "Adjusting the name of the initial branch in new repositories" screen, choose "Override the default branch name for new repositories" and type main.'
];

const VSCODE_AFTER_INSTALL_STEPS = [
  'After installing, open VS Code once to confirm it launches, then close it -- you\u2019re ready for class.',
  'On Windows specifically, the installer has checkboxes for "Add to PATH", "Register Code as an editor for supported file types", and "Add \u2018Open with Code\u2019 action" to the right-click menu for files/folders -- tick all of these, they\u2019re what let you type `code .` in a terminal or right-click a folder and open it directly in VS Code.'
];

export const INSTALLATION_OS = [
  {
    key: 'windows',
    label: 'Windows',
    note: 'At least Windows 10.',
    tools: {
      vscode: {
        label: 'VS Code',
        video: null, // no verified video link for this combination yet
        // Hosted on Cloudinary, not committed to this repo -- GitHub
        // hard-rejects anything over 100MB (this installer is ~103MB),
        // and even under that limit, a git repo is a bad place for large
        // binaries generally (bloats every clone forever, no diffing).
        // See lib/cloudinary.js's toCloudinaryDownloadUrl for why the
        // fl_attachment transform matters here. Upload the .exe to
        // Cloudinary's Media Library yourself (drag-and-drop -- no
        // upload preset needed for that, only for the in-app video
        // uploader) and put its resulting URL in
        // NEXT_PUBLIC_VSCODE_INSTALLER_URL.
        downloadUrl: process.env.NEXT_PUBLIC_VSCODE_INSTALLER_URL || null,
        downloadLabel: 'Download VS Code installer (.exe, ~103MB)',
        downloadDescription: 'Downloads the installer file directly to your computer -- it does not open a webpage.',
        direct: true,
        steps: [
          'Click the download button below -- it saves the VS Code installer to your Downloads folder.',
          'Once it finishes downloading, open your Downloads folder and double-click the file to run it.',
          'If Windows shows a "Windows protected your PC" SmartScreen warning, click "More info", then "Run anyway" -- this is normal for any installer that isn\u2019t from the Microsoft Store.',
          'Click through the installer (defaults are fine) -- on "Select Additional Tasks", tick "Add to PATH".',
          'Click Install, then Finish.',
          ...VSCODE_AFTER_INSTALL_STEPS
        ]
      },
      git: {
        label: 'Git',
        video: null,
        image: '/installation/git-windows.png',
        // Same Cloudinary approach as VS Code above (~62MB -- still
        // over GitHub's 50MB *warning* threshold and close enough to
        // the 100MB hard limit not to risk it). Put the uploaded file's
        // URL in NEXT_PUBLIC_GIT_INSTALLER_URL.
        downloadUrl: process.env.NEXT_PUBLIC_GIT_INSTALLER_URL || null,
        downloadLabel: 'Download Git installer (.exe, ~62MB)',
        downloadDescription: 'Downloads the installer file directly to your computer -- it does not open a webpage.',
        direct: true,
        steps: [
          'Click the download button below -- it saves the Git installer to your Downloads folder.',
          'Once it finishes downloading, open your Downloads folder and double-click the file to run it.',
          'If Windows shows a "Windows protected your PC" SmartScreen warning, click "More info", then "Run anyway" -- this is normal for any installer that isn\u2019t from the Microsoft Store.',
          'Click through the installer -- defaults are fine for every screen except one: on "Adjusting the name of the initial branch in new repositories", choose "Override the default branch name for new repositories" and type main.',
          'Once it finishes, open Command Prompt or PowerShell and verify with: git --version',
          'Search "Git Bash" in the Start menu and open it -- this is the terminal you\u2019ll use for Git commands on Windows specifically.',
          ...GIT_AFTER_INSTALL_STEPS
        ]
      }
    }
  },
  {
    key: 'mac',
    label: 'macOS',
    note: 'A recent, currently-supported macOS version.',
    tools: {
      vscode: {
        label: 'VS Code',
        video: 'https://youtu.be/w0xBQHKjoGo?si=OniKS86eFCci4ErU',
        downloadUrl: 'https://code.visualstudio.com/download',
        downloadLabel: 'Open the official VS Code download page',
        downloadDescription: 'Opens code.visualstudio.com -- click the Mac download there to start the real download.',
        steps: [
          'Click the button below, or go to code.visualstudio.com and download the Mac version.',
          'Open the downloaded .zip -- it extracts to Visual Studio Code.app.',
          'Drag Visual Studio Code.app into your Applications folder.',
          'Open it from Applications (or Spotlight: Cmd+Space, type "VS Code").',
          'Recommended: open VS Code, press Cmd+Shift+P, type "Shell Command: Install \u2018code\u2019 command in PATH", and run it -- this lets you type `code .` in Terminal later.',
          ...VSCODE_AFTER_INSTALL_STEPS.slice(0, 1)
        ]
      },
      git: {
        label: 'Git',
        video: null,
        image: '/installation/git-mac.png',
        downloadUrl: 'https://git-scm.com/download/mac',
        downloadLabel: 'Open the official Git download page',
        downloadDescription: 'Opens git-scm.com with Mac-specific install options (Homebrew, Xcode Tools, or a direct installer).',
        steps: [
          'Open Terminal (Cmd+Space, type "Terminal").',
          'If you don\u2019t already have Homebrew, install it: paste the command from brew.sh and press Enter.',
          'Run: brew install git',
          '(Or use the button below for a direct installer instead of Homebrew.)',
          'Verify with: git --version',
          'macOS doesn\u2019t have a separate "Git Bash" app -- your regular Terminal already runs a bash-compatible shell, so that\u2019s what you\u2019ll use for Git commands.',
          ...GIT_AFTER_INSTALL_STEPS
        ]
      }
    }
  },
  {
    key: 'ubuntu',
    label: 'Ubuntu Linux',
    note: 'A current, supported Ubuntu release.',
    tools: {
      vscode: {
        label: 'VS Code',
        video: 'https://youtu.be/ChwsFldra-o?si=0cfEAl38P9Cdz768',
        downloadUrl: 'https://code.visualstudio.com/download',
        downloadLabel: 'Open the official VS Code download page',
        downloadDescription: 'Opens code.visualstudio.com with the .deb/.rpm/.tar.gz options, if you\u2019d rather not use snap.',
        steps: [
          'Open Terminal (Ctrl+Alt+T).',
          'Run: sudo snap install --classic code',
          '(If snap isn\u2019t available, use the button below to download a .deb instead and run: sudo apt install ./<file>.deb)',
          'Once it finishes, launch it by running: code',
          'Verify with: code --version',
          ...VSCODE_AFTER_INSTALL_STEPS.slice(0, 1)
        ]
      },
      git: {
        label: 'Git',
        video: null,
        image: GIT_LINUX_IMAGE,
        downloadUrl: 'https://git-scm.com/download/linux',
        downloadLabel: 'Open the official Git download page',
        downloadDescription: 'Opens git-scm.com with the exact command for every Linux distro, if apt isn\u2019t what you\u2019re running.',
        steps: [
          'Open Terminal (Ctrl+Alt+T).',
          'Run: sudo apt update',
          'Run: sudo apt install git',
          'Verify with: git --version',
          'Ubuntu\u2019s Terminal already runs bash -- there\u2019s no separate "Git Bash" package to install here.',
          ...GIT_AFTER_INSTALL_STEPS
        ]
      }
    }
  },
  {
    key: 'fedora',
    label: 'Fedora Linux',
    note: 'A current, supported Fedora release.',
    tools: {
      vscode: {
        label: 'VS Code',
        video: 'https://youtu.be/-8bLbAcPGMI?si=-Hj_ilwGqZO4nhc-',
        downloadUrl: 'https://code.visualstudio.com/download',
        downloadLabel: 'Open the official VS Code download page',
        downloadDescription: 'Opens code.visualstudio.com with the .rpm option and repo instructions for Fedora.',
        steps: [
          'Open Terminal.',
          'Run: sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc',
          'Add the VS Code repo: sudo dnf config-manager --add-repo https://packages.microsoft.com/yumrepos/vscode',
          'Install it: sudo dnf install code',
          'Verify with: code --version',
          ...VSCODE_AFTER_INSTALL_STEPS.slice(0, 1)
        ]
      },
      git: {
        label: 'Git',
        video: null,
        image: GIT_LINUX_IMAGE,
        downloadUrl: 'https://git-scm.com/download/linux',
        downloadLabel: 'Open the official Git download page',
        downloadDescription: 'Opens git-scm.com with the exact dnf command for Fedora/RHEL-based distros.',
        steps: [
          'Open Terminal.',
          'Run: sudo dnf install git',
          'Verify with: git --version',
          'Fedora\u2019s Terminal already runs bash -- there\u2019s no separate "Git Bash" package to install here.',
          ...GIT_AFTER_INSTALL_STEPS
        ]
      }
    }
  },
  {
    key: 'chromebook',
    label: 'Chromebook',
    note: 'Requires Linux (Beta) to be turned on first.',
    tools: {
      vscode: {
        label: 'VS Code',
        video: 'https://youtu.be/ZSDfXHbjk3E?si=eBVvJpDt8_9ceNqJ',
        downloadUrl: 'https://code.visualstudio.com/download',
        downloadLabel: 'Open the official VS Code download page',
        downloadDescription: 'Opens code.visualstudio.com -- grab the .deb (your Chromebook\u2019s Linux container is Debian-based).',
        steps: [
          'Turn on Linux first if you haven\u2019t: Settings -> Advanced -> Developers -> Linux development environment -> Turn on.',
          'Open the Terminal app (this opens the Linux container, not ChromeOS itself).',
          'Use the button below to download the VS Code .deb file from inside that Linux environment.',
          'Install it: sudo apt install ./<file>.deb',
          'Launch VS Code from the Chromebook app launcher (it appears there once installed).',
          ...VSCODE_AFTER_INSTALL_STEPS.slice(0, 1)
        ]
      },
      git: {
        label: 'Git',
        video: null,
        image: GIT_LINUX_IMAGE,
        downloadUrl: 'https://git-scm.com/download/linux',
        downloadLabel: 'Open the official Git download page',
        downloadDescription: 'Opens git-scm.com, for reference -- apt (below) is the simplest route inside the Linux container.',
        steps: [
          'Open the Terminal app (the Linux container).',
          'Run: sudo apt update',
          'Run: sudo apt install git',
          'Verify with: git --version',
          'This Terminal already runs bash -- there\u2019s no separate "Git Bash" package to install here.',
          ...GIT_AFTER_INSTALL_STEPS
        ]
      }
    }
  }
];
