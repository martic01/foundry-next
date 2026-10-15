import { FOUNDATIONS_NOTES, FOUNDATIONS_INTRO } from './foundations';
import {
  REACT_NOTES,
  REACT_INTRO,
  CYBERSECURITY_NOTES,
  CYBERSECURITY_INTRO,
  HR_NOTES,
  HR_INTRO
} from './placeholders';

// foundations has the real notes. react, cybersecurity and hr are SHORT
// PLACEHOLDERS (see ./placeholders.js) until the real notes are written --
// swap an entry here for the real file when it's ready.
export const NOTES_BY_COURSE = {
  foundations: FOUNDATIONS_NOTES,
  react: REACT_NOTES,
  cybersecurity: CYBERSECURITY_NOTES,
  hr: HR_NOTES
};

export const INTRO_BY_COURSE = {
  foundations: FOUNDATIONS_INTRO,
  react: REACT_INTRO,
  cybersecurity: CYBERSECURITY_INTRO,
  hr: HR_INTRO
};
