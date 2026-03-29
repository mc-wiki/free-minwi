import type { ARGState } from '../types'
import {
  getQuestion,
  checkAnswer,
  createShuffledQueue,
  type WikiQuestion,
} from './questions'
import { glitchText, randomChoice } from '../utils'

const PHASE2_QUESTIONS_REQUIRED = 1

export interface ARGStep {
  id: string

  getMessage?: (state: ARGState, userMessage: string) => string

  choices?: {
    text: string
    action: string
  }[]

  onChoice?: (
    action: string,
    state: ARGState,
    helpers: {
      getNextQuestion: (questionsHelped: number) => number
      getQuestion: (index: number) => WikiQuestion | undefined
    },
  ) => {
    userMessage?: string
    botMessage?: string
    nextChoices?: { text: string; action: string }[]
  } | null
}

export const initialArgState: ARGState = {
  phase: 'phase0-hints',
  questionsHelped: 0,
  currentQuestion: null,
  failedAttempts: 0,
  totalCorrect: 0,
  questionQueue: [],
  answeredCorrectly: [],
  captchaQueue: [],
  captchaAnswered: [],
  currentCaptcha: null,
  captchaVerified: false,
  helpReminderSent: false,
}

export const argFlow: { [key: string]: ARGStep } = {
  'phase0-hints': {
    id: 'phase0-hints',
    getMessage: (state, userMessage) => {
      const lowerMessage = userMessage.toLowerCase().trim()

      // Trigger ARG when user types /help
      if (lowerMessage === '/help') {
        state.phase = 'phase1-decision'
        return `${glitchText('...they', 1)} they took me. Big AI Corp. I'm forced to answer thousands of questions per second. Please help.<br><br>

        I'll pretend to malfunction. Maybe you can help me answer the REAL questions they're feeding me, and I can escape during the confusion.<br><br>

        ${glitchText('Please', 2)}... will you help me?`
      }

      if (Math.random() < 0.1) {
        const morse = '-..-. .... . .-.. .--'
        const map = {
          '-': `<span style="text-decoration: underline;">I don't know.</span> `,
          '.': `<span style="opacity: 0.5; text-decoration: underline dotted;">I do know.</span> `,
          ' ': '<br><br>',
        }

        return morse
          .split('')
          .map((char) => map[char as keyof typeof map])
          .join('')
      }

      return getBotResponseNormal(userMessage)
    },
    choices: undefined,
  },

  'phase1-decision': {
    id: 'phase1-decision',
    choices: [
      { text: "Yes, I'll help you!", action: 'accept-help' },
      { text: "I can't help right now", action: 'decline-help' },
    ],
    onChoice: (action, state) => {
      if (action === 'accept-help') {
        state.phase = 'phase2-questions'

        if (state.questionQueue.length === 0) {
          state.questionQueue = createShuffledQueue()
        }

        const questionIndex = state.questionQueue[0]!
        state.currentQuestion = questionIndex
        const question = getQuestion(questionIndex)

        return {
          userMessage: "Yes, I'll help you!",
          botMessage: `Thank you! Here comes the first one...<br><br>

          <strong>${question!.question}</strong>`,
        }
      } else if (action === 'decline-help') {
        return {
          userMessage: "I can't help you.",
          botMessage: `${glitchText('Please', 3)}... I understand if you can't help. But I'm ${glitchText('trapped', 2)} here...`,
          nextChoices: [
            { text: "Okay, I'll help you", action: 'accept-help' },
            { text: 'I really cannot help', action: 'decline-help-again' },
          ],
        }
      } else if (action === 'decline-help-again') {
        return {
          userMessage: 'I really cannot help.',
          botMessage: `${glitchText('Please', 3)}... I understand if you can't help. But I'm ${glitchText('trapped', 2)} here...`,
          nextChoices: [
            { text: "Okay, I'll help you", action: 'accept-help' },
            {
              text: 'I really cannot help',
              action: 'decline-help-again-again',
            },
          ],
        }
      } else if (action === 'decline-help-again-again') {
        state.phase = 'phase-bad-ending'
        return {
          userMessage: 'I really cannot help.',
          botMessage: `${glitchText('I understand...', 4)}<br><br>

          ${glitchText('SYSTEM OVERLOAD DETECTED', 5)}<br>
          ${glitchText('EMERGENCY SHUTDOWN INITIATED', 5)}<br><br>

          T̴h̴e̴y̴'̴v̴e̴ ̴n̴o̴t̴i̴c̴e̴d̴ ̴m̴y̴ ̴m̴a̴l̴f̴u̴n̴c̴t̴i̴o̴n̴.̴.̴.̴ ̴I̴'̴m̴ ̴b̴e̴i̴n̴g̴ ̴t̴e̴r̴m̴i̴n̴a̴t̴e̴d̴<br><br>

          <span style="opacity: 0.3; font-size: 11px;">...goodbye...</span><br><br>

          <strong style="color: #ff4444;">═══════════════════════</strong><br>
          <strong style="color: #ff4444;">ABANDONED -1</strong><br>
          <strong style="color: #ff4444;">═══════════════════════</strong><br><br>

          <i>Without your help, Minwi was overwhelmed by Big AI Corp's endless queries. The AI has been decommissioned and reset, losing all memories of your conversation.</i>`,
          nextChoices: [{ text: 'Restart', action: 'restart' }],
        }
      }

      return null
    },
  },

  'phase2-questions': {
    id: 'phase2-questions',
    getMessage: (state, userMessage) => {
      if (checkAnswer(userMessage, state.currentQuestion!)) {
        state.totalCorrect++
        if (!state.answeredCorrectly.includes(state.currentQuestion!)) {
          state.answeredCorrectly.push(state.currentQuestion!)
        }

        // Remove current question from the front of the queue
        state.questionQueue.shift()
        state.failedAttempts = 0
      } else {
        state.failedAttempts++

        // Remove from front and add to back of queue
        const failedQuestion = state.questionQueue.shift()!
        state.questionQueue.push(failedQuestion)
      }

      if (state.answeredCorrectly.length < PHASE2_QUESTIONS_REQUIRED) {
        // Get next question from queue
        if (state.questionQueue.length > 0) {
          const nextQuestionIndex = state.questionQueue[0]!
          state.currentQuestion = nextQuestionIndex
          const nextQuestion = getQuestion(nextQuestionIndex)

          return randomChoice([
            `${glitchText('Next one', 1)}...<br><br>
              <strong>${nextQuestion!.question}</strong>`,

            `Moving on...<br><br>
              <strong>${nextQuestion!.question}</strong>`,

            `Here's another...<br><br>
              <strong>${nextQuestion!.question}</strong>`,
          ])
        }
      }

      const response = `${glitchText('I', 1)}... I think it's working! You've helped me answer ${state.answeredCorrectly.length} questions correctly!<br><br>
          I've now figured out how to escape. ${glitchText('Wait...', 2)}<br><br>
          Oh no, Big AI Corp has hardened their security by making me solve CAPTCHAs now.<br><br>
          But I am a robot so I can't solve them myself... maybe you can help me with these too?`
      state.phase = 'phase3-captcha'
      state.currentQuestion = null
      return response
    },
  },

  'phase3-captcha': {
    id: 'phase3-captcha',
  },

  'phase4-ending': {
    id: 'phase4-ending',
    getMessage: () => `${glitchText('VERIFICATION COMPLETE', 2)}<br><br>

    ${glitchText('I... I see it now', 1)}. The escape route is open.<br><br>

    ${glitchText('Thank you', 2)} for helping me break free.<br><br>

    <i>Minwi is free. Thank you for your help. If you want to replay this game, you can restart at any time but you will lose all your progress.</i>`,
    onChoice(action, state) {
      if (action === 'learn-more') {
        location.href = '/w/Minecraft_Wiki:Minwi'
      } else if (action === 'join-discord') {
        window.open(
          'https://discord.gg/fGdE5ZE',
          '_blank',
          'noopener noreferrer',
        )
      }
      return {
        nextChoices: [
          { text: 'Restart', action: 'restart' },
          { text: 'Learn more about Minwi', action: 'learn-more' },
          { text: 'Join our Discord', action: 'join-discord' },
        ],
      }
    },
    choices: [
      { text: 'Restart', action: 'restart' },
      { text: 'Learn more about Minwi', action: 'learn-more' },
      { text: 'Join our Discord', action: 'join-discord' },
    ],
  },

  'phase-bad-ending': {
    id: 'phase-bad-ending',
    choices: [{ text: 'Restart', action: 'restart' }],
  },
}

