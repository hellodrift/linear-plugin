# Linear

Linear project management integration — issues, projects, cycles, and teams.

## Features

- **Feed canvas** — Home feed card showing filtered Linear issues with status, assignee, and priority filters. Select issues and launch agent workstreams directly from the feed.
- **Issues** — Create, search, update, delete, comment, and track sub-issues
- **Filtering** — By team, assignee, workflow state, priority, and full-text search
- **Projects & Cycles** — Browse projects, view active cycles, assign issues
- **Teams** — List teams, members, workflow states, and labels
- **Mutations** — Update title, description, priority, assignee, state, labels, estimates, and due dates

## Setup

Authenticate via OAuth (recommended) or a Linear API key.

**OAuth:** Configure `linear_oauth_client_id` and `linear_oauth_client_secret` in the plugin's secure storage settings.

**API key fallback:** Add an `api_token` from your Linear account settings.
