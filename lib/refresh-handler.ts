// Refresh and resize handler for proper layout management
import React from 'react';

export function handleRefreshResize() {
  if (typeof window === 'undefined') return () => {}; // Return empty cleanup function for SSR

  // Force recalculation of layout on refresh
  const forceReflow = () => {
    document.body.style.display = 'none';
    document.body.offsetHeight; // Trigger reflow
    document.body.style.display = '';
  };

  // Handle page load/refresh
  const handlePageLoad = () => {
    // Reset viewport
    document.documentElement.style.width = '100%';
    document.documentElement.style.height = '100%';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    // Force layout recalculation
    forceReflow();
    
    // Ensure proper container sizing
    const containers = document.querySelectorAll('.container-main, .content-container, .homepage-container');
    containers.forEach(container => {
      const element = container as HTMLElement;
      element.style.width = '100%';
      element.style.maxWidth = '100%';
      element.style.overflowX = 'hidden';
      element.style.boxSizing = 'border-box';
    });
  };

  // Handle window resize
  const handleResize = () => {
    // Recalculate layout
    forceReflow();
    
    // Update container widths
    const containers = document.querySelectorAll('.container-main, .content-container, .homepage-container');
    containers.forEach(container => {
      const element = container as HTMLElement;
      element.style.width = '100%';
      element.style.maxWidth = '100%';
    });
  };

  // Handle orientation change (mobile)
  const handleOrientationChange = () => {
    setTimeout(() => {
      handleResize();
    }, 100);
  };

  // Add event listeners
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handlePageLoad);
  } else {
    handlePageLoad();
  }

  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleOrientationChange);
  window.addEventListener('load', handlePageLoad);

  // Cleanup function
  return () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleOrientationChange);
    window.removeEventListener('load', handlePageLoad);
  };
}

// React hook for refresh handling
export function useRefreshHandler() {
  React.useEffect(() => {
    const cleanup = handleRefreshResize();
    return cleanup;
  }, []);
}

// Utility to force layout recalculation
export function forceLayoutRecalculation() {
  if (typeof window === 'undefined') return;
  
  // Trigger reflow
  document.body.offsetHeight;
  
  // Update all containers
  const containers = document.querySelectorAll('.container-main, .content-container, .homepage-container');
  containers.forEach(container => {
    const element = container as HTMLElement;
    element.style.width = '100%';
    element.style.maxWidth = '100%';
    element.style.overflowX = 'hidden';
  });
}
