import type { GridConfig } from '../components/captchas/GridCaptcha.vue'

export type CaptchaChallenge = {
  prompt: string
  promptType: string
} & (
  | {
      type: 'crafting'
      inventory: Record<string, number>
      desiredItem: string
    }
  | {
      type: 'grid'
      gridConfig: GridConfig
    }
  | {
      type: 'pow'
      challengeText: string
      difficulty: number
    }
)

export const captchaChallenges: CaptchaChallenge[] = [
  {
    prompt: 'Select all squares with',
    promptType: 'Creepers',
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
    promptType: 'Diorite',
    type: 'crafting',
    inventory: {
      cobblestone: 2,
      stone: 2,
      deepslate: 2,
      cobbled_deepslate: 2,
      quartz: 2,
    },
    desiredItem: 'diorite',
  },
  {
    prompt: 'Craft the item',
    promptType: 'Andesite',
    type: 'crafting',
    inventory: {
      cobblestone: 4,
      stone: 4,
      deepslate: 4,
      cobbled_deepslate: 4,
      quartz: 4,
    },
    desiredItem: 'andesite',
  },
  {
    prompt: 'Craft the item',
    promptType: 'Granite',
    type: 'crafting',
    inventory: {
      cobblestone: 2,
      stone: 2,
      deepslate: 2,
      cobbled_deepslate: 2,
      quartz: 2,
    },
    desiredItem: 'granite',
  },
  {
    prompt: 'Craft the item',
    promptType: 'Waxed Weathered Copper Bulb',
    type: 'crafting',
    inventory: {
      weathered_copper: 3,
      honeycomb: 3,
      blaze_rod: 1,
      redstone: 1,
    },
    desiredItem: 'waxed_weathered_copper_bulb',
  },
  {
    prompt: 'Craft the item',
    promptType: 'Waxed Weathered Cut Copper Stairs',
    type: 'crafting',
    inventory: {
      copper_block: 8,
      exposed_copper: 8,
      weathered_copper: 8,
      oxidized_copper: 8,
      honeycomb: 8,
    },
    desiredItem: 'waxed_weathered_cut_copper_stairs',
  },
  {
    prompt: 'Craft the item',
    promptType: 'Waxed Copper Lantern',
    type: 'crafting',
    inventory: {
      copper_block: 8,
      honeycomb: 8,
      oak_plank: 2,
      coal: 1,
    },
    desiredItem: 'waxed_copper_lantern',
  },
  {
    prompt: 'Craft the item',
    promptType: 'Lead',
    type: 'crafting',
    inventory: {
      string: 64,
      slime_ball: 1,
      iron_ingot: 1,
    },
    desiredItem: 'lead',
  },
  {
    prompt: 'Craft the item',
    promptType: 'Golden Carrot',
    type: 'crafting',
    inventory: {
      gold_nugget: 8,
      gold_ingot: 8,
      gold_block: 8,
      carrot: 1,
    },
    desiredItem: 'golden_carrot',
  },
  {
    prompt: 'Craft the item',
    promptType: 'Golden Apple',
    type: 'crafting',
    inventory: {
      gold_nugget: 8,
      gold_ingot: 8,
      gold_block: 8,
      apple: 1,
    },
    desiredItem: 'golden_apple',
  },
  {
    prompt: 'Craft the item',
    promptType: 'Golden Dandelion',
    type: 'crafting',
    inventory: {
      gold_nugget: 8,
      gold_ingot: 8,
      gold_block: 8,
      dandelion: 1,
    },
    desiredItem: 'golden_dandelion',
  },
  {
    prompt: 'Find a nonce where SHA-256 starts with',
    promptType: '00',
    type: 'pow',
    challengeText: 'minecraft.wiki/minwi-proof-of-work',
    difficulty: 2,
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

export function getCaptcha(captchaIndex: number): CaptchaChallenge | undefined {
  return captchaChallenges[captchaIndex]
}
