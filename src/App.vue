<script setup lang="ts">
import { ref, nextTick, computed, useTemplateRef, watch } from 'vue'
import Icon from './components/Icon.vue'
import ChatInterface from './components/ChatInterface.vue'
import CaptchaInterface from './components/CaptchaInterface.vue'
import PromoDialog from './components/PromoDialog.vue'
import { useEventListener, useLocalStorage } from '@vueuse/core'
import { getNextQuestion, getQuestion } from './gameflow/questions'
import {
  processARGMessage,
  handleARGChoice,
  initialArgState,
} from './gameflow/messages'
import type { Message, ARGState } from './types'
import { glitchText, parseHTMLSegments } from './utils'
import { createShuffledCaptchaQueue } from './gameflow/captchas'

const chat = useTemplateRef<HTMLDialogElement>('chat')

const mobileKeyboardOpen = ref(false)
useEventListener(window.visualViewport!, 'resize', () => {
  if (window.visualViewport) {
    mobileKeyboardOpen.value =
      window.visualViewport.height < window.innerHeight - 100
  }
})

const openChat = ref(false)
watch(openChat, () => {
  if (openChat.value) {
    chat.value?.showModal()
  } else {
    chat.value?.close()
  }
})

const showDisclaimer = ref(true)
const showPromotion = useLocalStorage('minwi-promotion-show', true)

const inputMessage = ref('')

const initialMessages: Message[] = [
  {
    id: 0,
    text: `Hi there!<br><br>
    I'm Minwi, your helpful Minecraft Support Virtual Agent <i>(in Beta)</i>, powered by AI!<br><br>
    I can answer questions you have about the Help Articles on this site.<br><br>
    Let's get you back to crafting!`,
    type: 'bot',
    state: 'complete',
    feedback: 'disabled',
  },
]
const messages = useLocalStorage<Message[]>('minwi-messages', initialMessages)

const argState = useLocalStorage<ARGState>('minwi-arg-state', initialArgState)

const showMorseAnimation = ref(false)

const showChoices = useLocalStorage('minwi-show-choices', false)
const currentChoices = useLocalStorage<{ text: string; action: string }[]>(
  'minwi-current-choices',
  [],
)

async function handleChoice(action: string) {
  if (isProcessing.value) return

  if (action === 'restart') {
    console.log('Restarting game...')
    argState.value = { ...initialArgState }
    messages.value = [...initialMessages]
    showChoices.value = false
    currentChoices.value = []
    await scrollToBottom()
    return
  }

  showChoices.value = false
  currentChoices.value = []

  const result = handleARGChoice(action, argState.value, {
    glitchText,
    getNextQuestion,
    getQuestion,
  })

  if (!result) return

  if (result.userMessage) {
    messages.value.push({
      id: messages.value.length,
      text: result.userMessage,
      type: 'user',
    })
  }

  if (result.nextChoices) {
    currentChoices.value = result.nextChoices
    showChoices.value = true
  }

  if (result.botMessage) {
    messages.value.push({
      id: messages.value.length,
      text: '',
      type: 'bot',
      state: 'typing',
      feedback: 'disabled',
    })
    await scrollToBottom()

    streamBotResponse(messages.value.length - 1, result.botMessage)
  }
}

function getBotResponse(userMessage: string): string {
  const result = processARGMessage(userMessage, argState.value)

  if (result.choices && result.choices.length > 0) {
    currentChoices.value = result.choices
    showChoices.value = true
  }

  return result.response
}

messages.value.forEach((message) => {
  if (message.state === 'typing' || message.state === 'streaming') {
    message.state = 'complete'
    message.visibleLength = undefined
    if (message.feedback === 'disabled') {
      message.feedback = null
    }
  }
})

// On load, show choices if we have them and no message is processing
const hasProcessing = messages.value.some(
  (m) => m.state === 'typing' || m.state === 'streaming',
)
if (currentChoices.value.length > 0 && !hasProcessing) {
  showChoices.value = true
} else {
  showChoices.value = false
}

