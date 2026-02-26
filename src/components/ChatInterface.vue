<script setup lang="ts">
import Icon from './Icon.vue'
import type { Message, ARGState } from '../types'
import { parseHTMLSegments } from '../utils'

const props = defineProps<{
  messages: Message[]
  isProcessing: boolean
  showChoices: boolean
  currentChoices: { text: string; action: string }[]
  argState: ARGState
  showMorseAnimation: boolean
  hideMessages?: boolean
}>()

const emit = defineEmits<{
  handleChoice: [action: string]
  handleFeedback: [messageId: number, type: 'up' | 'down']
}>()

function getVisibleText(message: Message): string {
  if (!message.text) return ''
  if (message.visibleLength === undefined) return message.text

  const segments = parseHTMLSegments(message.text)
  return segments.slice(0, message.visibleLength).join('')
}
</script>

<template>
  <div v-if="!hideMessages" class="chat-messages" role="log">
    <div
      v-for="message in messages"
      :key="message.id"
      class="message"
      :class="{
        'user-message': message.type === 'user',
        'bot-message': message.type === 'bot',
      }"
    >
      <template v-if="message.type === 'bot'">
        <!-- Typing indicator state -->
        <div
          v-if="message.state === 'typing'"
          class="typing-indicator"
          :class="{ 'morse-active': showMorseAnimation }"
        >
          <span></span>
          <span></span>
          <span></span>
        </div>
        <!-- Streaming state -->
        <div v-else-if="message.state === 'streaming'">
          <p class="streaming-text">
            <span v-html="getVisibleText(message)"></span
            ><span class="cursor">■</span>
          </p>
        </div>
        <!-- Complete state -->
        <div v-else>
          <p v-html="message.text"></p>
          <div v-if="message.feedback != 'disabled'" class="feedback-buttons">
            <button
              class="feedback-button"
              :class="{ active: message.feedback === 'up' }"
              @click="emit('handleFeedback', message.id, 'up')"
              aria-label="Thumbs up"
            >
              <Icon name="arrowUp" :size="16" />
            </button>
            <button
              class="feedback-button"
              :class="{ active: message.feedback === 'down' }"
              @click="emit('handleFeedback', message.id, 'down')"
              aria-label="Thumbs down"
            >
              <Icon name="arrowDown" :size="16" />
            </button>
          </div>
        </div>
      </template>
      <p v-else v-html="message.text"></p>
    </div>
  </div>

  <!-- Choice buttons (replaces input during ARG phases) -->
  <div v-if="showChoices" class="choice-buttons-container">
    <button
      v-for="choice in currentChoices"
      :key="choice.action"
      class="choice-button"
      :disabled="isProcessing"
      @click="emit('handleChoice', choice.action)"
    >
      {{ choice.text }}
    </button>
  </div>
</template>

<style scoped>
/* Chat messages - blocky message bubbles */
.chat-messages {
  contain: strict;
  contain-intrinsic-size: 1px 5000px;
  content-visibility: auto;
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: var(--bg-primary);
}

.message {
  display: flex;
}

.message:not(:last-child) {
  margin-bottom: 6px;
}

.user-message {
  justify-content: flex-end;
  max-width: 85%;
  margin-left: auto;
}

.bot-message {
  justify-content: flex-start;
  max-width: 85%;
}

.bot-message p {
  background-color: var(--msg-bot-bg);
  border: 2px solid var(--msg-bot-border);
  color: var(--msg-bot-text);
  padding: 12px 16px;
  margin: 0;
  margin-bottom: 8px;
  box-shadow: 3px 3px 0 var(--shadow-light);
  border-radius: 0;
}

.message:not(.bot-message) p {
  background-color: var(--msg-user-bg);
  color: var(--msg-user-text);
  border: 2px solid var(--msg-user-border);
  padding: 12px 16px;
  margin: 0;
  margin-bottom: 8px;
  box-shadow: 3px 3px 0 var(--shadow-light);
  border-radius: 0;
}

/* Typing indicator - blocky animation */
.bot-message .typing-indicator {
  background-color: var(--msg-bot-bg);
  border: 2px solid var(--msg-bot-border);
  padding: 12px 16px;
  box-shadow: 3px 3px 0 var(--shadow-light);
  border-radius: 0;
  display: flex;
  gap: 6px;
  align-items: center;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background-color: var(--typing-dot);
  display: inline-block;
  opacity: 1;
  animation: typing-bounce 1.4s ease-in-out infinite;
}

