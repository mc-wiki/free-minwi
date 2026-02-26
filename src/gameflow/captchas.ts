import type { GridConfig } from '../components/captchas/GridCaptcha.vue'

export type CaptchaChallenge = {
  prompt: string
  promptType: string
  answer: (answer: string) => boolean
  type: 'grid' | 'crafting'
  inventory?: Record<string, number>
  desiredItem?: string
  gridConfig?: GridConfig
}

export const captchaChallenges: CaptchaChallenge[] = [
  {
    prompt: 'Select all squares with',
    promptType: 'Creepers',
    answer: () => true,
    type: 'grid',
    gridConfig: {
      targetItem: '🧟',
      targetCount: 3,
      fillItem: '🟫',
      randomize: true,
    },
  },
  {
    prompt: 'Craft the item',
    promptType: 'Sticks',
    answer: () => true,
    type: 'crafting',
    inventory: { oak_plank: 4 },
    desiredItem: 'stick',
  },
  {
    prompt: 'Craft the item',
    promptType: 'Torch',
    answer: () => true,
    type: 'crafting',
    inventory: { coal: 2, stick: 2 },
    desiredItem: 'torch',
  },
  {
    prompt: 'Craft the item',
    promptType: 'Crafting Table',
    answer: () => true,
    type: 'crafting',
    inventory: { oak_plank: 6 },
    desiredItem: 'crafting_table',
  },
]

export function createShuffledCaptchaQueue(): number[] {
  const indices = captchaChallenges.map((_, index) => index)
  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j]!, indices[i]!]
  }
  return indices
}

export function checkCaptchaAnswer(
  userAnswer: string,
  captchaIndex: number,
): boolean {
  const captcha = captchaChallenges[captchaIndex]
  if (!captcha) return false

  const normalized = userAnswer.toLowerCase().trim()
  return captcha.answer(normalized)
}

export function getCaptcha(captchaIndex: number): CaptchaChallenge | undefined {
  return captchaChallenges[captchaIndex]
}
