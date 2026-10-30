import { forwardRef } from 'react';
import { SIGNATURE_DATA_URI } from '../../lib/certificate-signature';
import { qrMatrix, qrPath } from '../../lib/qr';

// The certificate itself, drawn as one self-contained SVG (1536 x 1024) so
// it looks identical on screen and in the downloaded PNG. No external
// fonts or images -- those would not survive being turned into a PNG.
//
// Static wording is always drawn. The personal fields (name, course,
// date, id) are only filled when `data` is given; otherwise the template
// placeholders show, which is what a locked student sees.
const GOLD = '#d4a017';
const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

function Robot({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-6" y="38" width="10" height="26" rx="5" fill="#b8860b" />
      <rect x="116" y="38" width="10" height="26" rx="5" fill="#b8860b" />
      <rect x="0" y="0" width="120" height="100" rx="46" fill="url(#gold)" />
      <rect x="14" y="20" width="92" height="58" rx="28" fill="#0c0e10" stroke="#36d6d0" strokeWidth="3" />
      <circle cx="42" cy="49" r="9" fill="#5ff3ea" />
      <circle cx="78" cy="49" r="9" fill="#5ff3ea" />
      <path d="M30 100 q30 -10 60 0 l12 28 h-84 z" fill="url(#gold)" />
    </g>
  );
}

function Wreath({ cx, cy, side }) {
  const leaves = [];
  for (let i = 0; i < 9; i++) {
    const deg = 118 + i * 13; // arc on the left of the seal, bottom to top
    const rad = (deg * Math.PI) / 180;
    const r = 106;
    let x = cx + Math.cos(rad) * r;
    const y = cy + Math.sin(rad) * r;
    let rot = deg + 90;
    if (side === 'right') { x = 2 * cx - x; rot = 180 - deg + 90; }
    leaves.push(<ellipse key={i} cx={x} cy={y} rx="6" ry="15" transform={`rotate(${rot} ${x} ${y})`} fill="url(#gold)" />);
  }
  return <g>{leaves}</g>;
}

function Seal({ cx, cy }) {
  const pts = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    const r = i % 2 ? 78 : 86;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');
  return (
    <g>
      <Wreath cx={cx} cy={cy} side="left" />
      <Wreath cx={cx} cy={cy} side="right" />
      <polygon points={pts} fill="url(#gold)" />
      <circle cx={cx} cy={cy} r="62" fill="#111" stroke="#f7d774" strokeWidth="3" />
      <Robot x={cx - 30} y={cy - 36} s={0.5} />
    </g>
  );
}

const Icon = ({ y, children, line1, line2 }) => (
  <g transform={`translate(84 ${y})`}>
    <rect x="0" y="0" width="46" height="46" rx="10" fill="none" stroke={GOLD} strokeWidth="2" />
    <g fill="none" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">{children}</g>
    <text x="72" y="19" fill="#f3f3f3" fontSize="19" fontFamily={SANS}>{line1}</text>
    <text x="72" y="42" fill="#f3f3f3" fontSize="19" fontFamily={SANS}>{line2}</text>
  </g>
);

// Scan-to-verify code, drawn as plain SVG shapes so it survives the PNG download.
function VerifyQr({ url, x, y, size }) {
  let m;
  try { m = qrMatrix(url); } catch { return null; }
  const pad = 14;
  const scale = (size - pad * 2) / m.length;
  return (
    <g>
      <rect x={x} y={y} width={size} height={size} rx="10" fill="#ffffff" />
      <g transform={`translate(${x + pad} ${y + pad}) scale(${scale})`}>
        <path d={qrPath(m)} fill="#0c0e10" shapeRendering="crispEdges" />
      </g>
      <text x={x + size / 2} y={y + size + 26} textAnchor="middle" fontSize="15" fill="#f3f3f3" fontFamily={SANS} letterSpacing="3">SCAN TO VERIFY</text>
    </g>
  );
}

