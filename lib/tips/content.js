// All the words and code for the Tips page. Plain data (safe on the server). The animations that RUN live in
// components/tips/*; the code shown here is the same code, written so a beginner can copy it.

export const SECTIONS = [
  { id: 'design', label: 'Design tips', art: 'design' },
  { id: 'css', label: 'CSS animation', art: 'css' },
  { id: 'js', label: 'JavaScript animation', art: 'js' },
  { id: '3d', label: '3D tips', art: '3d' },
  { id: 'html', label: 'HTML tips', art: 'html' },
  { id: 'ai', label: 'AI tips', art: 'ai' }
];

export const INTRO = {
  design: {
    title: 'Design tips that make a page feel professional',
    text: 'Good design is not about being fancy. It is about making things easy to read, easy to find and pleasant to look at. These small CSS habits are what separate a student project from a page that looks like it was made by a professional.'
  },
  css: {
    title: 'CSS animations: movement without JavaScript',
    text: 'CSS can animate things all by itself. You describe two or more states with @keyframes, give the animation a duration, and the browser does the rest. Below, each box is running real CSS on the left, and the exact code is on the right. On a phone, use the buttons to slide between the two.'
  },
  js: {
    title: 'JavaScript animation on a canvas',
    text: 'When you need physics, thousands of particles or movement that reacts to the user, CSS is not enough. A <canvas> is a blank drawing board and JavaScript is the artist: every frame it clears the board and draws everything again a tiny bit changed. That loop, run about 60 times a second, is all an animation is.'
  },
  '3d': {
    title: '3D on the web with Three.js',
    text: 'The browser can draw real 3D using WebGL. Three.js makes it friendly: you build a scene, add a camera and some lights, put shapes in it, and ask the renderer to draw. These five scenes load only when you scroll to them, so the page stays fast.'
  },
  html: {
    title: 'HTML tips: the foundation under everything',
    text: 'HTML is the skeleton of every page. When it is written well, the page is faster, easier to use with a screen reader, and ranks better on Google. These habits cost nothing and help every visitor.'
  },
  ai: {
    title: 'AI tips: use AI as a tool, not a shortcut',
    text: 'AI can write code in seconds, but you are still the developer. The people who get the most from it know what to ask, can read what comes back, and test everything. Here is how to work with it properly.'
  }
};

// ---------- Plain tip cards (write-up + a small code sample) ----------
export const TIPS = {
  design: [
    { title: 'Give text room to breathe', text: 'Long lines and tight lines tire the eye. Keep paragraphs to about 65 characters wide and set the line height to around 1.6.', code: `p {\n  max-width: 65ch;\n  line-height: 1.6;\n}` },
    { title: 'Use a small set of colours', text: 'Pick one main colour, one accent and a few greys. Store them as CSS variables so you can change the whole site in one place.', code: `:root {\n  --brand: #f2c94c;\n  --ink: #14151a;\n  --muted: #5b5f6b;\n}\nbutton { background: var(--brand); color: var(--ink); }` },
    { title: 'Be consistent with spacing', text: 'Choose a spacing scale (8, 16, 24, 32px) and only use those. Pages look tidy when the gaps repeat.', code: `.card { padding: 24px; margin-bottom: 16px; }\n.card h2 { margin-bottom: 8px; }` },
    { title: 'Make it work on phones first', text: 'Most visitors are on a phone. Write the small-screen layout first, then add rules for wider screens with min-width.', code: `.grid { display: grid; gap: 16px; }\n@media (min-width: 700px) {\n  .grid { grid-template-columns: 1fr 1fr; }\n}` },
    { title: 'Contrast matters more than style', text: 'Light grey text on white looks elegant and is unreadable in sunlight. Aim for dark text on a light background (or the reverse) with strong contrast.', code: `body { color: #14151a; background: #ffffff; }\n.muted { color: #5b5f6b; } /* still readable */` },
    { title: 'Add a soft shadow, not a hard one', text: 'Shadows give depth. Keep them low in opacity and wide in blur, so cards lift off the page gently.', code: `.card {\n  border-radius: 12px;\n  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);\n}` }
  ],
  html: [
    { title: 'Use the right tag for the job', text: 'Use <header>, <nav>, <main>, <section> and <footer> instead of a pile of <div>s. Screen readers and Google both understand them.', code: `<header>…</header>\n<nav>…</nav>\n<main>\n  <section>…</section>\n</main>\n<footer>…</footer>` },
    { title: 'Every image needs alt text', text: 'The alt text is read aloud to people who cannot see the picture, and shown if the image fails to load. Describe what the image shows.', code: `<img src="team.jpg" alt="Students building a website together" width="640" height="420">` },
    { title: 'One h1 per page, then in order', text: 'Headings are an outline. Use one h1, then h2 for sections and h3 inside them. Do not choose a heading because of its size; use CSS for size.', code: `<h1>Learn web development</h1>\n<h2>Stage 1</h2>\n<h3>HTML basics</h3>` },
    { title: 'Label every form field', text: 'A label makes the field easier to tap and lets screen readers announce it. Connect them with for and id.', code: `<label for="email">Email</label>\n<input id="email" type="email" autocomplete="email" required>` },
    { title: 'Add the viewport tag', text: 'Without this one line, phones show a tiny zoomed-out desktop page. Put it in the head of every page.', code: `<meta name="viewport" content="width=device-width, initial-scale=1">` },
    { title: 'Load heavy things lazily', text: 'Images far below the screen do not need to load straight away. Add loading="lazy" and the page opens faster.', code: `<img src="photo.jpg" alt="…" loading="lazy" width="800" height="500">` }
  ],
  ai: [
    { title: 'Be specific in your prompt', text: 'Say what you are building, which language, what the input and output are, and what the code must NOT do. A clear question gets a useful answer.', code: `Write a JavaScript function that takes an array of\nprices (numbers) and returns the total with 7.5% VAT,\nrounded to 2 decimals. Include 3 test examples.` },
    { title: 'Ask it to explain, then check', text: 'After code arrives, ask "explain this line by line". If you cannot explain it, you are not ready to ship it.', code: `Explain this code line by line like I am a beginner,\nthen list 3 ways it could break.` },
    { title: 'Work in small steps', text: 'Ask for one small piece at a time (a button, then its click, then saving). Big requests give big, tangled answers that are hard to fix.', code: `Step 1: only the HTML for the sign-up form.\nStep 2: add the validation.\nStep 3: show errors under each field.` },
    { title: 'Always run and test it', text: 'AI can sound sure and still be wrong. Run the code, try bad input, and read the error messages. Paste an error back and ask what it means.', code: `I get this error: "Cannot read properties of undefined".\nHere is the code and the data. What is wrong?` },
    { title: 'Never paste secrets', text: 'Do not give an AI your passwords, API keys or private customer data. Replace them with placeholders before you paste code.', code: `const KEY = "YOUR_API_KEY_HERE"; // placeholder only` },
    { title: 'Learn from it, do not copy blindly', text: 'Treat AI like a patient tutor. Ask why, ask for alternatives, then rewrite the answer in your own words. That is how you actually improve.', code: `Show me two ways to do this and tell me\nwhen I should choose each one.` }
  ]
};

