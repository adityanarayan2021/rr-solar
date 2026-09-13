'use client';

import { track, type TrackEvent } from '@/lib/analytics';

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  event: TrackEvent;
  eventParams?: Record<string, string | number>;
};

/** Anchor that reports a conversion event before navigating. */
export default function TrackedLink({ event, eventParams, children, onClick, ...rest }: Props) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        track(event, eventParams);
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}
