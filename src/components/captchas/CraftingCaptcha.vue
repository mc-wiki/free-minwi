<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  ITEMS,
  matchShaped,
  matchShapeless,
  RECIPES,
} from '../../gameflow/crafting'

const props = defineProps<{
  isProcessing: boolean
  inventory: Record<string, number>
  desiredItem: string
}>()

const emit = defineEmits<{
  correct: []
  incorrect: []
}>()

// Slot layout (flat array of 45):
//  0- 8: crafting grid (3x3)
//  9-35: inventory storage (3 rows x 9)
// 36-44: hotbar (1 row x 9)
const TOTAL_SLOTS = 45
const HOTBAR_START = 36

interface Slot {
  item: string | null
  count: number
}

const makeSlots = (): Slot[] =>
  Array.from({ length: TOTAL_SLOTS }, () => ({ item: null, count: 0 }))

const slots = ref<Slot[]>(makeSlots())

const initHotbar = () => {
  let i = HOTBAR_START
  for (const [id, count] of Object.entries(props.inventory)) {
    if (i >= TOTAL_SLOTS) break
    slots.value[i] = { item: id, count }
    i++
  }
}

const itemLookup = ITEMS

const heldItem = ref<string | null>(null)
const heldCount = ref(0)

const craftingOutput = computed(() => {
  const grid = slots.value.slice(0, 9).map((s) => s.item)
  const match = RECIPES.find((r) =>
    r.type === 'minecraft:crafting_shaped'
      ? matchShaped(r, grid)
      : matchShapeless(r, grid),
  )
  return match?.result ?? null
})

// Drag

const isDragging = ref(false)
const justFinishedDragging = ref(false)
const dragStartPos = ref<{ x: number; y: number } | null>(null)
const dragSlots = ref<number[]>([])
const dragSlotOrigCounts = ref<number[]>([]) // original counts before left-drag redistribution
const dragStartSlot = ref<number | null>(null) // slot where mousedown fired (processed when drag confirmed)
const isRightClickDrag = ref(false)
const dragHeldTotal = ref(0) // held count at start of left-click drag (for even redistribution)
const hoveredSlot = ref<number | null>(null)
const DRAG_THRESHOLD = 5

const handleGlobalMouseUp = () => {
  if (!isDragging.value) return
  isDragging.value = false
  dragStartPos.value = null
  dragStartSlot.value = null
  dragSlots.value = []
  dragSlotOrigCounts.value = []
  if (heldCount.value <= 0) {
    heldItem.value = null
    heldCount.value = 0
  }
}

// Left-click drag: redistribute dragHeldTotal evenly across all visited slots
const redistributeLeftDrag = () => {
  const n = dragSlots.value.length
  const perSlot = Math.floor(dragHeldTotal.value / n)
  for (let i = 0; i < n; i++) {
    const sIdx = dragSlots.value[i]!
    const origCount = dragSlotOrigCounts.value[i]!
    slots.value[sIdx] =
      perSlot > 0
        ? { item: heldItem.value!, count: origCount + perSlot }
        : { item: origCount > 0 ? heldItem.value! : null, count: origCount }
  }
  heldCount.value = dragHeldTotal.value - perSlot * n
}

// Shared logic for entering a slot during drag (via initial slot trigger or mouseenter)
const processSlotDuringDrag = (slotIndex: number) => {
  if (
    isRightClickDrag.value
      ? !heldItem.value
      : dragSlots.value.length >= dragHeldTotal.value
  )
    return
  if (dragSlots.value.includes(slotIndex)) return
  const slot = slots.value[slotIndex]
  if (!slot || (slot.item && slot.item !== heldItem.value)) return

  if (isRightClickDrag.value) {
    // Right-click drag: place 1 per slot immediately
    dragSlots.value.push(slotIndex)
    slots.value[slotIndex] = { item: heldItem.value, count: slot.count + 1 }
    heldCount.value--
    if (heldCount.value <= 0) {
      heldItem.value = null
      heldCount.value = 0
    }
  } else {
    // Left-click drag: add slot and redistribute evenly
    dragSlots.value.push(slotIndex)
    dragSlotOrigCounts.value.push(slot.item === heldItem.value ? slot.count : 0)
    redistributeLeftDrag()
  }
}

