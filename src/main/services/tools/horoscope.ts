import { z } from 'zod';

export const horoscopeSchema = z.object({
  sign: z.string().describe('An astrological sign like Taurus or Aquarius'),
});

export const horoscopeTool = {
  type: 'function' as const,
  name: 'get_horoscope',
  description: "Get today's horoscope for an astrological sign",
  parameters: horoscopeSchema,
  execute: async ({ sign }: { sign: string }) => {
    // Mock implementation - replace with real API call
    return `Horoscope for ${sign}: Today is a great day for new beginnings and creative endeavors!`;
  }
};