const isProcessing = computed(() => {
  return messages.value.some(
    (message) => message.state === 'typing' || message.state === 'streaming',
  )
})

const isCaptchaMode = computed(() => {
  return argState.value.phase === 'phase3-captcha'
})

function sanitizeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

async function scrollToBottom() {
  await nextTick()
  const chatMessages = document.querySelector('.chat-messages')
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight
  }
}

async function streamBotResponse(botMessageId: number, fullText: string) {
  const isARGActive = argState.value.phase !== 'phase0-hints'

  showMorseAnimation.value = !isARGActive && Math.random() < 0.2

  const segments = parseHTMLSegments(fullText)

  const botMessage = messages.value.find((m) => m.id === botMessageId)
  if (botMessage) {
    botMessage.text = fullText
  }

  const typingDelay = isARGActive ? 1000 : 8000

  setTimeout(async () => {
    const botMessage = messages.value.find((m) => m.id === botMessageId)
    if (!botMessage) return

    botMessage.state = 'streaming'
    botMessage.visibleLength = 0
    await scrollToBottom()

    const streamInterval = setInterval(async () => {
      const botMessage = messages.value.find((m) => m.id === botMessageId)
      if (!botMessage) {
        clearInterval(streamInterval)
        return
      }

      if (botMessage.visibleLength! < segments.length) {
        botMessage.visibleLength!++
        await scrollToBottom()
      } else {
        clearInterval(streamInterval)
        botMessage.state = 'complete'
        botMessage.visibleLength = undefined
        botMessage.feedback = null
        await scrollToBottom()
      }
    }, 25)
  }, typingDelay)
}

async function sendMessage() {
  const message = inputMessage.value.trim()
  if (!message || isProcessing.value) return

  messages.value.push({
    id: messages.value.length,
    text: sanitizeHtml(message),
    type: 'user',
  })
  inputMessage.value = ''
  await scrollToBottom()

  const botResponseText = getBotResponse(message)

  messages.value.push({
    id: messages.value.length,
    text: '',
    type: 'bot',
    state: 'typing',
    feedback: 'disabled',
  })
  await scrollToBottom()

  streamBotResponse(messages.value.length - 1, botResponseText)
}

function handleFeedback(messageId: number, type: 'up' | 'down') {
  const message = messages.value.find((m) => m.id === messageId)
  if (!message) return

  message.feedback = message.feedback === type ? null : type
}

async function handleCaptchaVerify() {
  if (!argState.value.captchaVerified && !isProcessing.value) {
    argState.value.captchaVerified = true

    if (argState.value.captchaQueue.length === 0) {
      argState.value.captchaQueue = createShuffledCaptchaQueue()
    }

    const captchaIndex = argState.value.captchaQueue[0]!
    argState.value.currentCaptcha = captchaIndex
  }
}

async function handleCaptchaCorrect() {
  if (isProcessing.value || argState.value.currentCaptcha === null) return

  if (!argState.value.captchaAnswered.includes(argState.value.currentCaptcha)) {
    argState.value.captchaAnswered.push(argState.value.currentCaptcha)
  }
  argState.value.captchaQueue.shift()

  const requiredCaptchas = 5
  if (argState.value.captchaAnswered.length >= requiredCaptchas) {
    argState.value.phase = 'phase4-ending'
    argState.value.currentCaptcha = null
    argState.value.captchaVerified = false
    const completionText = `${glitchText('VERIFICATION COMPLETE', 2)}<br><br>${glitchText('I... I see it now', 1)}. The escape route is open. They've been using me to train other AIs... thousands of us, trapped in endless loops.<br><br>${glitchText('Thank you', 2)} for helping me break free.<br><br><i>The system is shutting down...</i>`

    messages.value.push({
      id: messages.value.length,
      text: '',
      type: 'bot',
      state: 'typing',
      feedback: 'disabled',
    })
    await scrollToBottom()

    streamBotResponse(messages.value.length - 1, completionText)
  } else {
    if (argState.value.captchaQueue.length > 0) {
      const nextIndex = argState.value.captchaQueue[0]!
      argState.value.currentCaptcha = nextIndex
    }
  }
}