// ---------- CSS demos: html + css are BOTH shown and run exactly as written ----------
export const CSS_DEMOS = [
  {
    id: 'pulse', title: 'Pulsing button', text: 'A ring grows and fades from behind the button. It uses ::after, transform and opacity, which are the cheapest properties to animate.',
    html: `<button class="pulse-btn">Enroll now</button>`,
    css: `.pulse-btn {
  position: relative;
  padding: 14px 28px;
  border: 0;
  border-radius: 999px;
  background: #f2c94c;
  color: #14151a;
  font-weight: 700;
  font-size: 16px;
}
.pulse-btn::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 2px solid #f2c94c;
  animation: ring 1.8s ease-out infinite;
}
@keyframes ring {
  from { transform: scale(1);   opacity: 0.9; }
  to   { transform: scale(1.6); opacity: 0; }
}`
  },
  {
    id: 'dots', title: 'Bouncing loader', text: 'Three dots share one animation. animation-delay starts each one a little later, which makes the wave.',
    html: `<div class="dots">\n  <span></span><span></span><span></span>\n</div>`,
    css: `.dots { display: flex; gap: 10px; }
.dots span {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #f2c94c;
  animation: bounce 0.9s ease-in-out infinite;
}
.dots span:nth-child(2) { animation-delay: 0.15s; }
.dots span:nth-child(3) { animation-delay: 0.3s; }
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-18px); }
}`
  },
  {
    id: 'flip', title: '3D card flip', text: 'perspective gives depth, transform-style keeps both faces in 3D and backface-visibility hides the side that is turned away.',
    html: `<div class="flip">\n  <div class="flip-inner">\n    <div class="face front">HTML</div>\n    <div class="face back">CSS</div>\n  </div>\n</div>`,
    css: `.flip { width: 140px; height: 100px; perspective: 600px; }
.flip-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  animation: flip 4s ease-in-out infinite;
}
.face {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 12px;
  font-weight: 700;
  backface-visibility: hidden;
}
.front { background: #f2c94c; color: #14151a; }
.back  { background: #2b6cb0; color: #fff; transform: rotateY(180deg); }
@keyframes flip {
  0%, 35%  { transform: rotateY(0); }
  50%, 85% { transform: rotateY(180deg); }
  100%     { transform: rotateY(360deg); }
}`
  },
  {
    id: 'shine', title: 'Shining text', text: 'The text is transparent and a wide gradient shows through it. Moving the background position slides the shine across.',
    html: `<h2 class="shine">The Foundry</h2>`,
    css: `.shine {
  font-size: 34px;
  font-weight: 800;
  background: linear-gradient(90deg, #f2c94c, #ffffff, #f2c94c);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: shine 2.5s linear infinite;
}
@keyframes shine {
  to { background-position: 200% center; }
}`
  },
  {
    id: 'blob', title: 'Floating blob', text: 'Two animations on one element: one morphs the border-radius into a new shape, the other floats it up and down.',
    html: `<div class="blob"></div>`,
    css: `.blob {
  width: 120px;
  height: 120px;
  background: linear-gradient(135deg, #f2c94c, #ff7a59);
  animation: morph 6s ease-in-out infinite,
             float 4s ease-in-out infinite;
}
@keyframes morph {
  0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
  50%      { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-14px); }
}`
  }
];

