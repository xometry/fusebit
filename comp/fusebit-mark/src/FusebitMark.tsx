import React from 'react';
import { Box, BoxProps } from '@5qtrs/box';
import { FusebitColor } from '@5qtrs/fusebit-color';

// --------------
// Exported Types
// --------------

export type FusebitMarkProps = {
  size?: number;
  color?: FusebitColor;
} & BoxProps;

// -------------------
// Exported Components
// -------------------

export function FusebitMark({ size, color, expand, style, ...rest }: FusebitMarkProps) {
  size = !expand && !size ? 50 : size;
  return (
    <Box center middle expand={!size} {...rest}>
      <svg
        width={size || '100%'}
        height={size || '100%'}
        viewBox="0 0 1415 1415"
        fillRule="evenodd"
        clipRule="evenodd"
        strokeLinejoin="round"
        strokeMiterlimit="1.41421"
      >
        <g transform="matrix(0.707107,-0.707107,0.707107,0.707107,0,707.107)">
          <path
            d="M924.863,0C966.333,0.001 1000,33.668 1000,75.137L1000,924.863C1000,966.332 966.332,1000 924.863,1000L75.137,1000C33.668,1000 0,966.332 0,924.863L0,75.137C0,33.668 33.667,0.001 75.137,0L924.863,0ZM155,770C196.394,770 230,803.606 230,845C230,886.394 196.394,920 155,920C113.606,920 80,886.394 80,845C80,803.606 113.606,770 155,770ZM850,920L850,919.835C889.066,917.259 920,884.713 920,845C920,805.287 889.066,772.741 850,770.165L850,770L380,770L380,770.165C340.934,772.741 310,805.287 310,845C310,884.713 340.934,917.259 380,919.835L380,920L850,920ZM850,690L850,689.835C889.066,687.259 920,654.713 920,615C920,575.287 889.066,542.741 850,540.165L850,540L150,540L150,540.165C110.934,542.741 80,575.287 80,615C80,654.713 110.934,687.259 150,689.835L150,690L850,690ZM850,460L850,459.835C889.066,457.259 920,424.713 920,385C920,345.287 889.066,312.741 850,310.165L850,310L150,310L150,310.165C110.934,312.741 80,345.287 80,385C80,424.713 110.934,457.259 150,459.835L150,460L850,460ZM845,80C886.394,80 920,113.606 920,155C920,196.394 886.394,230 845,230C803.606,230 770,196.394 770,155C770,113.606 803.606,80 845,80ZM620,230L620,229.835C659.066,227.259 690,194.713 690,155C690,115.287 659.066,82.741 620,80.165L620,80L150,80L150,80.165C110.934,82.741 80,115.287 80,155C80,194.713 110.934,227.259 150,229.835L150,230L620,230Z"
            fill={color || FusebitColor.red}
          />
        </g>
      </svg>
    </Box>
  );
}
