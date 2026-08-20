import type { JobMode, JobType } from './api'

export interface JobTemplate {
  type: JobType
  label: string
  description: string
  mode: JobMode
  objective?: string
  goal?: string
  prompt: string
  defaultSchedule: string
}

// Lane 3 — "Browser agents in the wild": Kane acts on the web as an agent's hands.
export const JOB_TEMPLATES: JobTemplate[] = [
  // --- Monitoring / data ---
  {
    type: 'check-website',
    label: 'Check website',
    description: 'Monitor a site and report its current state / changes',
    mode: 'pipeline',
    objective: 'Go to {url} and report its current state',
    prompt: 'Summarize what is on the page and note anything notable or changed since last time.',
    defaultSchedule: '0 * * * *',
  },
  {
    type: 'lead-enrichment',
    label: 'Lead enrichment',
    description: 'Visit a prospect site and return a one-page summary',
    mode: 'plan',
    goal: 'Visit {url} and return a one-pager on this company',
    prompt: 'Return a concise one-pager: what they do, size/signal, recent news, and where they might need our product.',
    defaultSchedule: '0 9 * * 1',
  },
  {
    type: 'wikipedia',
    label: 'Wikipedia speedrun',
    description: 'Create or edit a Wikipedia entry about a topic',
    mode: 'plan',
    goal: 'Speedrun creating/editing the Wikipedia entry for {topic}',
    prompt: 'Summarize what you did and the final state of the page.',
    defaultSchedule: '',
  },
  // --- Shopping / booking ---
  {
    type: 'shopping',
    label: 'Shopping',
    description: 'Search a store and have AI compare and pick the best',
    mode: 'plan',
    goal: 'Find {query} on {store}',
    prompt: 'Compare the top results, rank by value and quality, and explain the best pick.',
    defaultSchedule: '0 9 * * *',
  },
  {
    type: 'travel',
    label: 'Travel agent',
    description: 'Book real flights/hotels on sites with no public API',
    mode: 'plan',
    goal: 'Book the best flight from {from} to {to} on {date} within {budget}',
    prompt: 'Summarize the option you picked, the price, and any tradeoffs. Stop before final payment.',
    defaultSchedule: '',
  },
  // --- Life admin autopilots ---
  {
    type: 'apply-jobs',
    label: 'Job application autopilot',
    description: 'Submit applications from your resume, pausing on essay questions',
    mode: 'plan',
    goal: 'Apply to {posting} using the attached resume',
    prompt: 'Report which fields you filled, which essay questions are left for the human, and the submission status.',
    defaultSchedule: '0 8 * * 1',
  },
  {
    type: 'subscription-killer',
    label: 'Subscription killer',
    description: 'Read statements and navigate each cancellation flow',
    mode: 'plan',
    goal: 'Cancel my subscription to {service} using its cancellation flow',
    prompt: 'Report each step taken, where you got stuck, and whether the cancel succeeded.',
    defaultSchedule: '',
  },
  {
    type: 'renew',
    label: 'Renew everything',
    description: 'Renew domains, licenses, certifications, memberships before expiry',
    mode: 'plan',
    goal: 'Renew my {thing} before it expires',
    prompt: 'Report the renewal status, cost, and confirmation for each item.',
    defaultSchedule: '0 9 1 * *',
  },
  // --- Spectacle / agents in the wild ---
  {
    type: 'game',
    label: 'Browser game player',
    description: 'Play a browser game via vision + clicks, no API',
    mode: 'plan',
    goal: 'Play {game} and maximize the score',
    prompt: 'Summarize your strategy, score achieved, and what blocked you.',
    defaultSchedule: '',
  },
  {
    type: 'publish',
    label: 'Recursive blog publisher',
    description: 'Write a post about this agent, then publish it via Kane',
    mode: 'plan',
    goal: 'Write a blog post about this agent and publish it to {url}',
    prompt: 'Summarize the post you wrote and confirm it was published.',
    defaultSchedule: '0 18 * * *',
  },
]

export function templateFor(type: JobType): JobTemplate | undefined {
  return JOB_TEMPLATES.find((t) => t.type === type)
}
