export const ThemeProvider = ({ children }) => children

export const useTheme = () => ({
  theme: 'dark',
  toggleTheme: () => {},
  setThemePreference: () => {}
})
