import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { settingsDB } from '../db';

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  backgroundImage: string;
  setBackgroundImage: (url: string) => void;
  userName: string;
  setUserName: (name: string) => void;
  avatar: string;
  setAvatar: (url: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  darkMode: false,
  toggleDarkMode: () => {},
  backgroundImage: '',
  setBackgroundImage: () => {},
  userName: '同学',
  setUserName: () => {},
  avatar: '',
  setAvatar: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);
  const [backgroundImage, setBgImage] = useState('');
  const [userName, setUserNameState] = useState('同学');
  const [avatar, setAvatarState] = useState('');

  useEffect(() => {
    settingsDB.get().then((s) => {
      setDarkMode(s.darkMode);
      setBgImage(s.backgroundImage || '');
      setUserNameState(s.userName || '同学');
      setAvatarState(s.avatar || '');
      if (s.darkMode) document.documentElement.classList.add('dark');
      if (s.backgroundImage) {
        document.body.style.backgroundImage = `url(${s.backgroundImage})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundAttachment = 'fixed';
        document.body.style.backgroundPosition = 'center';
        document.body.classList.add('has-bg');
      }
    });
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      settingsDB.get().then((s) => settingsDB.save({ ...s, darkMode: next }));
      return next;
    });
  }, []);

  const setBackgroundImage = useCallback((url: string) => {
    setBgImage(url);
    if (url) {
      document.body.style.backgroundImage = `url(${url})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundAttachment = 'fixed';
      document.body.style.backgroundPosition = 'center';
      document.body.classList.add('has-bg');
    } else {
      document.body.style.backgroundImage = '';
      document.body.classList.remove('has-bg');
    }
    settingsDB.get().then((s) => {
      s.backgroundImage = url;
      settingsDB.save(s);
    });
  }, []);

  const setUserName = useCallback((name: string) => {
    setUserNameState(name);
    settingsDB.get().then((s) => {
      s.userName = name;
      settingsDB.save(s);
    });
  }, []);

  const setAvatar = useCallback((url: string) => {
    setAvatarState(url);
    settingsDB.get().then((s) => {
      s.avatar = url;
      settingsDB.save(s);
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, backgroundImage, setBackgroundImage, userName, setUserName, avatar, setAvatar }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);