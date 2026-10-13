/**
 * Registers WordPress core blocks once, outside of WordPress.
 * `@wordpress/block-library` ships each block's block.json, save() and
 * deprecations, so serialize()/parse() here behave exactly like the editor.
 */
import { registerCoreBlocks } from '@wordpress/block-library';
import { getBlockType } from '@wordpress/blocks';

let registered = false;

export function ensureBlocks() {
  if (registered || getBlockType('core/paragraph')) {
    registered = true;
    return;
  }
  registerCoreBlocks();
  registered = true;
}
