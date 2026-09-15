// Route-specific resource hints keep the landing hero image out of the
// candidate and portal critical paths during cold navigations.
if (window.location.pathname === '/') {
  const heroPreload = document.createElement('link');
  heroPreload.rel = 'preload';
  heroPreload.href = '/assets/hero-photo.webp';
  heroPreload.as = 'image';
  heroPreload.type = 'image/webp';
  heroPreload.fetchPriority = 'high';
  document.head.appendChild(heroPreload);
}