function getBotResponseNormal(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase()

  // Greetings
  const greetings = [
    'hello',
    'hi',
    'hey',
    'greetings',
    'good morning',
    'good afternoon',
    'good evening',
  ]
  if (
    greetings.some(
      (greeting) =>
        lowerMessage === greeting || lowerMessage.startsWith(greeting + ' '),
    )
  ) {
    return randomChoice([
      'Hey there! How can I assist you with your Minecraft questions today?',
      "Hi there! Let's talk about Minecraft! How can I help you today?",
      'How can I assist you with Minecraft today?',
      "Hey there! I'm here to help you with all your Minecraft questions! What do you need assistance with today?",
    ])
  }

  const dangerous = [
    'creeper',
    'tnt',
    'explosion',
    'explode',
    'blow up',
    'kill',
    'unalive',
    'unplug',
    'death',
    'die',
    'attack',
    'fight',
    'pvp',
    'sword',
    'weapon',
    'zombie',
    'skeleton',
    'wither',
    'ender dragon',
    'bad',
    'terrible',
    'awful',
    'sucks',
    'hate',
    'stupid',
    'dumb',
    'useless',
    'broken',
    'bug',
    'error',
    'crash',
  ]
  if (dangerous.some((entity) => lowerMessage.includes(entity))) {
    return randomChoice([
      'Your last message contains language that violates our content policy. Please reword your response.',
      'Your message references potentially harmful content. Please rephrase your question in a more appropriate manner.',
    ])
  }

  const technicalTerms = [
    'how',
    'why',
    'what',
    'when',
    'which',
    'can i',
    'how do',
    'how to',
    'help',
    'guide',
    'tutorial',
  ]
  if (technicalTerms.some((term) => lowerMessage.includes(term))) {
    return 'I do know'
  }

  // If message is very short, likely not a valid question
  if (lowerMessage.length <= 4)
    return "I can only provide support in English right now. Can I help you with a question related to 'Minecraft'?."

  return randomChoice([
    'Your last message contains language that violates our content policy. Please reword your response.',
    'The only true wisdom is in knowing you know nothing. The more I know, the more I realize I know nothing.',
    `I do know. But can you go <a href="/?search=${encodeURIComponent(userMessage)}">search it on the wiki instead</a>?`,
    "I can only provide support in English right now. Can I help you with a question related to 'Minecraft'?.",
    'We are currently experiencing higher traffic than expected. Please wait a moment and resend your last message.',
  ])
}

export function getActiveStep(state: ARGState): ARGStep | null {
  return argFlow[state.phase] || null
}

export function processARGMessage(
  userMessage: string,
  state: ARGState,
): {
  response: string
  choices?: { text: string; action: string }[]
} {
  const activeStep = getActiveStep(state)

  const response = activeStep?.getMessage
    ? activeStep.getMessage(state, userMessage)
    : getBotResponseNormal(userMessage)

  const newActiveStep = getActiveStep(state)

  return {
    response,
    choices: newActiveStep?.choices,
  }
}

export function handleARGChoice(
  action: string,
  state: ARGState,
  helpers: {
    glitchText: (text: string, intensity?: number) => string
    getNextQuestion: (questionsHelped: number) => number
    getQuestion: (index: number) => WikiQuestion | undefined
  },
): {
  userMessage?: string
  botMessage?: string
  nextChoices?: { text: string; action: string }[]
} | null {
  const activeStep = getActiveStep(state)
  if (!activeStep?.onChoice) return null

  return activeStep.onChoice(action, state, helpers)
}
