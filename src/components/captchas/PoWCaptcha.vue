<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  isProcessing: boolean
  challengeText: string
  difficulty: number
}>()

const emit = defineEmits<{
  correct: []
  incorrect: []
}>()

const nonce = ref(0)
const hash = ref('')
const isHashing = ref(false)

const targetPrefix = computed(() => '0'.repeat(Math.max(1, props.difficulty)))

const hasAnswer = computed(() => hash.value.length > 0)
const isValid = computed(() => hash.value.startsWith(targetPrefix.value))

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

let hashComputationToken = 0

async function updateHash() {
  const token = ++hashComputationToken
  isHashing.value = true
  const input = `${props.challengeText}:${nonce.value}`
  const nextHash = await sha256Hex(input)

  if (token !== hashComputationToken) return

  hash.value = nextHash
  isHashing.value = false
}

watch(
  [() => props.challengeText, nonce],
  () => {
    updateHash()
  },
  { immediate: true },
)

const clampNonce = (value: number) => {
  // Keep nonce in a safe integer range for predictable user interactions.
  return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.trunc(value)))
}

const stepNonce = (delta: number) => {
  if (props.isProcessing) return
  nonce.value = clampNonce(nonce.value + delta)
}

const randomizeNonce = () => {
  if (props.isProcessing) return
  nonce.value = Math.floor(Math.random() * 1_000_000)
}

const submit = () => {
  if (props.isProcessing || isHashing.value || !hasAnswer.value) return

  if (isValid.value) {
    emit('correct')
  } else {
    emit('incorrect')
  }
}

const reset = () => {
  nonce.value = 0
}

defineExpose({
  hasAnswer,
  submit,
  reset,
})
</script>

<template>
  <div class="pow-captcha">
    <div class="pow-explainer">
      Nowadays, some CAPTCHAS, namely
      <a
        href="https://www.cloudflare.com/application-services/products/turnstile/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Cloudflare Turnstile
      </a>
      (which this very wiki uses) and
      <a
        href="https://anubis.techaro.lol/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Anubis
      </a>
      do not require any user interaction. Instead, they run a Proof of Work
      challenge to verify that whoever is interacting with the site is using a
      legitimate web browser. The browser will be asked to solve
      <a
        href="https://en.wikipedia.org/wiki/Cryptographic_hash_function"
        target="_blank"
        ref="noopener noreferrer"
      >
        a computational puzzle that's hard to solve but easy to verify that the
        solution is correct</a
      >. This is what we will be simulating here.<br /><br />
      You are given a challenge string, and you must find a nonce where the
      <a
        href="https://en.wikipedia.org/wiki/SHA-2"
        target="_blank"
        rel="noopener noreferrer"
      >
        SHA-256 hash
      </a>
      starts with
      <code>{{ targetPrefix }}</code
      >. You can do this by incrementing the nonce one by one, or you can
      randomize it to try your luck. Once you find a valid nonce, click the
      Verify button to submit your solution.
    </div>

    <div class="pow-controls">
      <button
        class="nonce-button"
        @click="stepNonce(-1)"
        :disabled="isProcessing || nonce <= 0"
      >
        -1
      </button>
      <input
        class="nonce-input"
        type="number"
        min="0"
        step="1"
        :disabled="isProcessing"
        v-model.number="nonce"
      />
      <button
        class="nonce-button"
        @click="stepNonce(1)"
        :disabled="isProcessing"
      >
        +1
      </button>
      <button
        class="nonce-button random"
        @click="randomizeNonce"
        :disabled="isProcessing"
      >
        Random
      </button>
    </div>

    <div class="pow-hash-box" :class="{ success: isValid }">
      <div class="pow-hash-label">Hash</div>
      <code class="pow-hash-value">{{
        isHashing ? 'Calculating...' : hash
      }}</code>
    </div>

    <div class="pow-status" :class="{ success: isValid }">
      {{
        isValid
          ? 'Valid nonce found. Click Verify.'
          : `Need hash to start with ${targetPrefix}`
      }}
    </div>
  </div>
</template>

<style scoped>
.pow-captcha {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.pow-explainer {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-primary);
}

.pow-explainer a {
  color: var(--link-primary);
}

.pow-explainer code {
  background: rgba(0, 0, 0, 0.25);
  padding: 2px 6px;
}

.pow-controls {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 8px;
}

.nonce-button {
  border: 2px solid var(--border-primary);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 0;
}

.nonce-button.random {
  min-width: 90px;
}

.nonce-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nonce-input {
  border: 2px solid var(--border-primary);
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 8px;
  width: 100%;
  font-size: 14px;
}

.pow-hash-box {
  border: 2px solid var(--border-primary);
  background: var(--bg-tertiary);
  padding: 8px;
}

.pow-hash-box.success {
  border-color: var(--mc-core-green-4);
}

.pow-hash-label {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.pow-hash-value {
  display: block;
  font-size: 11px;
  line-height: 1.4;
  color: var(--text-primary);
  word-break: break-all;
}

.pow-status {
  font-size: 12px;
  color: var(--text-secondary);
}

.pow-status.success {
  color: var(--mc-core-green-4);
  font-weight: 600;
}

@media (max-width: 520px) {
  .pow-controls {
    grid-template-columns: auto 1fr auto;
  }

  .nonce-button.random {
    grid-column: 1 / -1;
  }
}
</style>
