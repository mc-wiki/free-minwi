<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

export interface GridConfig {
  targetItem: string
  targetCount: number
  fillItem?: string
  randomize: boolean
}

const props = defineProps<{
  isProcessing: boolean
  gridConfig?: GridConfig
}>()

const emit = defineEmits<{
  correct: []
  incorrect: []
}>()

const selectedSquares = ref<Set<number>>(new Set())

const gridContent = ref<(string | number)[]>(
  Array(9)
    .fill(0)
    .map((_, i) => i + 1),
)

const correctPositions = ref<Set<number>>(new Set())

const generateGrid = () => {
  if (!props.gridConfig?.randomize) {
    gridContent.value = Array(9)
      .fill(0)
      .map((_, i) => i + 1)
    return
  }

  const positions = [0, 1, 2, 3, 4, 5, 6, 7, 8]
  const targetCount = props.gridConfig.targetCount

  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[positions[i], positions[j]] = [positions[j]!, positions[i]!]
  }

  const targetPositions = positions.slice(0, targetCount)
  correctPositions.value = new Set(targetPositions)

  gridContent.value = Array(9)
    .fill(0)
    .map((_, pos) => {
      if (correctPositions.value.has(pos)) {
        return props.gridConfig!.targetItem
      } else {
        return props.gridConfig!.fillItem || pos + 1
      }
    })
}

onMounted(() => {
  generateGrid()
})

const toggleSquare = (index: number) => {
  if (props.isProcessing) return

  if (selectedSquares.value.has(index)) {
    selectedSquares.value.delete(index)
  } else {
    selectedSquares.value.add(index)
  }
}

const isSelected = (index: number) => {
  return selectedSquares.value.has(index)
}

const hasSelection = computed(() => selectedSquares.value.size > 0)

const submit = () => {
  if (props.isProcessing || selectedSquares.value.size === 0) return

  let isCorrect = false

  if (props.gridConfig?.randomize) {
    const selected = Array.from(selectedSquares.value).sort()
    const correct = Array.from(correctPositions.value).sort()
    isCorrect =
      selected.length === correct.length &&
      selected.every((val, idx) => val === correct[idx])
  } else {
    const selectedItems = Array.from(selectedSquares.value).map(
      (i) => gridContent.value[i],
    )
    isCorrect = selectedItems.every(
      (item) => item === props.gridConfig?.targetItem,
    )
  }

  if (isCorrect) {
    emit('correct')
  } else {
    emit('incorrect')
  }

  selectedSquares.value.clear()
}

const reset = () => {
  selectedSquares.value.clear()
  if (props.gridConfig?.randomize) {
    generateGrid()
  }
}

defineExpose({
  hasSelection,
  submit,
  reset,
})
</script>

<template>
  <div class="captcha-grid">
    <button
      v-for="(content, index) in gridContent"
      :key="index"
      class="grid-square"
      :class="{ selected: isSelected(index) }"
      @click="toggleSquare(index)"
      :disabled="isProcessing"
    >
      <div class="square-content">
        <div class="square-placeholder">
          <span>{{ content }}</span>
        </div>
      </div>
      <div v-if="isSelected(index)" class="selection-overlay">
        <span class="checkmark">✓</span>
      </div>
    </button>
  </div>
</template>

<style scoped>
.captcha-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  flex: 1;
  height: 100%;
  aspect-ratio: 1;
  margin: 0 auto;
  padding: 0 16px;
  box-sizing: border-box;
  align-content: center;
  overflow: hidden;
}

.grid-square {
  position: relative;
  aspect-ratio: 1;
  background-color: var(--bg-secondary);
  border: 3px solid var(--border-primary);
  cursor: pointer;
  padding: 0;
  transition: all 0.1s;
  overflow: hidden;
}

.grid-square:hover:not(:disabled) {
  border-color: var(--mc-core-green-4);
  transform: scale(1.02);
}

.grid-square:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.grid-square.selected {
  border-color: var(--mc-core-green-5);
  border-width: 4px;
}

.square-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.square-placeholder {
  font-size: clamp(24px, 5vw, 32px);
  user-select: none;
}

.selection-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(60, 133, 39, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.checkmark {
  font-size: clamp(24px, 5vw, 32px);
  color: var(--mc-core-white);
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}
</style>
