export const handleEnterKeyPress = (callback: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === 'Enter') {
    callback();
  }
};

export const handleEscapeKeyPress = (callback: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === 'Escape') {
    callback();
  }
};

export const handleTabTrap = (e: React.KeyboardEvent, firstFocusableElement: HTMLElement | null, lastFocusableElement: HTMLElement | null) => {
  if (!e.shiftKey && e.key === 'Tab' && e.target === lastFocusableElement) {
    e.preventDefault();
    firstFocusableElement?.focus();
  }

  if (e.shiftKey && e.key === 'Tab' && e.target === firstFocusableElement) {
    e.preventDefault();
    lastFocusableElement?.focus();
  }
}; 