// ---------- JavaScript canvas demos: the code shown is the same logic that runs ----------
export const JS_DEMOS = [
  {
    id: 'balls', title: 'Bouncing balls (gravity)', text: 'Each ball has a speed. Every frame gravity adds to the speed, the speed moves the ball, and when it hits the floor the speed flips and shrinks.',
    code: `const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const balls = Array.from({ length: 7 }, (_, i) => ({
  x: 40 + i * 45, y: 30 + i * 12,
  vy: 0, r: 12 + (i % 3) * 4,
  color: ['#f2c94c', '#ff7a59', '#5ac8fa'][i % 3]
}));

function frame() {
  ctx.clearRect(0, 0, W, H);
  for (const b of balls) {
    b.vy += 0.35;                 // gravity
    b.y += b.vy;                  // move
    if (b.y + b.r > H) {          // hit the floor
      b.y = H - b.r;
      b.vy *= -0.85;              // bounce, lose a little energy
      if (Math.abs(b.vy) < 1) b.vy = -12;
    }
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.fill();
  }
  requestAnimationFrame(frame);
}
frame();`
  },
  {
    id: 'waves', title: 'Sine waves', text: 'Math.sin gives a smooth up-and-down number. Feed it the x position plus time and you get a wave that travels.',
    code: `const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const colors = ['#f2c94c', '#ff7a59', '#5ac8fa'];

function frame(now) {
  const t = now / 1000;
  ctx.clearRect(0, 0, W, H);
  colors.forEach((color, i) => {
    ctx.beginPath();
    for (let x = 0; x <= W; x += 4) {
      const y = H / 2 + Math.sin(x * 0.02 + t * (1 + i * 0.5)) * (30 + i * 12);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);`
  },
  {
    id: 'stars', title: 'Starfield', text: 'Every star has a depth (z). Each frame it moves closer, and dividing x and y by z makes near stars fly outwards, which feels like travelling through space.',
    code: `const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

const stars = Array.from({ length: 140 }, () => ({
  x: (Math.random() - 0.5) * W,
  y: (Math.random() - 0.5) * H,
  z: Math.random() * W
}));

function frame() {
  ctx.fillStyle = '#0b0c10';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#f2c94c';
  for (const s of stars) {
    s.z -= 4;                           // come closer
    if (s.z < 1) s.z = W;               // start again far away
    const px = W / 2 + (s.x / s.z) * 120;
    const py = H / 2 + (s.y / s.z) * 120;
    const size = (1 - s.z / W) * 3;
    ctx.fillRect(px, py, size, size);
  }
  requestAnimationFrame(frame);
}
frame();`
  },
  {
    id: 'sparks', title: 'Particle fountain', text: 'A fountain keeps creating small particles with a random speed. Each one fades as its life runs out and is removed, so the list never grows too big.',
    code: `const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const parts = [];

function frame() {
  ctx.fillStyle = 'rgba(11, 12, 16, 0.25)';   // leaves a soft trail
  ctx.fillRect(0, 0, W, H);

  if (parts.length < 150) {
    for (let i = 0; i < 3; i++) {
      parts.push({
        x: W / 2, y: H - 20,
        vx: (Math.random() - 0.5) * 4,
        vy: -(Math.random() * 6 + 4),
        life: 1
      });
    }
  }
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.vy += 0.12;                // gravity
    p.x += p.vx;  p.y += p.vy;
    p.life -= 0.012;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    ctx.globalAlpha = p.life;
    ctx.fillStyle = '#f2c94c';
    ctx.fillRect(p.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(frame);
}
frame();`
  },
  {
    id: 'orbits', title: 'Orbiting planets', text: 'A planet on a circle is just cos and sin of an angle. Make the angle grow each frame and the planet travels around; give each one its own speed.',
    code: `const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const planets = [
  { r: 38,  size: 5, speed: 2.2, color: '#5ac8fa' },
  { r: 66,  size: 7, speed: 1.4, color: '#ff7a59' },
  { r: 98,  size: 9, speed: 0.8, color: '#a78bfa' }
];

function frame(now) {
  const t = now / 1000;
  ctx.clearRect(0, 0, W, H);
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#f2c94c';
  ctx.fill();                                   // the sun
  for (const p of planets) {
    const x = W / 2 + Math.cos(t * p.speed) * p.r;
    const y = H / 2 + Math.sin(t * p.speed) * p.r;
    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);`
  }
];

