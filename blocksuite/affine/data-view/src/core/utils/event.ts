export function stopPropagation(event: Event) {
  event.stopPropagation();
}

/**
 * Whether the event originated from a clickable link (e.g. an `<a href>` in a
 * link cell). Clicking a link should follow it, not enter cell edit mode.
 */
export function isLinkClick(event: Event) {
  const target = event.target;
  return target instanceof Element && !!target.closest('a[href]');
}
