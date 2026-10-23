'use client';

export function flyItemToCart(
  startElement: HTMLElement | null,
  imageUrl: string,
  onComplete?: () => void
) {
  if (typeof window === 'undefined') {
    onComplete?.();
    return;
  }

  const cartBtn = document.getElementById('navbar-cart-btn');
  if (!cartBtn) {
    onComplete?.();
    return;
  }

  const startRect = startElement
    ? startElement.getBoundingClientRect()
    : {
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
        width: 70,
        height: 70,
      };

  const endRect = cartBtn.getBoundingClientRect();

  // Create a floating flyer element
  const flyer = document.createElement('div');
  const size = Math.min(Math.max(startRect.width * 0.6, 60), 80);

  flyer.style.position = 'fixed';
  flyer.style.zIndex = '9999';
  flyer.style.top = `${startRect.top + (startRect.height - size) / 2}px`;
  flyer.style.left = `${startRect.left + (startRect.width - size) / 2}px`;
  flyer.style.width = `${size}px`;
  flyer.style.height = `${size}px`;
  flyer.style.pointerEvents = 'none';
  flyer.style.borderRadius = '18px';
  flyer.style.backgroundImage = `url(${imageUrl})`;
  flyer.style.backgroundSize = 'contain';
  flyer.style.backgroundRepeat = 'no-repeat';
  flyer.style.backgroundPosition = 'center';
  flyer.style.backgroundColor = '#FFFFFF';
  flyer.style.boxShadow = '0 12px 28px rgba(255, 90, 0, 0.45), 0 4px 10px rgba(0,0,0,0.1)';
  flyer.style.border = '2px solid #FF5A00';

  document.body.appendChild(flyer);

  const startX = startRect.left + (startRect.width - size) / 2;
  const startY = startRect.top + (startRect.height - size) / 2;

  const targetX = endRect.left + endRect.width / 2 - size / 2;
  const targetY = endRect.top + endRect.height / 2 - size / 2;

  const deltaX = targetX - startX;
  const deltaY = targetY - startY;

  // Parabolic upward arc trajectory towards the navbar cart
  const arcY = Math.min(deltaY - 80, -60);

  const animation = flyer.animate(
    [
      {
        transform: 'translate(0px, 0px) scale(1) rotate(0deg)',
        opacity: 1,
      },
      {
        offset: 0.4,
        transform: `translate(${deltaX * 0.45}px, ${arcY}px) scale(0.9) rotate(18deg)`,
        opacity: 0.95,
      },
      {
        offset: 0.8,
        transform: `translate(${deltaX * 0.85}px, ${deltaY * 0.85}px) scale(0.5) rotate(28deg)`,
        opacity: 0.8,
      },
      {
        transform: `translate(${deltaX}px, ${deltaY}px) scale(0.15) rotate(35deg)`,
        opacity: 0.2,
      },
    ],
    {
      duration: 620,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards',
    }
  );

  animation.onfinish = () => {
    flyer.remove();
    onComplete?.();
  };
}
