import React from 'react';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { Box, BoxProps } from '@5qtrs/box';

// --------------
// Exported Types
// --------------

export type SlackIconProps = {
  size?: number;
  color?: FusebitColor;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function SlackIcon({ size, color, expand, ...rest }: SlackIconProps) {
  size = !expand && !size ? 26 : size;
  return (
    <Box center middle expand={!size} {...rest}>
      <svg width={size || '100%'} height={size || '100%'} viewBox="0 0 57 57" fill="none">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M20.857 0C17.7124 0.00232416 15.1675 2.55425 15.1698 5.69884C15.1675 8.84343 17.7147 11.3954 20.8593 11.3977H26.5489V5.70116C26.5512 2.55657 24.0039 0.00464832 20.857 0C20.8593 0 20.8593 0 20.857 0V0ZM20.857 15.2H5.68955C2.54496 15.2023 -0.00231781 17.7543 6.35164e-06 20.8988C-0.00464197 24.0434 2.54264 26.5954 5.68722 26.6H20.857C24.0016 26.5977 26.5489 24.0457 26.5465 20.9012C26.5489 17.7543 24.0016 15.2023 20.857 15.2V15.2Z"
          fill="white"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M56.8859 20.8988C56.8882 17.7543 54.341 15.2023 51.1964 15.2C48.0518 15.2023 45.5045 17.7543 45.5068 20.8988V26.6H51.1964C54.341 26.5977 56.8882 24.0457 56.8859 20.8988ZM41.7161 20.8988V5.69884C41.7184 2.55657 39.1735 0.00464832 36.0289 0C32.8843 0.00232416 30.337 2.55425 30.3394 5.69884V20.8988C30.3347 24.0434 32.882 26.5954 36.0266 26.6C39.1712 26.5977 41.7184 24.0457 41.7161 20.8988Z"
          fill="white"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M36.027 57C39.1716 56.9977 41.7189 54.4458 41.7165 51.3012C41.7189 48.1566 39.1716 45.6046 36.027 45.6023H30.3374V51.3012C30.3351 54.4434 32.8824 56.9954 36.027 57ZM36.027 41.7977H51.1968C54.3414 41.7954 56.8887 39.2434 56.8864 36.0988C56.891 32.9543 54.3437 30.4023 51.1991 30.3977H36.0293C32.8847 30.4 30.3374 32.9519 30.3397 36.0965C30.3374 39.2434 32.8824 41.7954 36.027 41.7977V41.7977Z"
          fill="white"
        />
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M0.00024573 36.0987C-0.00207843 39.2433 2.5452 41.7953 5.68979 41.7976C8.83437 41.7953 11.3817 39.2433 11.3793 36.0987V30.3999H5.68979C2.5452 30.4022 -0.00207843 32.9541 0.00024573 36.0987ZM15.17 36.0987V51.2988C15.1654 54.4434 17.7127 56.9954 20.8572 57C24.0018 56.9977 26.5491 54.4457 26.5468 51.3011V36.1034C26.5514 32.9588 24.0042 30.4069 20.8596 30.4022C17.7127 30.4022 15.1677 32.9541 15.17 36.0987C15.17 36.1011 15.17 36.0987 15.17 36.0987Z"
          fill="white"
        />
      </svg>
    </Box>
  );
}