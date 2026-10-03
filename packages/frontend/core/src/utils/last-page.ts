const key = (workspaceId: string) => `last_page_id:${workspaceId}`;

/**
 * The last doc opened in each workspace, so switching workspaces lands where
 * you left off instead of on All docs.
 */
export function getLastPageId(workspaceId: string): string | null {
  try {
    return localStorage.getItem(key(workspaceId));
  } catch {
    return null;
  }
}

export function setLastPageId(workspaceId: string, pageId: string) {
  try {
    localStorage.setItem(key(workspaceId), pageId);
  } catch {
    // storage unavailable, switching workspaces falls back to All docs
  }
}
