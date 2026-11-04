import type { Hue } from '../lib/glass';

// ─────────────────────────────────────────────────────────────
//  EDIT ME — your projects. Order here = order on the site.
//
//  hue   → the colour of the project's stained-glass window:
//          'ruby' | 'sapphire' | 'emerald' | 'amber' | 'amethyst'
//  slug  → URL of the detail page (/projects/<slug>/). Keep it unique.
//  The glass pattern is generated from the slug, so each project
//  gets its own window automatically.
//
//  flagship → add this to feature a project in "Selected Works" at the
//          top of the page, with its problem, solution, and impact numbers.
//          Keep flagships first in the list so the numbering reads in order.
// ─────────────────────────────────────────────────────────────

export interface Project {
  slug: string;
  title: string;
  /** Leave out if there's no date to show. */
  year?: string;
  blurb: string;
  description: string[];
  tags: string[];
  hue: Hue;
  role?: string;
  links: { live?: string; repo?: string };
  flagship?: Flagship;
}

export interface Flagship {
  /** Who it's for, e.g. "For the U.S. Conference of Catholic Bishops". */
  for: string;
  /** The real-world problem, in a sentence or two. */
  problem: string;
  /** What you built and what you personally did. */
  solution: string;
  /** Two to four headline numbers. Keep them true and checkable. */
  impact: { value: string; label: string }[];
}

