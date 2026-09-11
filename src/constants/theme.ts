export const palette = {
  ink: '#111018',
  inkSoft: '#1A1824',
  panel: '#24212F',
  panelRaised: '#2D293B',
  cream: '#FFF7DE',
  muted: '#BDB5CE',
  acid: '#C7F43D',
  acidDark: '#8CAD16',
  grape: '#8B5CF6',
  coral: '#FF6B6B',
  cyan: '#56DDE8',
  line: '#3B364B',
  white: '#FFFFFF',
  black: '#09080D',
} as const;

export const shadows = {
  hard: {
    shadowColor: palette.black,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 7,
  },
};

export const layout = {
  maxWidth: 1180,
  sidebarWidth: 238,
  radius: 18,
  border: 2,
} as const;
