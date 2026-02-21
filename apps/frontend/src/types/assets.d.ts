// Image assets type declarations
declare module '*.jpg?url' {
  const src: string;
  export default src;
}

declare module '*.png?url' {
  const src: string;
  export default src;
}

declare module '*.svg?url' {
  const src: string;
  export default src;
}

declare module '*.webp?url' {
  const src: string;
  export default src;
}

declare module '*.gif?url' {
  const src: string;
  export default src;
}

// Also support without ?url suffix
declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

// Radix UI Slider type declaration (temporary until package is installed)
declare module '@radix-ui/react-slider' {
  import * as React from 'react';

  interface SliderProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: number[];
    defaultValue?: number[];
    onValueChange?: (value: number[]) => void;
    onValueCommit?: (value: number[]) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    orientation?: 'horizontal' | 'vertical';
    inverted?: boolean;
    name?: string;
  }

  interface TrackProps extends React.HTMLAttributes<HTMLDivElement> {}
  interface RangeProps extends React.HTMLAttributes<HTMLDivElement> {}
  interface ThumbProps extends React.HTMLAttributes<HTMLDivElement> {}

  export const Root: React.ForwardRefExoticComponent<SliderProps & React.RefAttributes<HTMLDivElement>>;
  export const Track: React.ForwardRefExoticComponent<TrackProps & React.RefAttributes<HTMLDivElement>>;
  export const Range: React.ForwardRefExoticComponent<RangeProps & React.RefAttributes<HTMLDivElement>>;
  export const Thumb: React.ForwardRefExoticComponent<ThumbProps & React.RefAttributes<HTMLDivElement>>;
}

// driver.js type declarations
declare module 'driver.js' {
  export interface Config {
    showProgress?: boolean;
    progressText?: string;
    nextBtnText?: string;
    prevBtnText?: string;
    doneBtnText?: string;
    showButtons?: string[];
    allowClose?: boolean;
    overlayColor?: string;
    stageBackgroundColor?: string;
    stagePadding?: number;
    stageRadius?: number;
    onDestroyStarted?: () => void;
    onCloseClick?: () => void;
    onHighlightStarted?: () => void;
    onHighlighted?: () => void;
    onDeselected?: () => void;
  }

  export interface DriveStep {
    element?: string | Element;
    popover?: {
      title?: string;
      description?: string;
      side?: 'top' | 'bottom' | 'left' | 'right';
      align?: 'start' | 'center' | 'end';
    };
  }

  export interface DriverInstance {
    defineSteps(steps: DriveStep[]): void;
    setSteps?(steps: DriveStep[]): void;
    start(stepNumber?: number): void;
    drive?(): void;
    moveNext(): void;
    movePrevious(): void;
    moveTo(stepNumber: number): void;
    hasHighlightedElement(): boolean;
    clear(): void;
    refresh(): void;
    destroy(): void;
  }

  export function driver(config?: Config): DriverInstance;

  export default class Driver implements DriverInstance {
    constructor(config?: Config);
    defineSteps(steps: DriveStep[]): void;
    setSteps?(steps: DriveStep[]): void;
    start(stepNumber?: number): void;
    drive?(): void;
    moveNext(): void;
    movePrevious(): void;
    moveTo(stepNumber: number): void;
    hasHighlightedElement(): boolean;
    clear(): void;
    refresh(): void;
    destroy(): void;
  }
}

declare module 'driver.js/dist/driver.css' {
  const content: string;
  export default content;
}
