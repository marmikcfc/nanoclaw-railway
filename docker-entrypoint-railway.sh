#!/bin/bash
# Railway entrypoint: fix volume permissions, authenticate CLIs, and drop to non-root user
# The /data volume may be root-owned on first mount, so we fix ownership
# before starting the app as the node user.
# claude-code refuses --dangerously-skip-permissions when running as root.

set -e

# Fix ownership of the data volume (runs as root)
chown -R node:node /data 2>/dev/null || true

# Authenticate Composio CLI for the node user (needs writable session dir)
if [ -n "$COMPOSIO_API_KEY" ] && [ -n "$COMPOSIO_ORG_ID" ] && [ -n "$COMPOSIO_PROJECT_ID" ]; then
  gosu node composio login \
    --api-key "$COMPOSIO_API_KEY" \
    --org-id "$COMPOSIO_ORG_ID" \
    --project-id "$COMPOSIO_PROJECT_ID" 2>&1 || echo "[warn] Composio CLI login failed (non-fatal)"
fi

# Drop to node user and exec the CMD
exec gosu node "$@"
