/**
 * What the story tells the dot stage, outside React.
 *
 * The scroll writes here on every frame and the stage reads it on every
 * frame; routing that through state would render the tree sixty times a
 * second to move numbers React never displays.
 */
export const stage = {
  /** Scene position: 0 the door, 1 one person, 2 their cell, 3 their
      branch, 4 the church, 5 Sunday, 6 the room's answer, 7 the door
      again, full. Fractions are the morph between two scenes. */
  target: 0,
  /** How far Sunday's room has filled, 0..1. */
  fill: 0,
};

export const SCENE_COUNT = 8;