const handleGlobalMouseMove = (event: MouseEvent) => {
  if (heldItem.value && dragStartPos.value && !isDragging.value) {
    const dx = Math.abs(event.clientX - dragStartPos.value.x)
    const dy = Math.abs(event.clientY - dragStartPos.value.y)
    if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
      isDragging.value = true
      // Process the initial slot now that drag is confirmed
      if (dragStartSlot.value !== null)
        processSlotDuringDrag(dragStartSlot.value)
    }
  }
}

const handleSlotMouseEnter = (slotIndex: number) => {
  hoveredSlot.value = slotIndex
  if (!isDragging.value) return
  processSlotDuringDrag(slotIndex)
}

// Slots

const MAX_STACK = 64
const DOUBLE_CLICK_MS = 300
const lastClickTime = ref(0)
const lastClickSlot = ref(-1)

const collectAllMatching = () => {
  const item = heldItem.value
  if (!item) return
  let count = heldCount.value
  for (let i = 0; i < TOTAL_SLOTS && count < MAX_STACK; i++) {
    const slot = slots.value[i]
    if (!slot || slot.item !== item) continue
    const canTake = Math.min(slot.count, MAX_STACK - count)
    count += canTake
    const remaining = slot.count - canTake
    slots.value[i] =
      remaining > 0 ? { item, count: remaining } : { item: null, count: 0 }
  }
  heldCount.value = count
}

const shiftClickMove = (fromSlot: number) => {
  const source = slots.value[fromSlot]
  if (!source || !source.item) return

  const item = source.item
  let count = source.count

  // Determine destination range based on source zone
  let destStart: number, destEnd: number
  if (fromSlot >= 36) {
    // Hotbar -> crafting table
    destStart = 0
    destEnd = 9
  } else if (fromSlot >= 9) {
    // Inventory -> hotbar
    destStart = 36
    destEnd = 45
  } else {
    // Crafting table -> inventory
    destStart = 9
    destEnd = 36
  }

  for (let i = destStart; i < destEnd && count > 0; i++) {
    const dest = slots.value[i]
    if (!dest || dest.item !== item) continue
    const space = MAX_STACK - dest.count
    if (space <= 0) continue
    const transfer = Math.min(count, space)
    slots.value[i] = { item, count: dest.count + transfer }
    count -= transfer
  }

  for (let i = destStart; i < destEnd && count > 0; i++) {
    const dest = slots.value[i]
    if (!dest || dest.item !== null) continue
    const transfer = Math.min(count, MAX_STACK)
    slots.value[i] = { item, count: transfer }
    count -= transfer
  }

  slots.value[fromSlot] = count > 0 ? { item, count } : { item: null, count: 0 }
}

const handleSlotMouseDown = (slotIndex: number, event: MouseEvent) => {
  if (props.isProcessing) return
  event.preventDefault()
  if (event.button !== 0 && event.button !== 2) return

  const slot = slots.value[slotIndex]
  if (!slot) return

  if (event.button === 0 && event.shiftKey && !heldItem.value) {
    shiftClickMove(slotIndex)
    return
  }

  const now = Date.now()
  if (
    event.button === 0 &&
    heldItem.value &&
    now - lastClickTime.value < DOUBLE_CLICK_MS &&
    lastClickSlot.value === slotIndex
  ) {
    lastClickTime.value = 0
    lastClickSlot.value = -1
    collectAllMatching()
    return
  }
  if (event.button === 0) {
    lastClickTime.value = now
    lastClickSlot.value = slotIndex
  }

  dragStartPos.value = { x: event.clientX, y: event.clientY }

  if (!heldItem.value) {
    if (!slot.item) return
    if (event.button === 2) {
      const half = Math.ceil(slot.count / 2)
      heldItem.value = slot.item
      heldCount.value = half
      const remaining = slot.count - half
      slots.value[slotIndex] =
        remaining > 0
          ? { item: slot.item, count: remaining }
          : { item: null, count: 0 }
    } else {
      heldItem.value = slot.item
      heldCount.value = slot.count
      slots.value[slotIndex] = { item: null, count: 0 }
    }
    // Clear so mouseup doesn't treat this as a "place" click on the same slot
    dragStartPos.value = null
    return
  }

  // Holding items
  isRightClickDrag.value = event.button === 2
  if (event.button === 2) {
    dragStartSlot.value = slotIndex
    return
  }

  if (slot.item && slot.item !== heldItem.value) {
    dragStartSlot.value = null
    const tempItem = slot.item
    const tempCount = slot.count
    slots.value[slotIndex] = { item: heldItem.value, count: heldCount.value }
    heldItem.value = tempItem
    heldCount.value = tempCount
    return
  }

  dragStartSlot.value = slotIndex
  dragHeldTotal.value = heldCount.value
}

