import React from 'react';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { Box, BoxProps } from '@5qtrs/box';

// --------------
// Exported Types
// --------------

export type BlogIconProps = {
  size?: number;
  color?: FusebitColor;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function BlogIcon({ size, color, expand, ...rest }: BlogIconProps) {
  size = !expand && !size ? 18 : size;
  return (
    <Box center middle expand={!size} {...rest}>
      <svg width={size || '100%'} height={size || '100%'} viewBox="0 0 22 22" fill="none">
        <path
          d="M20.17 1.06C19.4532 0.936534 18.7273 0.872981 18 0.87C15.5183 0.867966 13.0884 1.57957 11 2.92C8.90611 1.59717 6.47661 0.903031 3.99996 0.92C3.27261 0.922981 2.54677 0.986534 1.82996 1.11C1.59517 1.15048 1.38254 1.27346 1.23038 1.45679C1.07821 1.64013 0.996499 1.87177 0.999963 2.11V14.11C0.997821 14.2569 1.02809 14.4025 1.08861 14.5364C1.14914 14.6703 1.23843 14.7893 1.35014 14.8847C1.46184 14.9802 1.59322 15.0499 1.73492 15.0888C1.87662 15.1278 2.02515 15.135 2.16996 15.11C3.60298 14.8619 5.07116 14.9031 6.48803 15.2311C7.90489 15.5591 9.24179 16.1674 10.42 17.02L10.54 17.09H10.65C10.7609 17.1362 10.8798 17.16 11 17.16C11.1201 17.16 11.2391 17.1362 11.35 17.09H11.46L11.58 17.02C12.7499 16.1483 14.083 15.5203 15.5001 15.1734C16.9172 14.8264 18.3896 14.7674 19.83 15C19.9748 15.025 20.1233 15.0178 20.265 14.9788C20.4067 14.9399 20.5381 14.8702 20.6498 14.7747C20.7615 14.6793 20.8508 14.5603 20.9113 14.4264C20.9718 14.2925 21.0021 14.1469 21 14V2C20.9896 1.77215 20.9016 1.55471 20.7506 1.38374C20.5996 1.21277 20.3948 1.09854 20.17 1.06ZM9.99996 14.35C8.14985 13.3767 6.09048 12.8687 3.99996 12.87C3.66996 12.87 3.33996 12.87 2.99996 12.87V2.87C3.33302 2.85081 3.66691 2.85081 3.99996 2.87C6.13335 2.86764 8.22018 3.49369 9.99996 4.67V14.35ZM19 12.91C18.66 12.91 18.33 12.91 18 12.91C15.9094 12.9087 13.8501 13.4167 12 14.39V4.67C13.7797 3.49369 15.8666 2.86764 18 2.87C18.333 2.85081 18.6669 2.85081 19 2.87V12.91ZM20.17 17.06C19.4532 16.9365 18.7273 16.873 18 16.87C15.5183 16.868 13.0884 17.5796 11 18.92C8.91148 17.5796 6.4816 16.868 3.99996 16.87C3.27261 16.873 2.54677 16.9365 1.82996 17.06C1.69979 17.0807 1.57499 17.1268 1.46272 17.1959C1.35046 17.265 1.25296 17.3555 1.17583 17.4624C1.09869 17.5693 1.04345 17.6903 1.01327 17.8186C0.983085 17.9469 0.978563 18.0799 0.999963 18.21C1.05078 18.4697 1.20245 18.6986 1.42175 18.8467C1.64105 18.9948 1.9101 19.0499 2.16996 19C3.60298 18.7519 5.07116 18.7931 6.48803 19.1211C7.90489 19.4491 9.24179 20.0574 10.42 20.91C10.5893 21.0306 10.7921 21.0954 11 21.0954C11.2079 21.0954 11.4106 21.0306 11.58 20.91C12.7581 20.0574 14.095 19.4491 15.5119 19.1211C16.9288 18.7931 18.3969 18.7519 19.83 19C20.0898 19.0499 20.3589 18.9948 20.5782 18.8467C20.7975 18.6986 20.9491 18.4697 21 18.21C21.0214 18.0799 21.0168 17.9469 20.9867 17.8186C20.9565 17.6903 20.9012 17.5693 20.8241 17.4624C20.747 17.3555 20.6495 17.265 20.5372 17.1959C20.4249 17.1268 20.3001 17.0807 20.17 17.06Z"
          fill={color || FusebitColor.dark}
        />
      </svg>
    </Box>
  );
}