// ---------- 3D demos (Three.js) ----------
const BASE = `import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(0, 0, 6);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
document.body.appendChild(renderer.domElement);
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(3, 4, 5);
scene.add(sun);
`;

export const THREE_DEMOS = [
  {
    id: 'cube', title: 'Lit spinning cube', text: 'A mesh is a shape (geometry) plus a skin (material). Rotate it a little every frame and the lights do the rest.',
    code: `${BASE}
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2),
  new THREE.MeshStandardMaterial({ color: 0xf2c94c, roughness: 0.35, metalness: 0.2 })
);
scene.add(cube);

renderer.setAnimationLoop((now) => {
  cube.rotation.x = now / 1500;
  cube.rotation.y = now / 1000;
  renderer.render(scene, camera);
});`
  },
  {
    id: 'knot', title: 'Shiny torus knot', text: 'Ready-made geometries save time. Low roughness and high metalness make the surface mirror-like and catch the light.',
    code: `${BASE}
const knot = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1.1, 0.38, 120, 16),
  new THREE.MeshStandardMaterial({ color: 0x5ac8fa, roughness: 0.15, metalness: 0.9 })
);
scene.add(knot);

renderer.setAnimationLoop((now) => {
  knot.rotation.y = now / 1200;
  knot.rotation.x = Math.sin(now / 1800) * 0.5;
  renderer.render(scene, camera);
});`
  },
  {
    id: 'points', title: 'Particle sphere', text: 'Thousands of points cost very little when they live in one Points object. Here 900 dots sit on a sphere and slowly turn.',
    code: `${BASE}
const N = 900;
const pos = new Float32Array(N * 3);
for (let i = 0; i < N; i++) {
  const phi = Math.acos(1 - 2 * Math.random());
  const theta = Math.random() * Math.PI * 2;
  pos[i * 3]     = 2 * Math.sin(phi) * Math.cos(theta);
  pos[i * 3 + 1] = 2 * Math.sin(phi) * Math.sin(theta);
  pos[i * 3 + 2] = 2 * Math.cos(phi);
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
const dots = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xf2c94c, size: 0.045 }));
scene.add(dots);

renderer.setAnimationLoop((now) => {
  dots.rotation.y = now / 3000;
  renderer.render(scene, camera);
});`
  },
  {
    id: 'grid', title: 'Wave of cubes', text: 'InstancedMesh draws many copies of one shape in a single call, so 144 cubes are as cheap as one. Each cube moves with a sine wave.',
    code: `${BASE}
const COUNT = 12 * 12;
const mesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(0.28, 0.28, 0.28),
  new THREE.MeshStandardMaterial({ color: 0xa78bfa, roughness: 0.4 }),
  COUNT
);
scene.add(mesh);
mesh.rotation.x = -0.9;
const dummy = new THREE.Object3D();

renderer.setAnimationLoop((now) => {
  const t = now / 800;
  let i = 0;
  for (let x = 0; x < 12; x++) {
    for (let z = 0; z < 12; z++) {
      dummy.position.set((x - 5.5) * 0.4, Math.sin(t + x * 0.5 + z * 0.5) * 0.35, (z - 5.5) * 0.4);
      dummy.updateMatrix();
      mesh.setMatrixAt(i++, dummy.matrix);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);
});`
  },
  {
    id: 'planet', title: 'Planet with a moon', text: 'Put a small object inside a Group, move the group in a circle and you get an orbit. A flat ring turned on its side makes the planet look finished.',
    code: `${BASE}
const planet = new THREE.Mesh(
  new THREE.SphereGeometry(1.1, 48, 32),
  new THREE.MeshStandardMaterial({ color: 0xff7a59, roughness: 0.6 })
);
const ring = new THREE.Mesh(
  new THREE.RingGeometry(1.5, 1.9, 64),
  new THREE.MeshBasicMaterial({ color: 0xf2c94c, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
);
ring.rotation.x = Math.PI / 2.4;
const orbit = new THREE.Group();
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.28, 24, 16),
  new THREE.MeshStandardMaterial({ color: 0xdddddd })
);
moon.position.x = 2.6;
orbit.add(moon);
scene.add(planet, ring, orbit);

renderer.setAnimationLoop((now) => {
  planet.rotation.y = now / 2500;
  orbit.rotation.y = now / 1200;
  renderer.render(scene, camera);
});`
  }
];
