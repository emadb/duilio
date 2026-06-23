import type { Task } from '../types/task';

const now = Date.now();

export const SEED_TASKS: Task[] = [
  {
    id: 's1',
    title: 'Set up CI/CD pipeline',
    description:
      'Configure GitHub Actions for automated testing and deployment to staging environments.',
    status: 'done',
    dueDate: '2026-06-10',
    tags: ['backend', 'devops'],
    createdAt: now - 86400e3 * 5,
  },
  {
    id: 's2',
    title: 'Design system token audit',
    description:
      'Review all color and spacing tokens to ensure alignment with Borealis theme guidelines.',
    status: 'in-progress',
    dueDate: '2026-06-28',
    tags: ['design', 'frontend'],
    createdAt: now - 86400e3 * 3,
  },
  {
    id: 's3',
    title: 'Fix pagination bug in data table',
    description:
      'Page count resets unexpectedly when applying filters. Reproduced on Chrome and Firefox.',
    status: 'in-progress',
    dueDate: '2026-06-24',
    tags: ['bug', 'frontend'],
    createdAt: now - 86400e3 * 2,
  },
  {
    id: 's4',
    title: 'Write API documentation',
    description:
      'Document all REST endpoints using OpenAPI 3.0 spec with request and response examples.',
    status: 'todo',
    dueDate: '2026-07-05',
    tags: ['backend', 'docs'],
    createdAt: now - 86400e3,
  },
  {
    id: 's5',
    title: 'Add dark mode support',
    description:
      'Implement EUI dark theme toggling and persist user preference in localStorage.',
    status: 'todo',
    dueDate: '',
    tags: ['frontend', 'design'],
    createdAt: now - 3600e3,
  },
  {
    id: 's6',
    title: 'Quarterly security review',
    description:
      'Audit authentication flows, API access controls, and dependency vulnerabilities.',
    status: 'todo',
    dueDate: '2026-07-10',
    tags: ['security', 'review'],
    createdAt: now,
  },
];
