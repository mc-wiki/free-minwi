export function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

export function glitchText(text: string, intensity: number = 3): string {
  const zalgoChars = [
    '\u0336',
    '\u0337',
    '\u0338',
    '\u0334',
    '\u0335',
    '\u0353',
    '\u0354',
    '\u0355',
    '\u0356',
  ]
  let result = ''
  for (let i = 0; i < text.length; i++) {
    result += text[i]
    if (Math.random() < 0.3 && text[i] !== ' ') {
      for (let j = 0; j < intensity; j++) {
        if (Math.random() < 0.5) {
          result += randomChoice(zalgoChars)
        }
      }
    }
  }
  return result
}

// Parse HTML into streamable segments (for animation)
export function parseHTMLSegments(html: string): string[] {
  const segments: string[] = []
  let currentPos = 0
  let inTag = false
  let tagStart = -1

  for (let i = 0; i < html.length; i++) {
    if (html[i] === '<') {
      if (!inTag && currentPos < i) {
        segments.push(html.substring(currentPos, i))
      }
      inTag = true
      tagStart = i
    } else if (html[i] === '>' && inTag) {
      segments.push(html.substring(tagStart, i + 1))
      currentPos = i + 1
      inTag = false
      tagStart = -1
    } else if (!inTag) {
      if (currentPos !== i) {
        segments.push(html.substring(currentPos, i))
      }
      segments.push(html[i]!)
      currentPos = i + 1
    }
  }

  if (currentPos < html.length) {
    segments.push(html.substring(currentPos))
  }

  return segments.filter((s) => s.length > 0)
}
