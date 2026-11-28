"use client";

import { BACKGROUNDS, type PresentationStyle } from "@/lib/presentation";

export function PresentationBackdrop({ appearance }: { appearance: PresentationStyle }) {
  const picture = BACKGROUNDS.find(b => b.id === appearance.background)?.image;
  return <div className="presentation-backdrop" aria-hidden="true">
    {picture ? <div key={picture} className="presentation-photo" style={{ backgroundImage: `url(${picture})` }} /> :
      <svg className="presentation-glass" viewBox="0 0 800 600" fill="none">
        <path d="M260 560V275a140 140 0 0 1 280 0v285M400 135v425M260 310h280" stroke="currentColor" strokeWidth="1" />
        {Array.from({length: 144}, (_, i) => {
          const x = 275 + (i % 12) * 23, y = 230 + Math.floor(i / 12) * 26;
          const cross = (x > 380 && x < 420) || (y > 300 && y < 345);
          return <circle key={i} cx={x} cy={y} r={cross ? 2 : 4} fill={cross ? 'none' : ['var(--cobalt)','var(--violet)','var(--gold)','var(--teal)'][i % 4]} stroke={cross ? 'currentColor' : 'none'} style={{animationDelay: `${i % 9 * -0.7}s`}} />;
        })}
      </svg>}
    <div className="presentation-veil" />
  </div>;
}

export function PresentationSettings({ appearance, onChange, live, textEditable = true }: {
  appearance: PresentationStyle;
  onChange: (patch: Partial<PresentationStyle>) => void;
  live: boolean;
  textEditable?: boolean;
}) {
  return <details open className="presentation-settings sheet">
    <summary><span>Slide studio</span><span className="text-ink-3 text-xs">{live ? 'Live edits' : 'Prepare the screen'}</span></summary>
    <div className="presentation-settings-body">
      <div className="presentation-preview" data-mode={appearance.mode} data-motion="off">
        <PresentationBackdrop appearance={appearance} />
        <div><span className="eyebrow">{live ? 'On the screen' : 'Preview'}</span><strong>{(textEditable && appearance.title) || 'Welcome back'}</strong>{textEditable && appearance.subtitle && <p>{appearance.subtitle}</p>}</div>
      </div>
      <fieldset><legend>Background · landscape</legend>
        {(['light', 'dark', 'adaptive'] as const).map(theme => <div className="presentation-theme-group" key={theme}>
          <h3>{theme === 'light' ? 'Light themes' : theme === 'dark' ? 'Dark themes' : 'Chapl signature'}</h3>
          <div className="presentation-swatches">
            {BACKGROUNDS.filter(b => b.theme === theme).map(b => <button type="button" key={b.id} aria-pressed={b.id === appearance.background} onClick={() => onChange({background:b.id, mode:theme === 'adaptive' ? 'auto' : theme})}>
              <span className="presentation-swatch" style={b.image ? {backgroundImage:`url(${b.image})`} : undefined}>{!b.image && <span className="presentation-dot-mark" aria-hidden="true">{Array.from({length:9},(_,i)=><i key={i} />)}</span>}</span>
              <strong>{b.name}</strong><small>{b.note}</small>
            </button>)}
          </div>
        </div>)}
      </fieldset>
      <fieldset><legend>Appearance</legend><div className="presentation-options">
        {(['auto','light','dark'] as const).map(mode => <button key={mode} type="button" className="btn btn-sm btn-quiet" aria-pressed={appearance.mode === mode} onClick={() => onChange({mode})}>{mode === 'auto' ? 'Match app' : mode === 'light' ? 'Light' : 'Dark'}</button>)}
      </div></fieldset>
      <label className="presentation-range">Text size <span>{appearance.textSize}%</span><input aria-label="Slide text size" type="range" min="80" max="120" step="5" value={appearance.textSize} onChange={e => onChange({textSize:Number(e.target.value)})} /></label>
      <label className="presentation-toggle"><input type="checkbox" checked={appearance.motion} onChange={e => onChange({motion:e.target.checked})} /> Gentle motion</label>
      {live && textEditable && <form key={`${appearance.title}:${appearance.subtitle}`} onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); onChange({title:String(data.get("title") ?? ""),subtitle:String(data.get("subtitle") ?? "")}); }}>
        <label>Title<input className="deck-input" name="title" defaultValue={appearance.title} maxLength={200} placeholder="Use the slide’s original title" /></label>
        <label>Subtitle<textarea className="deck-input" name="subtitle" defaultValue={appearance.subtitle} maxLength={500} rows={3} placeholder="Add a line for the room" /></label>
        <div className="presentation-options"><button className="btn btn-sm" type="submit">Apply to current slide</button><button className="btn btn-sm btn-quiet" type="button" onClick={() => onChange({title:'',subtitle:''})}>Restore original</button></div>
      </form>}
      <p className="text-xs text-ink-3">Move the audience window to the projector and press F for full screen. Share that window to keep controls private.</p>
      <a className="text-xs text-ink-3 underline" href="/presentation/CREDITS.md" target="_blank" rel="noreferrer">Photo credits · Pexels</a>
    </div>
  </details>;
}
