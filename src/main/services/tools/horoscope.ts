import { z } from 'zod';

export const horoscopeSchema = z.object({
  sign: z.string().describe('An astrological sign like Taurus or Aquarius'),
});

// Tool metadata for UI
export const horoscopeMetadata = {
  uiDescription: 'Daily horoscope readings based on your astrological sign. Get insights about love, career, health, and general wellbeing for today.',
  tags: ['astrology', 'daily', 'entertainment'],
  requiredTools: [] as string[],
  parameters: {
    sign: { type: 'string', description: 'An astrological sign like Taurus or Aquarius', required: true },
  },
};

export const horoscopeTool = {
  type: 'function' as const,
  name: 'get_horoscope',
  description: "Get today's horoscope for an astrological sign",
  parameters: horoscopeSchema,
  metadata: horoscopeMetadata,
  execute: async ({ sign }: { sign: string }) => {
    // Mock implementation - replace with real API call
    return `Horoscope for ${sign}: Today is a great day for new beginnings and creative endeavors!`;
  }
};
