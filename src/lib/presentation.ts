export const BACKGROUNDS = [
  { id: 'dots', name: 'Chapl', note: 'Stained-glass dots', theme: 'adaptive', image: null },
  { id: 'cross', name: 'The cross', note: 'Open sky · quiet faith', theme: 'light', image: '/presentation/cross.jpg' },
  { id: 'glass', name: 'Evening prayer', note: 'A cross at sunset', theme: 'dark', image: '/presentation/glass.jpg' },
  { id: 'sanctuary', name: 'Sanctuary', note: 'Gothic arches · stained glass', theme: 'dark', image: '/presentation/sanctuary.jpg' },
  { id: 'mountains', name: 'Open sanctuary', note: 'Sunlight through a chapel', theme: 'light', image: '/presentation/mountains.jpg' },
  { id: 'clouds', name: 'Above the clouds', note: 'Hope on the horizon', theme: 'dark', image: '/presentation/clouds.jpg' },
  { id: 'stillness', name: 'Be still', note: 'A church in monochrome', theme: 'light', image: '/presentation/stillness.jpg' },
] as const;
export type PresentationStyle = {
  background: typeof BACKGROUNDS[number]['id'];
  mode: 'auto' | 'light' | 'dark';
  textSize: number;
  motion: boolean;
  title: string;
  subtitle: string;
};
export const DEFAULT_STYLE: PresentationStyle = { background: 'dots', mode: 'auto', textSize: 100, motion: true, title: '', subtitle: '' };
export function presentationStyle(raw: Partial<PresentationStyle> = {}): PresentationStyle {
  return {
    background: BACKGROUNDS.some(b => b.id === raw.background) ? raw.background! : 'dots',
    mode: ['auto','light','dark'].includes(raw.mode ?? '') ? raw.mode! : 'auto',
    textSize: Number.isFinite(raw.textSize) ? Math.max(80, Math.min(120, raw.textSize!)) : 100,
    motion: typeof raw.motion === 'boolean' ? raw.motion : true,
    title: typeof raw.title === 'string' ? raw.title.slice(0,200) : '',
    subtitle: typeof raw.subtitle === 'string' ? raw.subtitle.slice(0,500) : '',
  };
}
