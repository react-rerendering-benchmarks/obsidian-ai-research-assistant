// adatpated from: https://dev.to/deepcodes/automatic-scrolling-for-chat-app-in-1-line-of-code-react-hook-3lm1

import { useEffect, useRef, useState } from 'react';
export const useChatScroll = <T,>(scrollActivator: T): [React.MutableRefObject<HTMLDivElement | undefined>, React.Dispatch<React.SetStateAction<boolean>>] => {
  const ref = useRef<HTMLDivElement>();
  const shouldScroll = useRef(true);
  useEffect(() => {
    if (typeof ref?.current !== 'undefined' && shouldScroll.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [scrollActivator, shouldScroll.current]);
  return [ref, setShouldScroll];
};