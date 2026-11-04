// ─────────────────────────────────────────────────────────────
//  EDIT ME — everything personal about the site lives here.
// ─────────────────────────────────────────────────────────────

export const site = {
  name: 'Henry Cooper',
  /** Shown in the browser tab and link previews. */
  title: 'Henry Cooper — Portfolio',
  role: 'Software Engineer',
  tagline:
    'Computer science senior at Franciscan University. I build web apps and APIs, and I run my own Linux server on the side.',
  description:
    'Henry Cooper, computer science senior at Franciscan University of Steubenville. Projects in Ruby on Rails, Go, and self-hosted infrastructure.',

  about: [
    'At Franciscan University of Steubenville I study computer science, with minors in cybersecurity and math. I graduate in May 2027.',
    'Right now my capstone team and I are building ScriptOS, a Rails app for the U.S. Conference of Catholic Bishops. I’ve also worked two IT jobs: a support internship at FTI Services and the campus help desk. Between them I’ve closed more than 1,200 tickets, and I saw a lot of software fail for the people using it.',
    'I’m looking for a software engineering role. Outside of class I play volleyball, organize poker nights in my dorm, and coordinate events for my Catholic fraternity on campus.',
  ],

  skills: [
    { group: 'Languages', items: ['C++', 'Python', 'JavaScript', 'Go', 'Ruby', 'SQL'] },
    {
      group: 'Development',
      items: ['React', 'Express.js', 'Ruby on Rails', 'FastAPI', 'REST APIs', 'DevSecOps'],
    },
    {
      group: 'Tools',
      items: ['Git', 'GitHub Actions', 'GitLab CI/CD', 'Docker', 'Jest', 'Jira', 'Linux', 'VirtualBox'],
    },
    {
      group: 'IT & Networking',
      items: ['Active Directory', 'Microsoft 365', 'CrowdStrike', 'TCP/IP', 'VLANs', 'Firewalls', 'VPNs'],
    },
  ],

  email: 'henryacooper06@gmail.com',

  socials: [
    { label: 'GitHub', href: 'https://github.com/carloacutis1' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/henry-cooper-2a41a7339' },
    { label: 'Résumé', href: '/resume.pdf' },
  ],

  /** Small Latin line in the footer. Set to '' to hide it. */
  motto: 'Ite Ad Joseph',
};
