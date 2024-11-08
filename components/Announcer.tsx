import React from 'react';

interface Props {
  message: string;
}

export default function Announcer({ message }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
} 