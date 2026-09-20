import { FOUNDATIONS_NOTES, FOUNDATIONS_INTRO } from './foundations';

// react (Stage 2) has no notes document yet -- NOTES_BY_COURSE.react and
// INTRO_BY_COURSE.react are simply absent, and every page reading from
// these maps already treats a missing/empty value as "notes coming soon"
// rather than an error.
export const NOTES_BY_COURSE = {
  foundations: FOUNDATIONS_NOTES
};

export const INTRO_BY_COURSE = {
  foundations: FOUNDATIONS_INTRO
};
