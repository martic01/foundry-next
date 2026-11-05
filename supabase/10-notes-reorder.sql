-- Stage 1 notes: the Git & GitHub lesson moved from Day 25 to Day 10 (right after the first
-- project), and old Days 10-24 moved down to 11-25. This renumbers the days YOU already
-- unlocked so the right lessons stay unlocked. Run it ONCE (running it twice shifts them twice).
update note_unlocks set day = day + 100 where course = 'foundations' and day between 10 and 25;
update note_unlocks set day = case when day = 125 then 10 else day - 99 end
  where course = 'foundations' and day between 110 and 125;
