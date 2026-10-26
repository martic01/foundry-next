// What each course needs installed. Add a course or a tool here and it
// shows up on that course's Installation tab and in the pop-up, only for
// students who are enrolled in it. VS Code and Git have per-OS write-ups in
// lib/installation-content.js; every other tool is described below.
export const TOOLS = {
  vscode: { label: 'VS Code', why: 'The editor you write code in.', perOs: true },
  git: { label: 'Git', why: 'Saves versions of your work and lets you push it to GitHub.', perOs: true },
  node: {
    label: 'Node.js',
    why: 'Runs JavaScript on your laptop and powers React tools (npm).',
    downloadUrl: 'https://nodejs.org/en/download',
    downloadLabel: 'Open the official Node.js download page',
    downloadDescription: 'Opens nodejs.org. Choose the LTS version for your computer.',
    steps: [
      'Open the download page below and download the LTS version for your operating system.',
      'Run the installer and accept the defaults (on Windows, leave "Add to PATH" ticked).',
      'Close and reopen your terminal (Git Bash, PowerShell or Terminal).',
      'Check it worked: run node -v and then npm -v. Both should print a version number.'
    ]
  },
  virtualbox: {
    label: 'VirtualBox',
    why: 'Runs a safe virtual computer, so you can practise security tools without risking your own.',
    downloadUrl: 'https://www.virtualbox.org/wiki/Downloads',
    downloadLabel: 'Open the official VirtualBox download page',
    downloadDescription: 'Opens virtualbox.org. Pick the download for your operating system.',
    steps: [
      'Open the download page below and download VirtualBox for your operating system.',
      'Run the installer and accept the defaults. Restart your laptop if it asks you to.',
      'If a virtual machine later refuses to start, restart your laptop, open the BIOS/UEFI settings and switch on virtualization (it is called Intel VT-x or AMD-V / SVM).',
      'Open VirtualBox once to confirm it launches.'
    ]
  },
  kali: {
    label: 'Kali Linux (virtual machine)',
    why: 'The security toolkit used in class. It already includes Nmap, Wireshark and Burp Suite.',
    downloadUrl: 'https://www.kali.org/get-kali/#kali-virtual-machines',
    downloadLabel: 'Open the official Kali virtual machine page',
    downloadDescription: 'Opens kali.org. Download the VirtualBox image (a large file, so use good Wi-Fi). Macs with an Apple chip: the same page has an ARM image for UTM.',
    steps: [
      'Install VirtualBox first (see the VirtualBox tab).',
      'Open the download page below and download the Kali VirtualBox image (a .7z file).',
      'Extract it with 7-Zip (Windows) or The Unarchiver (Mac). You get a .vbox or .ova file.',
      'In VirtualBox choose File > Import Appliance (for .ova) or Machine > Add (for .vbox) and select the file.',
      'Before starting, open Settings and give the machine at least 2 CPUs and 4 GB of memory if your laptop allows it.',
      'Start it. The default login is kali / kali, so change the password straight away with the passwd command.'
    ]
  }
};

// Tools per course, in the order they should be installed.
export const COURSE_TOOLS = {
  foundations: ['vscode', 'git'],
  react: ['vscode', 'git', 'node'],
  cybersecurity: ['virtualbox', 'kali']
};

export const COMMUNITY_ID = 'whatsapp'; // "I've joined the WhatsApp group", tracked like a tool
