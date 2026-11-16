interface TeamLogoProps {
  teamId?: string;
  shortName?: string;
  size?: 'sm' | 'md' | 'lg';
}

const TEAM_PALETTES: Record<
  string,
  { bg: string; ring: string; text: string; accent: string }
> = {
  // International Teams
  team_ind: { bg: '#1d4ed8', ring: '#f97316', text: '#ffffff', accent: '#38bdf8' },
  team_nz: { bg: '#0f172a', ring: '#94a3b8', text: '#ffffff', accent: '#cbd5e1' },
  team_aus: { bg: '#eab308', ring: '#15803d', text: '#052e16', accent: '#166534' },
  team_eng: { bg: '#1e3a8a', ring: '#ef4444', text: '#ffffff', accent: '#dc2626' },
  team_sa: { bg: '#15803d', ring: '#eab308', text: '#fef08a', accent: '#facc15' },
  team_wi: { bg: '#7f1d1d', ring: '#f59e0b', text: '#fef3c7', accent: '#fbbf24' },
  team_pak: { bg: '#166534', ring: '#86efac', text: '#ffffff', accent: '#4ade80' },
  team_sl: { bg: '#1e40af', ring: '#eab308', text: '#fde047', accent: '#facc15' },
  team_afg: { bg: '#1d4ed8', ring: '#dc2626', text: '#ffffff', accent: '#ef4444' },
  team_ban: { bg: '#065f46', ring: '#dc2626', text: '#ffffff', accent: '#ef4444' },
  team_ire: { bg: '#16a34a', ring: '#ffffff', text: '#ffffff', accent: '#bbf7d0' },
  team_zim: { bg: '#dc2626', ring: '#eab308', text: '#fef08a', accent: '#facc15' },

  // IPL Franchises
  ipl_rcb: { bg: '#b91c1c', ring: '#eab308', text: '#fde047', accent: '#111827' },
  ipl_gt: { bg: '#1e293b', ring: '#38bdf8', text: '#facc15', accent: '#0284c7' },
  ipl_csk: { bg: '#facc15', ring: '#2563eb', text: '#1e3a8a', accent: '#1d4ed8' },
  ipl_mi: { bg: '#1d4ed8', ring: '#f59e0b', text: '#ffffff', accent: '#fbbf24' },
  ipl_kkr: { bg: '#4c1d95', ring: '#f59e0b', text: '#fde047', accent: '#d97706' },
  ipl_srh: { bg: '#ea580c', ring: '#111827', text: '#ffffff', accent: '#0f172a' },
  ipl_rr: { bg: '#db2777', ring: '#1d4ed8', text: '#ffffff', accent: '#2563eb' },
  ipl_dc: { bg: '#1d4ed8', ring: '#dc2626', text: '#ffffff', accent: '#ef4444' },
  ipl_pbks: { bg: '#dc2626', ring: '#cbd5e1', text: '#ffffff', accent: '#e2e8f0' },
  ipl_lsg: { bg: '#0284c7', ring: '#f97316', text: '#ffffff', accent: '#fb923c' },
};

export function TeamLogo({
  teamId = '',
  shortName = 'TM',
  size = 'md',
}: TeamLogoProps) {
  const palette = TEAM_PALETTES[teamId] ?? {
    bg: '#334155',
    ring: '#10b981',
    text: '#ffffff',
    accent: '#34d399',
  };

  const dims =
    size === 'sm'
      ? 'w-6 h-6 text-[9px]'
      : size === 'lg'
      ? 'w-11 h-11 text-xs'
      : 'w-8 h-8 text-[10px]';

  const label = shortName.slice(0, 4).toUpperCase();

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-extrabold tracking-tighter shrink-0 select-none shadow-sm ${dims}`}
      style={{
        backgroundColor: palette.bg,
        color: palette.text,
        border: `2px solid ${palette.ring}`,
      }}
      title={label}
    >
      {label}
    </span>
  );
}