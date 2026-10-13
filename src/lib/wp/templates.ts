/**
 * Block-theme templates, defined as block trees and serialized with Gutenberg's
 * own serializer so they are valid by construction. The preview renders through
 * the exact same template markup that goes into the exported theme.
 */
import type { BlockNode } from '../types';
import { toMarkup } from './markup';

export const HOME_SLUG = 'home';

const part = (slug: string, tagName: string): BlockNode => ({ name: 'core/template-part', attributes: { slug, tagName } });

const main = (attrs: Record<string, unknown>, inner: BlockNode[]): BlockNode => ({
  name: 'core/group',
  attributes: { tagName: 'main', align: 'full', ...attrs },
  innerBlocks: inner,
});

const padded = {
  style: { spacing: { margin: { top: '0' }, padding: { top: 'var:preset|spacing|70', bottom: 'var:preset|spacing|70' } } },
  layout: { type: 'constrained' },
};

let cache: Record<string, string> | null = null;

function build() {
  const page = [
    part('header', 'header'),
    main({ style: { spacing: { margin: { top: '0' } } }, layout: { type: 'default' } }, [
      { name: 'core/post-content', attributes: { align: 'full', style: { spacing: { blockGap: '0' } }, layout: { type: 'constrained' } } },
    ]),
    part('footer', 'footer'),
  ];
  const single = [
    part('header', 'header'),
    main(padded, [
      { name: 'core/post-title', attributes: { level: 1 } },
      { name: 'core/post-content', attributes: { layout: { type: 'constrained' } } },
    ]),
    part('footer', 'footer'),
  ];
  const index = [
    part('header', 'header'),
    main(padded, [
      {
        name: 'core/query',
        attributes: { queryId: 1, query: { perPage: 10, pages: 0, offset: 0, postType: 'post', order: 'desc', orderBy: 'date', inherit: true } },
        innerBlocks: [
          {
            name: 'core/post-template',
            innerBlocks: [
              { name: 'core/post-title', attributes: { isLink: true } },
              { name: 'core/post-excerpt' },
            ],
          },
          {
            name: 'core/query-pagination',
            innerBlocks: [{ name: 'core/query-pagination-previous' }, { name: 'core/query-pagination-numbers' }, { name: 'core/query-pagination-next' }],
          },
        ],
      },
    ]),
    part('footer', 'footer'),
  ];
  return { page: toMarkup(page), single: toMarkup(single), index: toMarkup(index) };
}

export function templates() {
  return (cache ??= build());
}
