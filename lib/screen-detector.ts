// Screen size detection utility for automatic responsive behavior
import React from 'react';

export type ScreenSize = 
  | 'xs'      // 320px - 479px (Extra small phones)
  | 'sm'      // 480px - 639px (Small phones)
  | 'md'      // 640px - 767px (Large phones)
  | 'lg'      // 768px - 1023px (Small tablets)
  | 'xl'      // 1024px - 1365px (Laptops)
  | '2xl'     // 1366px - 1439px (Standard laptops)
  | '3xl'     // 1440px - 1919px (Large laptops)
  | '4xl';    // 1920px+ (Ultra-wide)

export interface ScreenInfo {
  size: ScreenSize;
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLaptop: boolean;
  isUltraWide: boolean;
}

const breakpoints = {
  xs: 320,
  sm: 480,
  md: 640,
  lg: 768,
  xl: 1024,
  '2xl': 1366,
  '3xl': 1440,
  '4xl': 1920,
};

export function getScreenSize(): ScreenSize {
  if (typeof window === 'undefined') return 'xl'; // Default for SSR
  
  const width = window.innerWidth;
  
  if (width >= breakpoints['4xl']) return '4xl';
  if (width >= breakpoints['3xl']) return '3xl';
  if (width >= breakpoints['2xl']) return '2xl';
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  if (width >= breakpoints.sm) return 'sm';
  return 'xs';
}

export function getScreenInfo(): ScreenInfo {
  if (typeof window === 'undefined') {
    return {
      size: 'xl',
      width: 1024,
      height: 768,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isLaptop: true,
      isUltraWide: false,
    };
  }
  
  const width = window.innerWidth;
  const height = window.innerHeight;
  const size = getScreenSize();
  
  return {
    size,
    width,
    height,
    isMobile: width < breakpoints.lg,
    isTablet: width >= breakpoints.lg && width < breakpoints.xl,
    isDesktop: width >= breakpoints.xl,
    isLaptop: width >= breakpoints.xl && width < breakpoints['4xl'],
    isUltraWide: width >= breakpoints['4xl'],
  };
}

export function useScreenSize() {
  if (typeof window === 'undefined') {
    return getScreenInfo();
  }
  
  const [screenInfo, setScreenInfo] = React.useState<ScreenInfo>(getScreenInfo);
  
  React.useEffect(() => {
    const handleResize = () => {
      setScreenInfo(getScreenInfo());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return screenInfo;
}

// Utility functions for responsive behavior
export const screenUtils = {
  isMobile: () => getScreenInfo().isMobile,
  isTablet: () => getScreenInfo().isTablet,
  isDesktop: () => getScreenInfo().isDesktop,
  isLaptop: () => getScreenInfo().isLaptop,
  isUltraWide: () => getScreenInfo().isUltraWide,
  
  // Get appropriate grid columns based on screen size
  getGridCols: (size: ScreenSize) => {
    switch (size) {
      case 'xs':
      case 'sm':
        return 1;
      case 'md':
        return 2;
      case 'lg':
        return 2;
      case 'xl':
        return 3;
      case '2xl':
        return 4;
      case '3xl':
        return 5;
      case '4xl':
        return 6;
      default:
        return 3;
    }
  },
  
  // Get appropriate sidebar width based on screen size
  getSidebarWidth: (size: ScreenSize, collapsed: boolean = false) => {
    if (collapsed) {
      switch (size) {
        case 'xs':
        case 'sm':
        case 'md':
        case 'lg':
          return '100%';
        case 'xl':
          return '3.25rem';
        case '2xl':
          return '3.5rem';
        case '3xl':
          return '4rem';
        case '4xl':
          return '4.5rem';
        default:
          return '4rem';
      }
    }
    
    switch (size) {
      case 'xs':
      case 'sm':
      case 'md':
      case 'lg':
        return '100%';
      case 'xl':
        return '13rem';
      case '2xl':
        return '14rem';
      case '3xl':
        return '16rem';
      case '4xl':
        return '18rem';
      default:
        return '16rem';
    }
  },
  
  // Get appropriate container max width based on screen size
  getContainerWidth: (size: ScreenSize) => {
    switch (size) {
      case 'xs':
        return 'max-w-sm';
      case 'sm':
        return 'max-w-md';
      case 'md':
        return 'max-w-2xl';
      case 'lg':
        return 'max-w-4xl';
      case 'xl':
        return 'max-w-5xl';
      case '2xl':
        return 'max-w-6xl';
      case '3xl':
        return 'max-w-7xl';
      case '4xl':
        return 'max-w-7xl';
      default:
        return 'max-w-7xl';
    }
  },
};

// React hook for screen size detection
export function useResponsive() {
  const screenInfo = useScreenSize();
  
  return {
    ...screenInfo,
    ...screenUtils,
    gridCols: screenUtils.getGridCols(screenInfo.size),
    sidebarWidth: screenUtils.getSidebarWidth(screenInfo.size),
    containerWidth: screenUtils.getContainerWidth(screenInfo.size),
  };
}
