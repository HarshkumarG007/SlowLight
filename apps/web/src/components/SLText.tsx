import React from 'react';
import { parseSLText } from '../lib/sl-text';
import styles from './SLText.module.css';

export interface SLTextProps {
  content: string;
  className?: string;
}

export function SLText({ content, className = '' }: SLTextProps) {
  const paragraphs = parseSLText(content);

  return (
    <div className={`${styles.container} ${className}`.trim()}>
      {paragraphs.map((p, pIdx) => {
        if (p.type === 'scene-break') {
          return <hr key={pIdx} className={styles.sceneBreak} />;
        }
        
        return (
          <p key={pIdx} className={styles.paragraph}>
            {p.children.map((child, cIdx) => {
              if (child.type === 'text') {
                return <React.Fragment key={cIdx}>{child.content}</React.Fragment>;
              }
              if (child.type === 'italic') {
                return <em key={cIdx} className={styles.italic}>{child.content}</em>;
              }
              if (child.type === 'break') {
                return <br key={cIdx} />;
              }
              return null;
            })}
          </p>
        );
      })}
    </div>
  );
}