const CertificateArt = forwardRef(function CertificateArt({ data = null, className = '' }, ref) {
  const name = data?.name || 'Student Name';
  const course = data?.course || 'Course Name';
  const date = data?.date || 'DD MMM YYYY';
  const code = data?.codeFormatted || 'XXXX-XXXX-XXXX';
  const nameSize = name.length > 30 ? 38 : name.length > 22 ? 46 : 54;
  const courseSize = course.length > 60 ? 24 : course.length > 44 ? 27 : 30;

  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1024" width="1536" height="1024" className={className} role="img" aria-label={data ? `Certificate for ${name}` : 'Certificate template'}>
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f9e08a" />
          <stop offset="0.5" stopColor="#d4a017" />
          <stop offset="1" stopColor="#f2c94c" />
        </linearGradient>
        <radialGradient id="bg" cx="0.5" cy="0.45" r="0.8">
          <stop offset="0" stopColor="#17171a" />
          <stop offset="1" stopColor="#060607" />
        </radialGradient>
      </defs>

      <rect width="1536" height="1024" fill="url(#bg)" />
      <rect x="26" y="26" width="1484" height="972" fill="none" stroke="url(#gold)" strokeWidth="3" />
      <rect x="40" y="40" width="1456" height="944" fill="none" stroke={GOLD} strokeOpacity="0.35" strokeWidth="1" />
      {/* corner ribbons */}
      <polygon points="1380,0 1440,0 1536,96 1536,160" fill="url(#gold)" />
      <polygon points="0,864 0,928 96,1024 40,1024" fill="url(#gold)" />

      {/* brand */}
      <Robot x={102} y={68} s={0.78} />
      <text x="244" y="124" fontSize="52" fontWeight="800" fill="#ffffff" fontFamily={SANS}>The <tspan fill={GOLD} fontStyle="italic">Foundry</tspan></text>
      <text x="247" y="160" fontSize="19" letterSpacing="6" fill="#e8e8e8" fontFamily={SANS}>LEARN • BUILD • GROW</text>
      <line x1="1218" y1="88" x2="1218" y2="154" stroke={GOLD} strokeWidth="2" />
      <text x="1242" y="102" fontSize="21" fill={GOLD} fontFamily={SANS} letterSpacing="1.5">SKILLS FOR</text>
      <text x="1242" y="127" fontSize="21" fill={GOLD} fontFamily={SANS} letterSpacing="1.5">A BRIGHTER</text>
      <text x="1242" y="152" fontSize="21" fill={GOLD} fontFamily={SANS} letterSpacing="1.5">FUTURE</text>

      {/* feature list */}
      <Icon y={326} line1="Build" line2="Real Projects"><path d="M18 15l-9 8 9 8M28 15l9 8-9 8M25 12l-4 22" /></Icon>
      <Icon y={404} line1="Use AI" line2="as a Tool"><circle cx="23" cy="23" r="12" /><path d="M23 11v24M15 18h16M15 28h16" /></Icon>
      <Icon y={482} line1="Gain" line2="Practical Skills"><circle cx="23" cy="17" r="5" /><path d="M12 35c0-7 5-10 11-10s11 3 11 10" /></Icon>
      <Icon y={560} line1="Grow" line2="Your Career"><path d="M12 34V24M22 34V16M32 34V10" /></Icon>

      {/* title */}
      <text x="768" y="262" textAnchor="middle" fontSize="68" fontWeight="700" fill="url(#gold)" fontFamily={SERIF} letterSpacing="4">CERTIFICATE</text>
      <line x1="376" y1="308" x2="508" y2="308" stroke={GOLD} strokeWidth="2" />
      <line x1="1026" y1="308" x2="1156" y2="308" stroke={GOLD} strokeWidth="2" />
      <text x="768" y="320" textAnchor="middle" fontSize="28" fill="#e6e6ea" fontFamily={SANS} letterSpacing="8">OF COMPLETION</text>
      <text x="768" y="377" textAnchor="middle" fontSize="17" fill="#e6e6ea" fontFamily={SANS} letterSpacing="7">THIS CERTIFIES THAT</text>

      <text x="768" y="474" textAnchor="middle" fontSize={nameSize} fontWeight="600" fill="url(#gold)" fontFamily={SANS}>{name}</text>
      <line x1="352" y1="498" x2="1182" y2="498" stroke={GOLD} strokeWidth="2" />

      <text x="768" y="546" textAnchor="middle" fontSize="21" fill="#f3f3f3" fontFamily={SANS}>has successfully completed the full course</text>
      <text x="768" y="592" textAnchor="middle" fontSize={courseSize} fontWeight="700" fill={GOLD} fontFamily={SANS}>{course}</text>
      <text x="768" y="632" textAnchor="middle" fontSize="19" fill="#f3f3f3" fontFamily={SANS}>and demonstrated dedication, commitment, and practical skills</text>
      <text x="768" y="660" textAnchor="middle" fontSize="19" fill="#f3f3f3" fontFamily={SANS}>in building real-world projects using modern technologies.</text>

      <line x1="480" y1="703" x2="544" y2="703" stroke={GOLD} strokeWidth="1.5" />
      <line x1="992" y1="703" x2="1056" y2="703" stroke={GOLD} strokeWidth="1.5" />
      <text x="768" y="709" textAnchor="middle" fontSize="17" fill={GOLD} fontFamily={SANS} letterSpacing="4">THIS CERTIFICATE IS AWARDED ON</text>
      <text x="768" y="738" textAnchor="middle" fontSize="20" fill="#f3f3f3" fontFamily={SANS} letterSpacing="2">{date}</text>

      {/* signature + seal + date */}
      <image href={SIGNATURE_DATA_URI} x="232" y="740" width="186" height="98" preserveAspectRatio="xMidYMid meet" />
      <line x1="192" y1="837" x2="458" y2="837" stroke={GOLD} strokeWidth="2" />
      <text x="325" y="870" textAnchor="middle" fontSize="22" fill="#f3f3f3" fontFamily={SANS}>Program Director</text>
      <text x="325" y="898" textAnchor="middle" fontSize="19" fill={GOLD} fontFamily={SANS}>The Foundry</text>

      <Seal cx={768} cy={850} />

      <text x="1127" y="826" textAnchor="middle" fontSize="20" fill="#f3f3f3" fontFamily={SANS}>{data ? date : ''}</text>
      <line x1="1006" y1="837" x2="1248" y2="837" stroke={GOLD} strokeWidth="2" />
      <text x="1127" y="870" textAnchor="middle" fontSize="22" fill="#f3f3f3" fontFamily={SANS}>Date</text>

      {data?.verifyUrl && <VerifyQr url={data.verifyUrl} x={1316} y={690} size={150} />}

      {/* certificate id (bottom-right corner) */}
      <text x="1470" y="918" textAnchor="end" fontSize="14" fill={GOLD} fontFamily={SANS} letterSpacing="3">CERTIFICATE ID</text>
      <text x="1470" y="946" textAnchor="end" fontSize="26" fontWeight="700" fill="#ffffff" fontFamily='ui-monospace, "SF Mono", Menlo, Consolas, monospace' letterSpacing="2">{code}</text>
      <text x="1470" y="968" textAnchor="end" fontSize="13" fill="#bdbdbd" fontFamily={SANS}>Scan the code or verify on the Foundry website</text>
    </svg>
  );
});

export default CertificateArt;