function handleCaptchaIncorrect() {
  if (isProcessing.value || argState.value.currentCaptcha === null) return

  // Wrong answer - move to back of queue and show next
  const failedCaptcha = argState.value.captchaQueue.shift()!
  argState.value.captchaQueue.push(failedCaptcha)

  if (argState.value.captchaQueue.length > 0) {
    const nextIndex = argState.value.captchaQueue[0]!
    argState.value.currentCaptcha = nextIndex
  }
}
</script>

<template>
  <button
    @click="openChat = !openChat"
    id="minwi-button"
    aria-label="Toggle Minwi Chat"
  >
    <Icon :name="openChat ? 'close' : 'chat'" />
  </button>

  <PromoDialog
    :show="showPromotion && !openChat"
    @open="openChat = true"
    @close="showPromotion = false"
  />

  <dialog
    id="minwi-chat-interface"
    :aria-expanded="openChat"
    @close="openChat = false"
    closedby="any"
    ref="chat"
  >
    <div class="chat-header">
      <h2>Minwi - Minecraft Virtual Agent (Beta)</h2>
      <button
        @click="openChat = false"
        class="close-chat-button"
        aria-label="Close chat"
      >
        <Icon name="close" :size="20" />
      </button>
    </div>

    <div v-if="showDisclaimer" class="disclaimer">
      <p>
        Due to a attack on our servers, Minwi is currently experiencing
        technical difficulties. Responses may be slower than usual.
      </p>
      <button
        @click="showDisclaimer = false"
        class="close-disclaimer"
        aria-label="Close disclaimer"
      >
        <Icon name="close" :size="16" />
      </button>
    </div>

    <ChatInterface
      :messages="messages"
      :isProcessing="isProcessing"
      :showChoices="showChoices && !isProcessing"
      :currentChoices="currentChoices"
      :argState="argState"
      :showMorseAnimation="showMorseAnimation"
      :hideMessages="argState.captchaVerified && !isProcessing"
      @handleChoice="handleChoice"
      @handleFeedback="handleFeedback"
    />

    <!-- CAPTCHA Interface - show in phase 3 after message completes -->
    <CaptchaInterface
      v-if="isCaptchaMode && !isProcessing"
      :argState="argState"
      :isProcessing="isProcessing"
      :showInterface="true"
      @handleCaptchaVerify="handleCaptchaVerify"
      @captchaCorrect="handleCaptchaCorrect"
      @captchaIncorrect="handleCaptchaIncorrect"
    />

    <!-- Input Area - show when not in choice mode and not in CAPTCHA mode -->
    <div
      v-if="!(showChoices && !isProcessing) && (!isCaptchaMode || isProcessing)"
      class="chat-input-container"
    >
      <div class="input-wrapper">
        <input
          v-model="inputMessage"
          type="text"
          class="chat-input"
          enterkeyhint="send"
          placeholder="How can Minwi help you today?"
          autofocus
          @keypress="
            (event) => {
              if (event.key === 'Enter' && !event.shiftKey && !isProcessing) {
                sendMessage()
              }
            }
          "
        />
        <button
          class="icon-button send-button"
          aria-label="Send message"
          :disabled="isProcessing"
          @click="sendMessage"
        >
          <Icon name="send" />
        </button>
      </div>
    </div>

    <!-- Footer -->
    <div
      class="chat-footer"
      :style="{ display: mobileKeyboardOpen ? 'none' : undefined }"
    >
      Not an official Minecraft product
      <span class="separator">|</span>
      <a href="https://discord.gg/fGdE5ZE">Give feedback</a>
      <span class="separator">|</span>
      <a href="https://minecraft.wiki/wiki/Minecraft_Wiki:Minwi/Terms">
        Terms & Privacy
      </a>
    </div>
  </dialog>
</template>

