'use client';

import { DemoCard } from './Stage';
import CssDemo from './CssDemo';
import CanvasDemo from './CanvasDemo';
import ThreeDemo from './ThreeDemo';

// kind: 'css' | 'js' | '3d'. Every card is isolated: a failure in one never touches the others.
export default function DemoGrid({ kind, demos }) {
  return (
    <div className="grid gap-5">
      {demos.map((d) => (
        <DemoCard key={d.id} title={d.title} text={d.text} lang={kind === 'css' ? 'html + css' : kind === 'js' ? 'javascript' : 'three.js'}
          code={kind === 'css' ? `<!-- HTML -->\n${d.html}\n\n/* CSS */\n${d.css}` : d.code}>
          {(active) => kind === 'css' ? <CssDemo html={d.html} css={d.css} active={active} />
            : kind === 'js' ? <CanvasDemo id={d.id} active={active} />
            : <ThreeDemo id={d.id} active={active} />}
        </DemoCard>
      ))}
    </div>
  );
}
