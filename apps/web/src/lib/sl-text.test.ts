import { describe, it, expect } from 'vitest';
import { parseSLText } from './sl-text';

describe('SL-Text Parser', () => {
  it('parses basic paragraphs', () => {
    const input = `Hello world\n\nHow are you?`;
    const res = parseSLText(input);
    expect(res).toHaveLength(2);
    expect(res[0]).toEqual({ type: 'paragraph', children: [{ type: 'text', content: 'Hello world' }] });
  });

  it('parses single newlines as line breaks within paragraph', () => {
    const input = `Line 1\nLine 2`;
    const res = parseSLText(input);
    expect(res).toHaveLength(1);
    expect((res[0] as any).children).toEqual([
      { type: 'text', content: 'Line 1' },
      { type: 'break' },
      { type: 'text', content: 'Line 2' }
    ]);
  });

  it('parses scene breaks', () => {
    const input = `Before\n\n---\n\nAfter`;
    const res = parseSLText(input);
    expect(res).toHaveLength(3);
    expect(res[1]).toEqual({ type: 'scene-break' });
  });

  it('parses italics', () => {
    const input = `This is *italic* text.`;
    const res = parseSLText(input);
    expect((res[0] as any).children).toEqual([
      { type: 'text', content: 'This is ' },
      { type: 'italic', content: 'italic' },
      { type: 'text', content: ' text.' }
    ]);
  });

  it('ignores HTML completely, treating it as text', () => {
    const input = `<h1>Title</h1><script>alert(1)</script>`;
    const res = parseSLText(input);
    expect((res[0] as any).children).toEqual([
      { type: 'text', content: '<h1>Title</h1><script>alert(1)</script>' }
    ]);
  });
});
