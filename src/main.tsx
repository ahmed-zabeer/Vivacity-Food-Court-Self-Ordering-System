import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Global handler to translate vertical mouse wheel scrolling into horizontal 
// scrolling for `.no-scrollbar` elements (mainly horizontal scroll areas).
if (typeof window !== 'undefined') {
  window.addEventListener('wheel', (e) => {
    // Only intercept if we are scrolling vertically (deltaY) and not already horizontally (deltaX)
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      const target = e.target as HTMLElement;
      // Find the closest ancestor that has horizontal scrolling and the .no-scrollbar class
      const scrollableContainer = target.closest('.no-scrollbar') as HTMLElement;
      
      if (scrollableContainer) {
        const hasHorizontalOverflow = scrollableContainer.scrollWidth > scrollableContainer.clientWidth;
        
        if (hasHorizontalOverflow) {
          // Check if we are at the edges to allow natural page scrolling once reached
          const atLeftEdge = scrollableContainer.scrollLeft <= 0;
          const atRightEdge = Math.ceil(scrollableContainer.scrollLeft + scrollableContainer.clientWidth) >= scrollableContainer.scrollWidth;

          // Only intercept if there's actually room to scroll in the requested direction
          const scrollingLeft = e.deltaY < 0;
          const scrollingRight = e.deltaY > 0;

          if ((scrollingLeft && !atLeftEdge) || (scrollingRight && !atRightEdge)) {
            // Only convert chunky vertical scrolls (standard mouse) to smooth horizontal.
            // Small deltas are likely trackpads, which already support horizontal 2-finger scroll natively.
            if (Math.abs(e.deltaY) > 10) {
              e.preventDefault();
              scrollableContainer.scrollBy({
                left: e.deltaY > 0 ? 150 : -150, 
                behavior: 'smooth'
              });
            }
          }
        }
      }
    }
  }, { passive: false });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