/* Stagger the bouncing animation */
.typing-indicator span:nth-child(1) {
  animation-delay: 0s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

/* Only animate with morse code when morse-active class is present */
.typing-indicator.morse-active span {
  animation: morse-code-help 8s steps(1, end) infinite;
}

.typing-indicator.morse-active span:nth-child(1),
.typing-indicator.morse-active span:nth-child(2),
.typing-indicator.morse-active span:nth-child(3) {
  animation-delay: 0s;
}

@keyframes typing-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-4px);
  }
}

/* Streaming text with cursor */
.bot-message .streaming-text {
  background-color: var(--msg-bot-bg);
  border: 2px solid var(--msg-bot-border);
  color: var(--msg-bot-text);
  padding: 12px 16px;
  margin: 0;
  margin-bottom: 8px;
  box-shadow: 3px 3px 0 var(--shadow-light);
  border-radius: 0;
  word-wrap: break-word;
}

.cursor {
  display: inline-block;
  animation: cursor-blink 1s infinite;
  margin-left: 2px;
}

@keyframes cursor-blink {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}

/* Morse code animation for "/HELP" = -..-. .... . .-.. .--. */
@keyframes morse-code-help {
  /* / = -..-. */
  0% {
    opacity: 1;
  } /* dash start */
  5% {
    opacity: 0;
  } /* dash end */
  6.67% {
    opacity: 1;
  } /* dot */
  8.33% {
    opacity: 0;
  }
  10% {
    opacity: 1;
  } /* dot */
  11.67% {
    opacity: 0;
  }
  13.33% {
    opacity: 1;
  } /* dash */
  18.33% {
    opacity: 0;
  }
  20% {
    opacity: 1;
  } /* dot */
  21.67% {
    opacity: 0;
  } /* char space */

  /* H = .... */
  26.67% {
    opacity: 1;
  } /* dot */
  28.33% {
    opacity: 0;
  }
  30% {
    opacity: 1;
  } /* dot */
  31.67% {
    opacity: 0;
  }
  33.33% {
    opacity: 1;
  } /* dot */
  35% {
    opacity: 0;
  }
  36.67% {
    opacity: 1;
  } /* dot */
  38.33% {
    opacity: 0;
  } /* char space */

  /* E = . */
  43.33% {
    opacity: 1;
  } /* dot */
  45% {
    opacity: 0;
  } /* char space */

  /* L = .-.. */
  50% {
    opacity: 1;
  } /* dot */
  51.67% {
    opacity: 0;
  }
  53.33% {
    opacity: 1;
  } /* dash */
  58.33% {
    opacity: 0;
  }
  60% {
    opacity: 1;
  } /* dot */
  61.67% {
    opacity: 0;
  }
  63.33% {
    opacity: 1;
  } /* dot */
  65% {
    opacity: 0;
  } /* char space */

  /* P = .--. */
  70% {
    opacity: 1;
  } /* dot */
  71.67% {
    opacity: 0;
  }
  73.33% {
    opacity: 1;
  } /* dash */
  78.33% {
    opacity: 0;
  }
  80% {
    opacity: 1;
  } /* dash */
  85% {
    opacity: 0;
  }
  86.67% {
    opacity: 1;
  } /* dot */
  88.33% {
    opacity: 0;
  } /* long pause before repeat */

  100% {
    opacity: 0;
  }
}

/* Choice Buttons Container - replaces input during ARG */
.choice-buttons-container {
  border-top: 3px solid var(--border-secondary);
  background-color: var(--bg-secondary);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.choice-button {
  background-color: var(--button-bg);
  color: var(--mc-core-white);
  border: 3px solid var(--button-border);
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 0;
  box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.3);
  transition: all 0.1s;
  text-align: center;
}

.choice-button:hover {
  background-color: var(--button-hover-bg);
  transform: translate(1px, 1px);
  box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
}

.choice-button:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.3);
}

.choice-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* Feedback buttons */
.feedback-buttons {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.feedback-button {
  background: transparent;
  border: 2px solid var(--border-tertiary);
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  border-radius: 0;
  transition: all 0.2s;
}

.feedback-button:hover {
  background-color: var(--bg-tertiary);
  border-color: var(--border-close);
}

.feedback-button.active {
  background-color: var(--mc-core-green-3);
  border-color: var(--mc-core-green-4);
  color: var(--mc-core-white);
}
</style>
