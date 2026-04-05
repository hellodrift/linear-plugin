import { definePlugin } from '@tryvienna/sdk';
import { linearIntegration } from './integration';
import { linearIssueEntity } from './entities';
import { LinearFeed } from './ui/LinearFeed';
import { LinearNavSection } from './ui/LinearNavSection';
import { LinearPluginDrawer } from './ui/LinearPluginDrawer';

const LINEAR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="currentColor"><path d="M1.22541 61.5228c-.97834-1.6499-.97834-3.7397 0-5.3896L29.5856 6.6073c.9784-1.6499 2.7833-2.6573 4.7401-2.6573h56.7203c1.9569 0 3.7618 1.0074 4.7402 2.6573l28.3602 49.5259c.9783 1.6499.9783 3.7397 0 5.3896L96.0462 93.3927c-.9784 1.6499-2.7833 2.6573-4.7402 2.6573H34.3257c-1.9568 0-3.7617-1.0074-4.7401-2.6573L1.22541 61.5228Z" fill="none"/><path d="M5.4 58.8L34.84 7.19c.77-1.3 2.19-2.09 3.73-2.09h44.66c1.54 0 2.96.8 3.73 2.09l15.72 27.57-24.28 24.28c-3.62-3.29-8.43-5.3-13.74-5.3-11.22 0-20.33 9.11-20.33 20.33 0 5.31 2.01 10.12 5.3 13.74L32.57 75.64c-5.41-6.2-8.7-14.32-8.7-23.14 0-19.44 15.76-35.2 35.2-35.2 8.82 0 16.94 3.29 23.14 8.7L97.89 10.32c-.73-.92-1.82-1.45-2.98-1.45H35.09c-.98 0-1.88.5-2.38 1.33L4.18 57.76c-.5.82-.5 1.83 0 2.66L24.5 94.06c.5.82 1.4 1.33 2.38 1.33h24.49L5.4 58.8ZM64.67 85.06c7.64 0 13.84-6.2 13.84-13.84S72.31 57.38 64.67 57.38s-13.84 6.2-13.84 13.84 6.2 13.84 13.84 13.84Z"/></svg>';

export const linearPlugin = definePlugin({
  id: 'linear',
  name: 'Linear',
  description: 'Linear project management — issues, projects, and cycles.',
  icon: { svg: LINEAR_SVG },

  integrations: [linearIntegration],
  entities: [linearIssueEntity],

  canvases: {
    feed: {
      component: LinearFeed,
      label: 'Linear',
      description:
        'Shows filtered Linear issues. Use when the user wants to see their Linear backlog or issue list.',
      priority: 40,
    },
    'nav-sidebar': {
      component: LinearNavSection,
      label: 'Linear',
      priority: 50,
    },
    drawer: {
      component: LinearPluginDrawer,
      label: 'Linear',
    },
  },
});

export { linearIntegration } from './integration';
export { linearIssueEntity } from './entities';
export { registerLinearSchema } from './schema';