const handleSlotMouseUp = (slotIndex: number, event: MouseEvent) => {
  if (props.isProcessing) return
  event.preventDefault()
  event.stopPropagation()

  const isRightClick = event.button === 2
  const slot = slots.value[slotIndex]
  if (!slot) return

  if (isDragging.value) {
    if (dragSlots.value.length === 0 && heldItem.value) {
      if (!slot.item) {
        slots.value[slotIndex] = {
          item: heldItem.value,
          count: heldCount.value,
        }
        heldItem.value = null
        heldCount.value = 0
      } else if (slot.item === heldItem.value) {
        slots.value[slotIndex] = {
          item: slot.item,
          count: slot.count + heldCount.value,
        }
        heldItem.value = null
        heldCount.value = 0
      } else {
        const tempItem = slot.item
        const tempCount = slot.count
        slots.value[slotIndex] = {
          item: heldItem.value,
          count: heldCount.value,
        }
        heldItem.value = tempItem
        heldCount.value = tempCount
      }
    } else {
      if (heldCount.value <= 0) {
        heldItem.value = null
        heldCount.value = 0
      }
    }

    dragSlots.value = []
    dragSlotOrigCounts.value = []
    dragStartSlot.value = null
    justFinishedDragging.value = true
    setTimeout(() => {
      justFinishedDragging.value = false
    }, 10)
  } else if (dragStartPos.value && !isDragging.value && heldItem.value) {
    if (isRightClick) {
      if (!slot.item || slot.item === heldItem.value) {
        slots.value[slotIndex] = { item: heldItem.value, count: slot.count + 1 }
        heldCount.value--
        if (heldCount.value <= 0) {
          heldItem.value = null
          heldCount.value = 0
        }
      }
    } else {
      if (!slot.item) {
        slots.value[slotIndex] = {
          item: heldItem.value,
          count: heldCount.value,
        }
        heldItem.value = null
        heldCount.value = 0
      } else if (slot.item === heldItem.value) {
        slots.value[slotIndex] = {
          item: slot.item,
          count: slot.count + heldCount.value,
        }
        heldItem.value = null
        heldCount.value = 0
      }
    }
  }

  isDragging.value = false
  dragStartPos.value = null
}

// Keyboard shortcuts

const handleKeyDown = (event: KeyboardEvent) => {
  if (props.isProcessing) return
  if (!event.shiftKey || !/^Digit[1-9]$/.test(event.code)) return
  event.preventDefault()

  const digit = parseInt(event.code[5]!)
  const hotbarIndex = HOTBAR_START + digit - 1
  const hotbarSlot = slots.value[hotbarIndex]
  if (!hotbarSlot) return

  if (!heldItem.value) {
    if (hoveredSlot.value === null) return
    const src = slots.value[hoveredSlot.value]
    if (!src || !src.item) return
    const temp = { item: hotbarSlot.item, count: hotbarSlot.count }
    slots.value[hotbarIndex] = { item: src.item, count: src.count }
    slots.value[hoveredSlot.value] = temp
    return
  }

  if (!hotbarSlot.item) {
    slots.value[hotbarIndex] = { item: heldItem.value, count: heldCount.value }
    heldItem.value = null
    heldCount.value = 0
  } else if (hotbarSlot.item === heldItem.value) {
    slots.value[hotbarIndex] = {
      item: hotbarSlot.item,
      count: hotbarSlot.count + heldCount.value,
    }
    heldItem.value = null
    heldCount.value = 0
  } else {
    const tempItem = hotbarSlot.item
    const tempCount = hotbarSlot.count
    slots.value[hotbarIndex] = { item: heldItem.value, count: heldCount.value }
    heldItem.value = tempItem
    heldCount.value = tempCount
  }
}

// Result slot interaction

