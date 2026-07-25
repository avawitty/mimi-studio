declare module 'react-pageflip' {
  import * as React from 'react';

  export interface FlipBookProps {
    className?: string;
    style?: React.CSSProperties;
    width: number;
    height: number;
    size?: 'fixed' | 'stretch';
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    drawShadow?: boolean;
    flippingTime?: number;
    usePortrait?: boolean;
    startPage?: number;
    autoSize?: boolean;
    maxShadowOpacity?: number;
    showCover?: boolean;
    mobileScrollSupport?: boolean;
    clickEventForward?: boolean;
    useMouseEvents?: boolean;
    swipeDistance?: number;
    showPageCorners?: boolean;
    disableFlipByClick?: boolean;
    onFlip?: (flipEvent: { data: number }) => void;
    onChangeOrientation?: (orientationEvent: { data: 'portrait' | 'landscape' }) => void;
    onChangeState?: (stateEvent: { data: 'user_fold' | 'fold_corner' | 'flipping' | 'read' }) => void;
    children: React.ReactNode;
  }

  const HTMLFlipBook: React.ForwardRefExoticComponent<
    FlipBookProps & React.RefAttributes<any>
  >;

  export default HTMLFlipBook;
}
