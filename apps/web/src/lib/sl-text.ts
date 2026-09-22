export type SLTextNode = 
  | { type: 'text'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'break' };

export type SLTextParagraph = 
  | { type: 'paragraph'; children: SLTextNode[] }
  | { type: 'scene-break' };

export function parseSLText(input: string): SLTextParagraph[] {
  if (!input) return [];

  const rawParagraphs = input.split(/\n\n+/);
  const paragraphs: SLTextParagraph[] = [];

  for (let raw of rawParagraphs) {
    raw = raw.trim();
    if (!raw) continue;

    if (raw === '---') {
      paragraphs.push({ type: 'scene-break' });
      continue;
    }

    const children: SLTextNode[] = [];
    
    // We split by newlines first to insert breaks, then by asterisks.
    const lines = raw.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      
      // Basic asterisk split (naïve approach for strictly non-nested italics)
      // Odd indices will be italic if closed, but we should use a regex for *italic*
      
      let lastIndex = 0;
      const regex = /\*(.*?)\*/g;
      let match;
      
      while ((match = regex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          children.push({ type: 'text', content: line.slice(lastIndex, match.index) });
        }
        children.push({ type: 'italic', content: match[1]! });
        lastIndex = regex.lastIndex;
      }
      
      if (lastIndex < line.length) {
        children.push({ type: 'text', content: line.slice(lastIndex) });
      }

      if (i < lines.length - 1) {
        children.push({ type: 'break' });
      }
    }

    paragraphs.push({ type: 'paragraph', children });
  }

  return paragraphs;
}
