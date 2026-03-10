/**
 * Viewport height fix for mobile devices
 * Fixes the issue where 100vh doesn't account for browser UI
 */
export const initViewportHeight = () => {
  const setVh = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  // Set on load
  setVh();

  // Update on resize
  window.addEventListener('resize', setVh);

  // Update on orientation change
  window.addEventListener('orientationchange', () => {
    setTimeout(setVh, 100); // Small delay for orientation change
  });

  // Cleanup function
  return () => {
    window.removeEventListener('resize', setVh);
    window.removeEventListener('orientationchange', setVh);
  };
};
