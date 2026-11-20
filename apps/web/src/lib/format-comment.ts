/**
 * Utility functions for comment formatting, relative time calculation,
 * and lightweight markdown/@mention parsing.
 */

export function formatRelativeTime(
  dateInput: string | Date,
  now: Date = new Date(),
): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const diffMs = now.getTime() - date.getTime();

  // If in the future or under 30 seconds ago
  if (diffMs < 30 * 1000) {
    return 'just now';
  }

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days < 7) {
    return `${days}d ago`;
  }

  // Format as short date (e.g., Nov 20 or Nov 20, 2025)
  const isSameYear = date.getFullYear() === now.getFullYear();
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const month = monthNames[date.getMonth()];
  const day = date.getDate();

  if (isSameYear) {
    return `${month} ${day}`;
  }
  return `${month} ${day}, ${date.getFullYear()}`;
}

export interface FormattedToken {
  type: 'text' | 'bold' | 'italic' | 'code' | 'mention' | 'newline';
  value: string;
}

/**
 * Tokenizes comment text to support basic markdown and @mention highlighting.
 */
export function tokenizeComment(content: string): FormattedToken[] {
  if (!content) return [];

  const tokens: FormattedToken[] = [];
  const lines = content.split('\n');

  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) {
      tokens.push({ type: 'newline', value: '\n' });
    }

    // Tokenize each line
    // Regex matches:
    // 1. **bold**
    // 2. *italic*
    // 3. `inline code`
    // 4. @[a-zA-Z0-9_-]+ (mention)
    const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|@[a-zA-Z0-9_-]+)/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(line)) !== null) {
      // Preceding regular text
      if (match.index > lastIndex) {
        tokens.push({
          type: 'text',
          value: line.substring(lastIndex, match.index),
        });
      }

      const matchText = match[0];

      if (matchText.startsWith('**') && matchText.endsWith('**')) {
        tokens.push({
          type: 'bold',
          value: matchText.slice(2, -2),
        });
      } else if (matchText.startsWith('*') && matchText.endsWith('*')) {
        tokens.push({
          type: 'italic',
          value: matchText.slice(1, -1),
        });
      } else if (matchText.startsWith('`') && matchText.endsWith('`')) {
        tokens.push({
          type: 'code',
          value: matchText.slice(1, -1),
        });
      } else if (matchText.startsWith('@')) {
        tokens.push({
          type: 'mention',
          value: matchText,
        });
      }

      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < line.length) {
      tokens.push({
        type: 'text',
        value: line.substring(lastIndex),
      });
    }
  });

  return tokens;
}
