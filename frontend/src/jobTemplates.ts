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
  defaultStartUrl?: string
}

export const JOB_TEMPLATES: JobTemplate[] = [
  {
    type: 'news-digest',
    label: 'News digest',
    description: 'Get the top 3 headlines from a news source',
    mode: 'pipeline',
    objective: 'Extract the top 3 headlines with their summaries from the current page',
    prompt: 'Return a concise daily briefing: headline, one-line summary, and link for each story.',
    defaultSchedule: '0 8 * * *',
    defaultStartUrl: 'https://news.ycombinator.com',
  },
  {
    type: 'price-tracker',
    label: 'Price tracker',
    description: 'Monitor a product price and report changes',
    mode: 'pipeline',
    objective: 'Find the current price of the product on this page and store it as "price"',
    prompt: 'Report the product name, current price, any discounts or deals visible, and whether the price seems high, low, or normal.',
    defaultSchedule: '0 * * * *',
  },
  {
    type: 'job-scanner',
    label: 'Job scanner',
    description: 'Search job boards and list top matches',
    mode: 'pipeline',
    objective: 'List the top 5 job postings with title, company, and location',
    prompt: 'Return a ranked list of the top 5 matches with title, company, location, and link.',
    defaultSchedule: '0 9 * * *',
    defaultStartUrl: 'https://www.indeed.com/jobs?q=software+engineer&l=Remote',
  },
  {
    type: 'add-to-cart',
    label: 'Add to cart',
    description: 'Search eBay for an item and add it to cart',
    mode: 'pipeline',
    objective: 'Search for {query} on eBay, pick the first relevant result, and add it to cart',
    prompt: 'Report the item title, price, seller, and whether it was added to cart successfully. Note if checkout requires sign-in.',
    defaultSchedule: '',
    defaultStartUrl: 'https://www.ebay.com',
  },
  {
    type: 'competitor-watch',
    label: 'Competitor watch',
    description: 'Monitor a competitor\'s pricing or features page',
    mode: 'pipeline',
    objective: 'Report the current pricing tiers, features, or any visible changes on this page',
    prompt: 'Compare what you see to a typical SaaS pricing page. Report tiers, prices, key features, and any CTAs or promotions.',
    defaultSchedule: '0 9 * * 1',
  },
  {
    type: 'subscription-killer',
    label: 'Subscription killer',
    description: 'Navigate cancellation flows for hard-to-cancel services',
    mode: 'plan',
    goal: 'Navigate to the cancellation page and cancel my subscription, going through any retention flows or obstacles',
    prompt: 'Report each step taken, where you got stuck, what retention tactics were used, and whether the cancel succeeded.',
    defaultSchedule: '',
  },
  {
    type: 'post-social',
    label: 'Post to Bluesky',
    description: 'Log in to Bluesky and publish a post',
    mode: 'pipeline',
    objective: 'Log into Bluesky with username {username} and password {password}, then write and publish this post: {post}',
    prompt: 'Confirm the post was published and summarize exactly what was posted. Note if login or posting failed.',
    defaultSchedule: '',
    defaultStartUrl: 'https://bsky.app',
  },
]

export function templateFor(type: JobType): JobTemplate | undefined {
  return JOB_TEMPLATES.find((t) => t.type === type)
}