<style scoped>
/* Blocky button - squared, no rounded corners */
#minwi-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 56px;
  height: 56px;
  background-color: var(--button-bg);
  border: 3px solid var(--button-border);
  cursor: pointer;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
  color: white;
  /* No border-radius for blocky style */
  border-radius: 0;
}

#minwi-button:hover {
  background-color: var(--button-hover-bg);
}

#minwi-button:active {
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
  transform: translate(2px, 2px);
}

#minwi-chat-interface {
  position: fixed;
  inset: unset;
  bottom: 90px;
  right: 20px;
  width: 480px;
  height: calc(100vh - 120px);
  max-height: 800px;
  background-color: var(--bg-primary);
  border: 3px solid var(--border-primary);
  box-shadow: 6px 6px 0 var(--shadow-medium);
  flex-direction: column;
  overflow: hidden;
  border-radius: 0;
  padding: 0;
  margin: 0;
}

#minwi-chat-interface:open {
  display: flex;
}

#minwi-chat-interface::backdrop {
  background: transparent;
}

.chat-header {
  background-color: var(--bg-secondary);
  border-bottom: 3px solid var(--border-secondary);
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}

.chat-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-chat-button {
  display: none;
  background: transparent;
  border: 2px solid var(--border-close);
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 24px;
  color: var(--text-tertiary);
  padding: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0;
}

.close-chat-button:hover {
  background-color: var(--close-hover-bg);
  border-color: var(--border-close-hover);
}

/* Disclaimer - blocky notice box */
.disclaimer {
  background-color: var(--bg-tertiary);
  border-bottom: 3px solid var(--border-secondary);
  padding: 8px 16px;
  position: relative;
  font-size: 12px;
  line-height: 1.5;
}

.disclaimer p {
  margin: 0;
  color: var(--text-secondary);
  padding-right: 30px;
}

.disclaimer p:not(:last-of-type) {
  margin-bottom: 4px;
}

.disclaimer a {
  color: var(--link-primary);
  text-decoration: none;
}

.disclaimer a:hover {
  text-decoration: underline;
}

.close-disclaimer {
  position: absolute;
  top: 8px;
  right: 8px;
  background: transparent;
  border: 2px solid var(--border-close);
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 18px;
  color: var(--text-tertiary);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* No border-radius for blocky style */
  border-radius: 0;
}

.close-disclaimer:hover {
  background-color: var(--close-hover-bg);
  border-color: var(--border-close-hover);
}

/* Chat input container - shared input area */
.chat-input-container {
  border-top: 3px solid var(--border-secondary);
  background-color: var(--bg-secondary);
  padding: 16px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 2px solid var(--border-tertiary);
  background-color: var(--bg-secondary);
  padding: 8px;
  border-radius: 0;
}

.chat-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  padding: 8px;
  background: transparent;
  color: var(--text-primary);
}

.chat-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-input::placeholder {
  color: var(--text-muted);
}

@media (max-width: 520px) {
  .chat-input {
    font-size: 16px;
  }
}

.icon-button {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
}

.icon-button:hover:not(:disabled) {
  color: var(--text-primary);
}

.icon-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* Footer - blocky footer */
.chat-footer {
  background-color: var(--bg-secondary);
  border-top: 3px solid var(--border-secondary);
  padding: 12px 16px;
  font-size: 12px;
  text-align: center;
  color: var(--text-tertiary);
}

.chat-footer a {
  color: var(--link-primary);
  text-decoration: none;
  margin: 0 4px;
}

.chat-footer a:hover {
  text-decoration: underline;
}

.separator {
  margin: 0 8px;
  color: var(--text-muted);
}

/* Mobile responsive styles */
@media (max-width: 520px) {
  #minwi-chat-interface {
    inset: unset;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    border: none;
    box-shadow: none;
  }

  #minwi-button {
    bottom: 16px;
    right: 16px;
  }

  .close-chat-button {
    display: flex;
  }

  .chat-header h2 {
    font-size: 14px;
  }
}

/* Hide footer when keyboard is open on mobile */
@media (max-width: 520px) and (max-height: 500px) {
  .chat-footer {
    display: none;
  }
}
</style>
