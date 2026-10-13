// Stub for @wordpress/vips: client-side image processing (13 MB of WASM) is only
// used by the editor's media upload pipeline, which this builder doesn't run.
export function vipsConvertImageFormat(): never { throw new Error('vips unavailable'); }
export function vipsCompressImage(): never { throw new Error('vips unavailable'); }
export function vipsHasTransparency(): never { throw new Error('vips unavailable'); }
export function vipsResizeImage(): never { throw new Error('vips unavailable'); }
export function vipsRotateImage(): never { throw new Error('vips unavailable'); }
export function vipsCancelOperations() {}
export function terminateVipsWorker() {}
export default {};
