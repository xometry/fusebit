import React, { useState } from 'react';
import { request } from '@5qtrs/request';
import { Box } from '@5qtrs/box';
import { MediaQuery, MediaType } from '@5qtrs/media-query';
import { FusebitButton } from '@5qtrs/fusebit-button';
import { FusebitTextField, FusebitTextFieldButton, FusebitTextFieldButtonProps } from '@5qtrs/fusebit-input';
import { FusebitColor } from '@5qtrs/fusebit-color';

// ------------------
// Internal Constants
// ------------------

const emailRegex = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i; // tslint:disable-line
const googleSheetUrl =
  'https://script.google.com/macros/s/AKfycbwvCP7_RW163ccBtVR5T6WRwkCHPE-3NO-D7-lyoG5Ce1DB9lc/exec';
const placeHolderDefault = 'Enter Your Email';
const buttonTextDefault = "Let's Talk";
const errorTextDefault = 'Valid Email Required';
const gaCategoryDefault = 'CTA';
const gaActionDefault = 'Form Fill';
const gaLabelDefault = 'Solution';

// ------------------
// Internal Functions
// ------------------

function sendEmail(email: string) {
  request({
    method: 'POST',
    url: `${googleSheetUrl}?Email=${email}`,
  });
}

// -------------------
// Internal Components
// -------------------

function MobileVersion({
  width,
  size,
  placeholder,
  buttonText,
  errorText,
  gaCategory,
  gaAction,
  gaLabel,
  onTextSubmit,
  onChange,
  onClick,
  ...rest
}: FusebitEmailProps) {
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);

  function onChangeWrapped(event: any) {
    if (onChange) {
      onChange(event);
      if (event.defaultPrevented) {
        return;
      }
    }

    setValue(event.target.value);
    setInvalid(false);
  }

  function onClickWrapped(event: any) {
    if (onClick) {
      onClick(event);
      if (event.defaultPrevented) {
        return;
      }
    }

    if (value && emailRegex.test(value)) {
      sendEmail(value);
      if (onTextSubmit) {
        onTextSubmit(value);
      }
    } else {
      setInvalid(true);
    }
  }

  return (
    <Box vertical width={width || '100%'} center {...rest}>
      <FusebitTextField
        placeholder={placeholder || placeHolderDefault}
        invalid={invalid}
        errorText={errorText || errorTextDefault}
        size={size || 30}
        width="100%"
        onChange={onChangeWrapped}
      />
      <Box height={10} />
      <FusebitButton
        width="100%"
        gaCategory={gaCategory || gaCategoryDefault}
        gaAction={gaAction || gaActionDefault}
        gaLabel={gaLabel || gaLabelDefault}
        onClick={onClickWrapped}
      >
        {buttonText || buttonTextDefault}
      </FusebitButton>
    </Box>
  );
}

function NonMobileVersion({
  width,
  size,
  placeholder,
  buttonText,
  errorText,
  gaCategory,
  gaAction,
  gaLabel,
  onTextSubmit,
  ...rest
}: FusebitEmailProps) {
  function onTextSubmitWrapped(email: string) {
    sendEmail(email);
    if (onTextSubmit) {
      onTextSubmit(email);
    }
  }

  return (
    <FusebitTextFieldButton
      width={width || '100%'}
      placeholder={placeholder || placeHolderDefault}
      size={size || 36}
      buttonText={buttonText || buttonTextDefault}
      errorText={errorText || errorTextDefault}
      onTextSubmit={onTextSubmitWrapped}
      regexValidator={emailRegex}
      buttonDisabledColor={FusebitColor.red}
      gaCategory={gaCategory || gaCategoryDefault}
      gaAction={gaAction || gaActionDefault}
      gaLabel={gaLabel || gaLabelDefault}
      {...rest}
    />
  );
}

// --------------
// Exported Types
// --------------

export type FusebitEmailProps = {} & FusebitTextFieldButtonProps;

// -------------------
// Exported Components
// -------------------

export function FusebitEmail(props: FusebitEmailProps) {
  return (
    <>
      <MediaQuery mediaType={MediaType.mobile}>
        <MobileVersion {...props} />
      </MediaQuery>
      <MediaQuery mediaType={MediaType.allExceptMobile}>
        <NonMobileVersion {...props} />
      </MediaQuery>
    </>
  );
}