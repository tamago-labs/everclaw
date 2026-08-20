// Minimal 5-field cron support: minute hour day-of-month month day-of-week.
// Supports: *, */n (step), a,b (list), a-b (range). Day-of-week 0-6 (Sun-Sat), 7 == 0.

function parseField(field: string, min: number, max: number): number[] {
  const out = new Set<number>()
  if (field === '*') {
    for (let i = min; i <= max; i++) out.add(i)
    return [...out]
  }
  for (const part of field.split(',')) {
    if (part.includes('/')) {
      const [range, stepStr] = part.split('/')
      const step = parseInt(stepStr, 10)
      let lo = min
      let hi = max
      if (range !== '*') {
        if (range.includes('-')) {
          [lo, hi] = range.split('-').map((n) => parseInt(n, 10))
        } else {
          lo = hi = parseInt(range, 10)
        }
      }
      for (let i = lo; i <= hi; i += step) out.add(i)
    } else if (part.includes('-')) {
      const [lo, hi] = part.split('-').map((n) => parseInt(n, 10))
      for (let i = lo; i <= hi; i++) out.add(i)
    } else {
      out.add(parseInt(part, 10))
    }
  }
  return [...out].sort((a, b) => a - b)
}

export interface CronParts {
  minutes: number[]
  hours: number[]
  days: number[]
  months: number[]
  dows: number[]
}

export function parseCron(schedule: string): CronParts | null {
  const fields = schedule.trim().split(/\s+/)
  if (fields.length !== 5) return null
  try {
    return {
      minutes: parseField(fields[0], 0, 59),
      hours: parseField(fields[1], 0, 23),
      days: parseField(fields[2], 1, 31),
      months: parseField(fields[3], 1, 12),
      dows: parseField(fields[4], 0, 6).map((d) => (d === 7 ? 0 : d)),
    }
  } catch {
    return null
  }
}

export function shouldRunNow(schedule: string, now: Date = new Date()): boolean {
  const parts = parseCron(schedule)
  if (!parts) return false
  const dow = now.getDay() // 0-6
  return (
    parts.minutes.includes(now.getMinutes()) &&
    parts.hours.includes(now.getHours()) &&
    parts.days.includes(now.getDate()) &&
    parts.months.includes(now.getMonth() + 1) &&
    parts.dows.includes(dow)
  )
}

// Scan forward (minute-by-minute) to the next matching time. Caps at ~2 years.
export function computeNextRun(schedule: string, from: Date = new Date()): Date | null {
  const parts = parseCron(schedule)
  if (!parts) return null
  const next = new Date(from.getTime())
  for (let i = 0; i < 2 * 366 * 24 * 60; i++) {
    next.setTime(from.getTime() + i * 60000)
    if (shouldRunNow(schedule, next)) return new Date(next)
  }
  return null
}
