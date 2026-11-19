// SERVER ONLY. Holds the questions AND the answers: never import this from a client component
// and never send `answer` to the browser.
import html from './bank/html';
import css from './bank/css';
import js from './bank/js';
import git from './bank/git';
import hosting from './bank/hosting';
import structure from './bank/structure';
import ai from './bank/ai';

export const BANK = { html, css, js, git, hosting, structure, ai };
export const BANK_BY_ID = Object.fromEntries(Object.values(BANK).flat().map((q) => [q.id, q]));
