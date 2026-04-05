# Linear

Linear project management integration for Vienna — issues, projects, cycles, and teams.

## Features

- **Feed canvas** — Home feed card showing filtered Linear issues with status, assignee, and priority filters. Select issues and launch agent workstreams directly from the feed.
- **Nav sidebar** — Browse issues grouped by status, priority, label, or project with the Linear logo icon.
- **Issues** — Create, search, update, delete, comment, and track sub-issues
- **Filtering** — By team, assignee, workflow state, priority, and full-text search
- **Projects & Cycles** — Browse projects, view active cycles, assign issues
- **Teams** — List teams, members, workflow states, and labels
- **Mutations** — Update title, description, priority, assignee, state, labels, estimates, and due dates

## Setup

### Option 1: OAuth (recommended)

Configure `linear_oauth_client_id` and `linear_oauth_client_secret` in the plugin's secure storage settings, then click "Connect" in the settings drawer.

### Option 2: API key

1. Go to [Linear Settings > API](https://linear.app/settings/api) and click **Create key**
2. Give it a label (e.g. "Vienna") and copy the key
3. Open the Linear settings drawer in Vienna's sidebar
4. Paste the key into the **API Token** field

Once configured, the feed card and nav sidebar will show your issues automatically.
