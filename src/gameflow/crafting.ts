export const ITEMS: Record<string, { name: string; imageUrl: string }> = {
  oak_plank: {
    name: 'Oak Planks',
    imageUrl: 'https://minecraft.wiki/images/Invicon_Oak_Planks.png',
  },
  stick: {
    name: 'Stick',
    imageUrl: 'https://minecraft.wiki/images/Invicon_Stick.png',
  },
  coal: {
    name: 'Coal',
    imageUrl: 'https://minecraft.wiki/images/Invicon_Coal.png',
  },
  torch: {
    name: 'Torch',
    imageUrl: 'https://minecraft.wiki/images/Invicon_Torch.png',
  },
  crafting_table: {
    name: 'Crafting Table',
    imageUrl: 'https://minecraft.wiki/images/Invicon_Crafting_Table.png',
  },
}

export interface ShapedRecipe {
  type: 'minecraft:crafting_shaped'
  key: Record<string, string>
  pattern: string[]
  result: { count: number; id: string }
}

export interface ShapelessRecipe {
  type: 'minecraft:crafting_shapeless'
  ingredients: string[]
  result: { count: number; id: string }
}

export type Recipe = ShapedRecipe | ShapelessRecipe

export const RECIPES: Recipe[] = [
  {
    type: 'minecraft:crafting_shaped',
    key: { '#': 'oak_plank' },
    pattern: ['#', '#'],
    result: { count: 4, id: 'stick' },
  },
  {
    type: 'minecraft:crafting_shaped',
    key: { C: 'coal', S: 'stick' },
    pattern: ['C', 'S'],
    result: { count: 4, id: 'torch' },
  },
  {
    type: 'minecraft:crafting_shaped',
    key: { '#': 'oak_plank' },
    pattern: ['##', '##'],
    result: { count: 1, id: 'crafting_table' },
  },
]

export function matchShaped(
  recipe: ShapedRecipe,
  grid: (string | null)[],
): boolean {
  const patternHeight = recipe.pattern.length
  const patternWidth = Math.max(...recipe.pattern.map((r) => r.length))
  for (let rowOffset = 0; rowOffset <= 3 - patternHeight; rowOffset++) {
    for (let colOffset = 0; colOffset <= 3 - patternWidth; colOffset++) {
      const expected: (string | null)[] = Array(9).fill(null)
      for (let r = 0; r < patternHeight; r++) {
        const row = recipe.pattern[r] ?? ''
        for (let c = 0; c < patternWidth; c++) {
          const char = row[c] ?? ' '
          if (char !== ' ') {
            expected[(rowOffset + r) * 3 + (colOffset + c)] =
              recipe.key[char] ?? null
          }
        }
      }
      if (grid.every((item, i) => item === expected[i])) return true
    }
  }
  return false
}

export function matchShapeless(
  recipe: ShapelessRecipe,
  grid: (string | null)[],
): boolean {
  const gridItems = grid.filter((x): x is string => x !== null)
  if (gridItems.length !== recipe.ingredients.length) return false
  const remaining = [...recipe.ingredients]
  for (const item of gridItems) {
    const idx = remaining.indexOf(item)
    if (idx === -1) return false
    remaining.splice(idx, 1)
  }
  return true
}
