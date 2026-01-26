# Custom Local Modifications

This directory contains custom local modifications that should NOT be overwritten during upstream merges.

## Files

- `metamcp-handler.ts` - Custom handler for MetaMCP server connections

## How to Protect During Merges

When merging from upstream, use the following git strategy:

```bash
# Before merging, stash or backup this directory
git stash push -m "custom modifications" -- apps/frontend/src/main/custom/

# Perform the merge
git merge upstream/main

# Restore custom modifications
git stash pop
```

Or add to `.git/info/exclude`:
```
apps/frontend/src/main/custom/
```

## MetaMCP Handler

The `metamcp-handler.ts` provides custom connection testing for MetaMCP servers.
It handles:
- SSE (Server-Sent Events) responses
- Various HTTP status codes that MetaMCP might return
- Custom authentication headers

To use with a MetaMCP server, ensure the server name or URL contains "metamcp" or "meta-mcp".