const consumeCraft = () => {
  const grid = slots.value.slice(0, 9).map((s) => s.item)

  for (const recipe of RECIPES) {
    if (recipe.type === 'minecraft:crafting_shaped') {
      const patternHeight = recipe.pattern.length
      const patternWidth = Math.max(...recipe.pattern.map((r) => r.length))
      for (let rowOffset = 0; rowOffset <= 3 - patternHeight; rowOffset++) {
        for (let colOffset = 0; colOffset <= 3 - patternWidth; colOffset++) {
          const expected: (string | null)[] = Array(9).fill(null)
          for (let r = 0; r < patternHeight; r++) {
            const row = recipe.pattern[r] ?? ''
            for (let c = 0; c < patternWidth; c++) {
              const char = row[c] ?? ' '
              if (char !== ' ')
                expected[(rowOffset + r) * 3 + (colOffset + c)] =
                  recipe.key[char] ?? null
            }
          }
          if (!grid.every((item, i) => item === expected[i])) continue
          for (let i = 0; i < 9; i++) {
            if (expected[i] === null) continue
            const s = slots.value[i]!
            slots.value[i] =
              s.count > 1
                ? { item: s.item, count: s.count - 1 }
                : { item: null, count: 0 }
          }
          return
        }
      }
    } else {
      const gridItems = grid
        .map((item, i) => ({ item, i }))
        .filter((x) => x.item !== null)
      if (gridItems.length !== recipe.ingredients.length) continue
      const remaining = [...recipe.ingredients]
      const matched = gridItems.every(({ item }) => {
        const idx = remaining.indexOf(item!)
        if (idx === -1) return false
        remaining.splice(idx, 1)
        return true
      })
      if (!matched) continue
      const toConsume = [...recipe.ingredients]
      for (let i = 0; i < 9; i++) {
        const item = grid[i]
        if (!item) continue
        const idx = toConsume.indexOf(item)
        if (idx === -1) continue
        toConsume.splice(idx, 1)
        const s = slots.value[i]!
        slots.value[i] =
          s.count > 1
            ? { item: s.item, count: s.count - 1 }
            : { item: null, count: 0 }
      }
      return
    }
  }
}

const handleResultMouseDown = (event: MouseEvent) => {
  if (props.isProcessing) return
  event.preventDefault()
  if (event.button !== 0) return
  if (!craftingOutput.value) return
  // Can only pick up if hand is empty or holding the same item
  if (heldItem.value && heldItem.value !== craftingOutput.value.id) return

  heldItem.value = craftingOutput.value.id
  heldCount.value += craftingOutput.value.count
  consumeCraft()
}

const submit = () => {
  if (props.isProcessing) return
  if (
    heldItem.value === props.desiredItem ||
    slots.value.some((slot) => slot.item === props.desiredItem)
  )
    emit('correct')
  else emit('incorrect')
  reset()
}

const reset = () => {
  slots.value = makeSlots()
  initHotbar()
  heldItem.value = null
  heldCount.value = 0
  dragSlots.value = []
  dragSlotOrigCounts.value = []
  dragStartSlot.value = null
}

// Cursor tracking
const cursorX = ref(0)
const cursorY = ref(0)
const handleMouseMove = (event: MouseEvent) => {
  cursorX.value = event.clientX
  cursorY.value = event.clientY
}

// Show cursor if holding items, or during left-drag while redistribution is still in progress
const showHeldCursor = computed(
  () =>
    !!heldItem.value &&
    (heldCount.value > 0 ||
      (isDragging.value &&
        !isRightClickDrag.value &&
        dragSlots.value.length < dragHeldTotal.value)),
)

defineExpose({ hasAnswer: true, submit, reset })