export const projects: Project[] = [
  {
    slug: 'scriptos',
    title: 'ScriptOS',
    year: '2026–27',
    blurb: 'A Rails workflow app for the U.S. Conference of Catholic Bishops, built as my senior capstone.',
    description: [
      'The USCCB was coordinating work through email chains and files spread across different storage services. ScriptOS replaces that with a single Ruby on Rails app, used by hundreds of people.',
      'We work in Agile sprints. I’ve closed more than 20 Jira tasks: security patches, database models, and role-based authorization covering 40+ REST API calls.',
    ],
    tags: ['Ruby on Rails', 'REST APIs', 'Authorization', 'Agile', 'Jira'],
    hue: 'ruby',
    role: 'Senior capstone · Team project',
    links: {},
    flagship: {
      for: 'For the U.S. Conference of Catholic Bishops',
      problem:
        'The USCCB coordinated its work through email chains, with files scattered across different storage services.',
      solution:
        'My capstone team is building ScriptOS, one Ruby on Rails workflow app that replaces both. I’ve built security patches, database models, and role-based authorization, so each person can only see and do what their role allows.',
      impact: [
        { value: '100s', label: 'of people using it' },
        { value: '40+', label: 'API calls behind role-based access' },
        { value: '20+', label: 'Jira tasks I’ve closed' },
      ],
    },
  },
  {
    slug: 'home-lab',
    title: 'Home Lab',
    year: 'Ongoing',
    blurb: 'A self-hosted Linux server for 10 users, running at 99% uptime for 18 months.',
    description: [
      'My Linux server handles VPN, file storage, and a Minecraft server for 10 friends. It has stayed up 99% of the time over 18 months.',
      'I split the 20-device network into 4 VLANs with firewall rules and an IPsec VPN, and set up a VirtualBox lab for security practice. The MC Server Stats API runs against the Minecraft server here.',
    ],
    tags: ['Linux', 'VLANs', 'IPsec VPN', 'Firewalls', 'VirtualBox'],
    hue: 'emerald',
    role: 'Personal project',
    links: {},
    flagship: {
      for: 'Self-hosted for 10 people',
      problem: 'Ten people needed a private VPN, shared file storage, and a game server they could count on.',
      solution:
        'I run a Linux server that handles all three. I split the 20-device network into 4 VLANs with firewall rules and an IPsec VPN, and wrote an API that reports live stats from the game server.',
      impact: [
        { value: '99%', label: 'uptime' },
        { value: '18 mo', label: 'running' },
        { value: '10', label: 'people relying on it' },
      ],
    },
  },
  {
    slug: 'mc-server-stats',
    title: 'MC Server Stats',
    year: '2026',
    blurb: 'A REST API that reports live player stats from a Minecraft server over RCON, with no mods.',
    description: [
      'This FastAPI service connects to a Minecraft server over RCON, the remote console protocol built into the game. It sends ordinary console commands and turns the text replies into JSON: who’s online, the world seed, and each player’s health, position, hunger, and XP.',
      'It keeps one RCON connection open and reuses it for every request. If the game server is down, the API still starts and returns 502 until the server comes back. It runs in Docker Compose, reads its settings from environment variables, and comes with interactive Swagger docs.',
    ],
    tags: ['Python', 'FastAPI', 'RCON', 'Docker'],
    hue: 'sapphire',
    role: 'Personal project',
    links: { repo: 'https://github.com/carloacutis1/MC-Server-Stats-webapp' },
    flagship: {
      for: 'For the Minecraft server on my home lab',
      problem:
        'Getting live player info out of a vanilla Minecraft server, like who’s online, where they are, and how they’re doing, usually means installing mods or plugins.',
      solution:
        'A FastAPI service that talks to the server over RCON, the remote console built into the game, and turns its text replies into JSON. It runs in Docker, reuses one connection for every request, and returns a clear 502 instead of crashing when the game server is down.',
      impact: [
        { value: '7', label: 'REST endpoints' },
        { value: '0', label: 'mods or plugins needed' },
        { value: '1', label: 'shared RCON connection' },
      ],
    },
  },
  {
    slug: 'fileshare-api',
    title: 'FileShareAPI',
    year: '2026',
    blurb: 'A Google Drive-style file storage API in Go and PostgreSQL, containerized and shipped through CI.',
    description: [
      'Four of us built the backend for a cloud file storage service: user accounts, nested folders, file uploads and downloads with metadata, and sharing files between users. Each of us owned one domain end to end. Mine was files and their API endpoints.',
      'It’s written in Go with the Gin framework and PostgreSQL. I learned both Go and Gin from scratch for the project. It runs in Docker Compose, and a GitLab CI pipeline builds, lints, and tests it on every push.',
    ],
    tags: ['Go', 'Gin', 'PostgreSQL', 'Docker Compose', 'GitLab CI'],
    hue: 'emerald',
    role: 'Files domain & API · Team of 4',
    links: { repo: 'https://github.com/carloacutis1/FileShareAPI' },
  },
  {
    slug: 'lunar-lander',
    title: 'Lunar Lander',
    year: '2026',
    blurb: 'A lunar descent simulator with real orbital physics and an autopilot. I was the project manager.',
    description: [
      'Team Lightsaber built this over 15 weeks for our Software Architecture course. You fly an Apollo-style lander down to the Moon by hand or let the autopilot do it, with mission-control telemetry for altitude, velocity, fuel, and time to impact. Gravity changes with altitude, and the lander gets lighter as it burns fuel.',
      'I managed the five-person team. I set up the repo and workflow, assigned roles, ran the weekly planning, reviewed and merged pull requests, and handled testing, documentation, and CI/CD. We finished 221 of 234 planned tasks.',
    ],
    tags: ['React', 'Express.js', 'WebSockets', 'CI/CD', 'Project management'],
    hue: 'amber',
    role: 'Project manager · Team of 5',
    links: { repo: 'https://github.com/carloacutis1/moon-lander' },
  },
  {
    slug: 'department-website',
    title: 'Department Website',
    year: '2026',
    blurb: 'A new website for my university department. I was the backend developer and project manager.',
    description: [
      'Our Algorithms class built a website for the department as a team project, using AI-assisted development.',
      'As project manager I defined the requirements and reviewed the team’s pull requests. As backend developer I built requested features and fixed bugs.',
    ],
    tags: ['Backend', 'Project management', 'Code review', 'AI-assisted development'],
    hue: 'amethyst',
    role: 'Backend developer & project manager',
    links: {},
  },
  {
    slug: 'portfolio',
    title: 'This Portfolio',
    year: '2026',
    blurb: 'The site you’re on: a portfolio where every project is its own generated stained-glass window.',
    description: [
      'It’s built with Astro, so it ships as static HTML with almost no JavaScript. Each project’s window is generated from its name by a seeded random function, so no two match and none are hand-drawn.',
      'Click any empty space and a wave runs through the leaded-glass lattice behind the page. That’s drawn on a canvas that caches the resting pattern, so only the lit lines are redrawn each frame and the animation stays smooth. I directed the design and content and built it with AI-assisted development.',
    ],
    tags: ['Astro', 'TypeScript', 'Canvas', 'CSS', 'AI-assisted development'],
    hue: 'amber',
    role: 'Personal project',
    links: {},
  },
  {
    slug: 'poker-night',
    title: 'Poker Night',
    year: 'In progress',
    blurb: 'A C# and .NET app that works out payouts for our poker nights and tracks everyone’s stats.',
    description: [
      'This app will work out who’s owed what at the end of a poker night and keep a running record of each player’s results over time.',
      'I’m just getting started on it. This page will be updated as the project comes together.',
    ],
    tags: ['C#', '.NET'],
    hue: 'ruby',
    role: 'Personal project',
    links: {},
  },
  {
    slug: '2048',
    title: '2048',
    year: '2026',
    blurb: 'The sliding-tile puzzle, written from scratch in plain JavaScript.',
    description: [
      'I wrote this version of the 2048 puzzle game without a framework or game library. Instead of writing separate logic for all four directions, the board is rotated so that every move becomes a slide to the left, compressed and merged, then rotated back.',
      'You play with the arrow keys or WASD. A new tile only spawns when a move actually changes the board, and there’s a one-step undo I added for debugging.',
    ],
    tags: ['JavaScript', 'HTML', 'CSS'],
    hue: 'sapphire',
    role: 'Personal project',
    links: { repo: 'https://github.com/carloacutis1/2048' },
  },
];
