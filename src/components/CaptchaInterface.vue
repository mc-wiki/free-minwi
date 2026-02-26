<script setup lang="ts">
import { computed, ref } from 'vue'
import GridCaptcha from './captchas/GridCaptcha.vue'
import CraftingCaptcha from './captchas/CraftingCaptcha.vue'
import Icon from './Icon.vue'
import type { ARGState } from '../types'
import { getCaptcha } from '../gameflow/captchas'

const props = defineProps<{
  argState: ARGState
  isProcessing: boolean
  showInterface?: boolean
}>()

const emit = defineEmits<{
  handleCaptchaVerify: []
  captchaCorrect: []
  captchaIncorrect: []
}>()

const currentCaptcha = computed(() => {
  if (props.argState.currentCaptcha === null) return null
  return getCaptcha(props.argState.currentCaptcha)
})

const answerValidator = computed(() => {
  return currentCaptcha.value?.answer ?? null
})

const gridCaptchaRef = ref<InstanceType<typeof GridCaptcha> | null>(null)
const craftingCaptchaRef = ref<InstanceType<typeof CraftingCaptcha> | null>(
  null,
)

// Check if current captcha has valid input
const hasValidInput = computed(() => {
  if (currentCaptcha.value?.type === 'grid') {
    return gridCaptchaRef.value?.hasSelection ?? false
  } else if (currentCaptcha.value?.type === 'crafting') {
    return craftingCaptchaRef.value?.hasAnswer ?? false
  }
  return false
})

// Handle reset button
const handleReset = () => {
  if (currentCaptcha.value?.type === 'grid') {
    gridCaptchaRef.value?.reset()
  } else if (currentCaptcha.value?.type === 'crafting') {
    craftingCaptchaRef.value?.reset()
  }
}

// Handle submit button
const handleSubmit = () => {
  if (props.isProcessing || !hasValidInput.value) return

  if (currentCaptcha.value?.type === 'grid') {
    gridCaptchaRef.value?.submit()
  } else if (currentCaptcha.value?.type === 'crafting') {
    craftingCaptchaRef.value?.submit()
  }
}
</script>

<template>
  <div
    v-show="showInterface !== false && !argState.captchaVerified"
    class="captcha-button-container"
  >
    <div class="captcha-button-box" @click="emit('handleCaptchaVerify')">
      <button class="captcha-button-checkbox" :disabled="isProcessing">
        <span class="checkbox-checkmark" v-if="isProcessing">✓</span>
      </button>
      <label class="captcha-button-label">I'm not a robot</label>
      <div class="captcha-button-logo">
        <div class="captcha-button-logo-text">reCAPTCHA</div>
        <a
          class="captcha-button-logo-subtext"
          href="https://youtu.be/41O_MydqxTU?t=23"
          >Privacy - Terms</a
        >
      </div>
    </div>
  </div>

  <div
    v-show="showInterface !== false && argState.captchaVerified"
    class="challenge-container"
  >
    <div class="captcha-prompt">
      <div v-html="currentCaptcha?.prompt"></div>
      <div
        v-if="currentCaptcha?.promptType"
        class="captcha-prompt-type"
        v-html="currentCaptcha.promptType"
      ></div>
    </div>

    <GridCaptcha
      v-if="currentCaptcha?.type === 'grid'"
      ref="gridCaptchaRef"
      :isProcessing="isProcessing"
      :answerValidator="answerValidator"
      :gridConfig="currentCaptcha?.gridConfig"
      @correct="emit('captchaCorrect')"
      @incorrect="emit('captchaIncorrect')"
    />

    <CraftingCaptcha
      v-else-if="currentCaptcha?.type === 'crafting'"
      ref="craftingCaptchaRef"
      :isProcessing="isProcessing"
      :inventory="currentCaptcha.inventory!"
      :desiredItem="currentCaptcha.desiredItem!"
      @correct="emit('captchaCorrect')"
      @incorrect="emit('captchaIncorrect')"
    />

    <div class="captcha-bottom-container">
      <button
        class="reset-button"
        aria-label="Reset"
        @click="handleReset"
        :disabled="isProcessing"
      >
        <Icon name="reload" />
      </button>

      <button
        class="captcha-submit-button"
        :disabled="isProcessing || !hasValidInput"
        @click="handleSubmit"
      >
        Verify
      </button>
    </div>
  </div>
</template>

<style scoped>
/* CAPTCHA Interface Styles */
.captcha-button-container {
  background-color: var(--bg-secondary);
  padding: 32px 16px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.captcha-button-box {
  background-color: var(--bg-tertiary);
  border: 3px solid var(--border-primary);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 300px;
  box-shadow: 4px 4px 0 var(--shadow-light);
}

.captcha-button-checkbox {
  width: 40px;
  height: 40px;
  background-color: var(--bg-secondary);
  border: 3px solid var(--border-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--mc-core-green-5);
  transition: all 0.2s;
  border-radius: 0;
}

.captcha-button-checkbox:hover {
  background-color: var(--bg-tertiary);
  border-color: var(--border-close);
}

.captcha-button-checkbox:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.checkbox-checkmark {
  animation: checkmark-appear 0.3s ease;
}

@keyframes checkmark-appear {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

.captcha-button-label {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  user-select: none;
}

.captcha-button-logo {
  margin-left: auto;
  text-align: right;
}

.captcha-button-logo-text {
  font-size: 10px;
  font-weight: bold;
  color: var(--text-secondary);
}

.captcha-button-logo-subtext {
  font-size: 8px;
  color: var(--text-muted);
}

/* Challenge Container */
.challenge-container {
  background-color: var(--bg-secondary);
  width: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 8px;
  box-sizing: border-box;
}

/* Prompt Styles */
.captcha-prompt {
  padding: 16px;
  font-size: 16px;
  color: var(--mc-core-white);
  background-color: var(--button-bg);
  font-weight: 500;
}

.captcha-prompt-type {
  font-size: 28px;
  font-weight: bold;
}

/* Bottom Container with Buttons */
.captcha-bottom-container {
  display: flex;
  gap: 12px;
  padding: 0 16px 16px 16px;
  align-items: center;
}

.reset-button {
  background: transparent;
  border: 2px solid var(--border-primary);
  color: var(--text-primary);
  cursor: pointer;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0;
  transition: all 0.1s;
}

.reset-button:hover:not(:disabled) {
  background-color: var(--bg-tertiary);
  border-color: var(--border-close);
}

.reset-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.captcha-submit-button {
  margin-left: auto;
  background-color: var(--button-bg);
  color: var(--mc-core-white);
  border: 3px solid var(--button-border);
  padding: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 0;
  box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.3);
  transition: all 0.1s;
}

.captcha-submit-button:hover:not(:disabled) {
  background-color: var(--button-hover-bg);
  transform: translate(1px, 1px);
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
}

.captcha-submit-button:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.3);
}

.captcha-submit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
