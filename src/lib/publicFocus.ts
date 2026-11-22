/**
 * Public names for the paid program. Week-by-week actions stay on the server.
 * Titles match buildFocusProgram so the teaser is the real program name.
 */
const TITLES: Record<string, string> = {
  skin: '4-week skin & itch reset',
  pulling: '4-week loose-leash plan',
  diet: '4-week feeding & weight plan',
  breathing: '4-week breathing & heat log',
  wellness: '4-week preventive-care baseline',
};

export function publicFocusTitle(concern: string): string {
  return TITLES[concern] || TITLES.wellness;
}