onMounted(() => {
  initHotbar()
  document.addEventListener('mouseup', handleGlobalMouseUp)
  document.addEventListener('mousemove', handleGlobalMouseMove)
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('mouseup', handleGlobalMouseUp)
  document.removeEventListener('mousemove', handleGlobalMouseMove)
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="crafting-captcha-container" @mousemove="handleMouseMove">
    <span
      class="mcui mcui-Inventory-border pixel-image"
      style="
        box-sizing: content-box;
        border-width: 8px;
        border-style: solid;
        border-radius: 0;
        background-clip: padding-box;
        width: 324px;
        height: 304px;
      "
    >
      <span
        style="
          display: block;
          color: #3f3f3f;
          font-family: Minecraft;
          font-size: 16px;
          text-align: left;
          margin-left: 44px;
          margin-top: -6px;
          overflow: hidden;
          text-overflow: ellipsis;
        "
      >
        Crafting
      </span>

      <!-- Crafting Grid 3x3 (slots 0-8) -->
      <span style="position: absolute; top: 24px; left: 50px">
        <span v-for="row in 3" :key="row" style="display: block">
          <span
            v-for="col in 3"
            :key="col"
            class="invslot"
            @contextmenu.prevent
            @mouseenter="handleSlotMouseEnter((row - 1) * 3 + (col - 1))"
            @mousedown="handleSlotMouseDown((row - 1) * 3 + (col - 1), $event)"
            @mouseup="handleSlotMouseUp((row - 1) * 3 + (col - 1), $event)"
          >
            <span
              v-if="slots[(row - 1) * 3 + (col - 1)]!.item"
              class="invslot-item"
            >
              <img
                :src="
                  itemLookup[slots[(row - 1) * 3 + (col - 1)]!.item!]?.imageUrl
                "
                :alt="itemLookup[slots[(row - 1) * 3 + (col - 1)]!.item!]?.name"
                class="item-img"
              />
            </span>
            <span
              v-if="slots[(row - 1) * 3 + (col - 1)]!.count > 1"
              class="invslot-stacksize"
            >
              {{ slots[(row - 1) * 3 + (col - 1)]!.count }}
            </span>
          </span>
        </span>
      </span>

      <!-- Arrow -->
      <span
        class="mcui-Inventory-Crafting_Table-arrow"
        style="
          position: absolute;
          top: 60px;
          left: 172px;
          width: 44px;
          height: 32px;
        "
      >
        <br />
      </span>

      <!-- Result slot -->
      <span
        class="invslot invslot-large"
        style="position: absolute; top: 52px; left: 230px"
        @contextmenu.prevent
        @mousedown="handleResultMouseDown"
      >
        <span v-if="craftingOutput" class="invslot-item">
          <img
            :src="itemLookup[craftingOutput.id]?.imageUrl"
            :alt="itemLookup[craftingOutput.id]?.name"
            class="item-img"
            style="width: 32px; height: 32px"
          />
        </span>
        <span
          v-if="craftingOutput && craftingOutput.count > 1"
          class="invslot-stacksize"
        >
          {{ craftingOutput.count }}
        </span>
      </span>

      <!-- Inventory label -->
      <span
        style="
          position: absolute;
          bottom: 159px;
          left: 8px;
          color: #3f3f3f;
          font-family: Minecraft;
          font-size: 16px;
        "
      >
        Inventory
      </span>

      <!-- Inventory storage rows 1-3 (slots 9-35) + hotbar row (slots 36-44) -->
      <span style="position: absolute; bottom: 6px; left: 6px">
        <span v-for="row in 3" :key="row" style="display: block">
          <span
            v-for="col in 9"
            :key="col"
            class="invslot"
            @contextmenu.prevent
            @mouseenter="handleSlotMouseEnter(9 + (row - 1) * 9 + (col - 1))"
            @mousedown="
              handleSlotMouseDown(9 + (row - 1) * 9 + (col - 1), $event)
            "
            @mouseup="handleSlotMouseUp(9 + (row - 1) * 9 + (col - 1), $event)"
          >
            <span
              v-if="slots[9 + (row - 1) * 9 + (col - 1)]!.item"
              class="invslot-item"
            >
              <img
                :src="
                  itemLookup[slots[9 + (row - 1) * 9 + (col - 1)]!.item!]
                    ?.imageUrl
                "
                :alt="
                  itemLookup[slots[9 + (row - 1) * 9 + (col - 1)]!.item!]?.name
                "
                class="item-img"
              />
            </span>
            <span
              v-if="slots[9 + (row - 1) * 9 + (col - 1)]!.count > 1"
              class="invslot-stacksize"
            >
              {{ slots[9 + (row - 1) * 9 + (col - 1)]!.count }}
            </span>
          </span>
        </span>

        <!-- Hotbar (slots 36-44) -->
        <span style="display: block; margin-top: 8px">
          <span
            v-for="col in 9"
            :key="col"
            class="invslot"
            @contextmenu.prevent
            @mouseenter="handleSlotMouseEnter(36 + (col - 1))"
            @mousedown="handleSlotMouseDown(36 + (col - 1), $event)"
            @mouseup="handleSlotMouseUp(36 + (col - 1), $event)"
          >
            <span v-if="slots[36 + (col - 1)]!.item" class="invslot-item">
              <img
                :src="itemLookup[slots[36 + (col - 1)]!.item!]?.imageUrl"
                :alt="itemLookup[slots[36 + (col - 1)]!.item!]?.name"
                class="item-img"
              />
            </span>
            <span
              v-if="slots[36 + (col - 1)]!.count > 1"
              class="invslot-stacksize"
            >
              {{ slots[36 + (col - 1)]!.count }}
            </span>
          </span>
        </span>
      </span>
    </span>

    <!-- Held item cursor (follows mouse) -->
    <div
      v-if="showHeldCursor && heldItem"
      class="held-item-cursor"
      :style="{
        pointerEvents: 'none',
        position: 'fixed',
        left: `${cursorX}px`,
        top: `${cursorY}px`,
        transform: 'translate(-16px, -16px)',
        zIndex: 10000,
      }"
    >
      <span class="invslot" style="background: transparent; border: none">
        <span class="invslot-item">
          <img
            :src="itemLookup[heldItem]?.imageUrl"
            :alt="itemLookup[heldItem]?.name"
            class="item-img"
          />
        </span>
        <span v-if="heldCount > 1" class="invslot-stacksize">{{
          heldCount
        }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.crafting-captcha-container {
  user-select: none;
  display: flex;
  height: 100%;
  flex-direction: column;
  gap: 24px;
  padding: 16px;
  flex: 1;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-secondary);
}

.pixel-image {
  image-rendering: pixelated;
}

.invslot {
  position: relative;
  display: inline-block;
  background: #8b8b8b no-repeat center center / 32px 32px;
  border: 2px solid;
  border-color: #373737 #fff #fff #373737;
  width: 32px;
  height: 32px;
  font-size: 16px;
  line-height: 1;
  text-align: left;
  vertical-align: bottom;
}

.invslot::before,
.invslot::after {
  content: '';
  position: absolute;
  background-color: #8b8b8b;
  height: 2px;
  width: 2px;
  pointer-events: none;
}

.invslot::before {
  bottom: -2px;
  left: -2px;
}

.invslot::after {
  top: -2px;
  right: -2px;
}

.invslot-large {
  padding: 8px;
}

.invslot:hover {
  background-color: #c5c5c5;
}

.invslot-item,
.invslot-item a:first-child {
  position: relative;
  display: block;
  margin: -2px;
  padding: 2px;
  width: 32px;
  height: 32px;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.invslot-stacksize {
  position: absolute;
  right: 0;
  bottom: 0;
  font-family: Minecraft, sans-serif !important;
  font-weight: normal !important;
  color: #fff !important;
  text-shadow: 2px 2px 0 #3f3f3f;
  filter: dropshadow(color=#3F3F3F, offx=2, offy=2);
  z-index: 2;
}

.invslot-plain {
  background-color: transparent;
  border: 0;
}

.invslot-plain::before,
.invslot-plain::after {
  content: none;
}

.invslot-plain > .invslot-item,
.invslot-plain > .invslot-item a:first-child {
  margin: 0;
  padding: 0;
}

.held-item-cursor {
  pointer-events: none;
  user-select: none;
}

.item-img {
  width: 32px;
  height: 32px;
  image-rendering: pixelated;
  display: block;
}

.held-item-cursor .invslot::before,
.held-item-cursor .invslot::after {
  content: none;
}

.mcui * {
  box-sizing: content-box;
}

.mcui {
  display: inline-block;
  position: relative;
  background-color: #c6c6c6;
  border: 2px solid;
  border-color: #dbdbdb #5b5b5b #5b5b5b #dbdbdb;
  padding: 6px;
  text-align: left;
  white-space: nowrap;
  vertical-align: bottom;
}

.mcui-Inventory-Crafting_Table-arrow {
  background-image: url(https://minecraft.wiki/images/Grid_layout_Furnace_Progress_%28in-active%29.png?4f3f7);
}

.mcui-Inventory-border {
  -webkit-border-image: url(https://minecraft.wiki/images/Inventory_background.png?7c912)
    4 fill repeat;
  -moz-border-image: url(https://minecraft.wiki/images/Inventory_background.png?7c912)
    4 fill repeat;
  -o-border-image: url(https://minecraft.wiki/images/Inventory_background.png?7c912)
    4 fill repeat;
  border-image: url(https://minecraft.wiki/images/Inventory_background.png?7c912)
    4 fill repeat;
}
</style>
