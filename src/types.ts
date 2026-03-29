export interface Message {
  id: number
  text: string
  type: 'bot' | 'user'
  state?: 'typing' | 'streaming' | 'complete'
  feedback?: 'up' | 'down' | 'disabled' | null
  visibleLength?: number // Used for typing animation - how many characters/segments are visible
}

export interface ARGState {
  phase: string
  questionsHelped: number
  currentQuestion: number | null
  failedAttempts: number
  totalCorrect: number
  questionQueue: number[]
  answeredCorrectly: number[]
  captchaQueue: number[]
  captchaAnswered: number[]
  currentCaptcha: number | null
  captchaVerified: boolean
  helpReminderSent: boolean
}
