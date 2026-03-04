import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Options } from '@plugin-web-update-notification/core';
type HTMLTags = {
  headTags: HtmlBasicTag[];
  bodyTags: HtmlBasicTag[];
};
import {
  DIRECTORY_NAME,
  INJECT_SCRIPT_FILE_NAME,
  INJECT_SCRIPT_TAG_ID,
  INJECT_STYLE_FILE_NAME,
  JSON_FILE_NAME,
  NOTIFICATION_ANCHOR_CLASS_NAME,
  generateJSONFileContent,
  generateJsFileContent,
  getFileHash,
  getVersion,
  get__Dirname,
} from '@plugin-web-update-notification/core';
import { HtmlBasicTag, RsbuildPlugin, RsbuildPluginAPI } from '@rsbuild/core';

// /**
//  * Get the version of the current Vite
//  *
//  * if the viteVersion is undefined, we assume that vite is less than v3.0（after v3.0, vite export version）
//  */
// async function getViteVersion(): Promise<string | undefined> {
//   return await import('vite').then(({ version }) => version)
// }

/**
 * It injects the hash into the HTML, and injects the notification anchor and the stylesheet and the
 * script into the HTML
 * @param {string} html - The original HTML of the page
 * @param {string} version - The hash of the current commit
 * @param {Options} options - Options
 * @param cssFileHash
 * @param jsFileHash
 * @returns The html of the page with the injected script and css.
 */
function injectPluginHtml(
  html: string,
  version: string,
  options: Options,
  { cssFileHash, jsFileHash }: { jsFileHash: string; cssFileHash: string }
) {
  const { customNotificationHTML, hiddenDefaultNotification, injectFileBase = '' } = options;

  const cssLinkHtml =
    customNotificationHTML || hiddenDefaultNotification
      ? ''
      : `<link rel="stylesheet" href="${injectFileBase}${DIRECTORY_NAME}/${INJECT_STYLE_FILE_NAME}.${cssFileHash}.css">`;
  let res = html;

  res = res.replace(
    '<head>',
    `<head>
    ${cssLinkHtml}
    <script data-id="${INJECT_SCRIPT_TAG_ID}" data-v="${version}" src="${injectFileBase}${DIRECTORY_NAME}/${INJECT_SCRIPT_FILE_NAME}.${jsFileHash}.js"></script>`
  );

  if (!hiddenDefaultNotification) {
    res = res.replace('</body>', `<div class="${NOTIFICATION_ANCHOR_CLASS_NAME}"></div></body>`);
  }

  return res;
}

export function webUpdateNotice(options: Options = {}, when?: 'dev' | 'preview' | 'build'): RsbuildPlugin {
  const { versionType, customVersion, silence } = options;
  let version = '';
  if (versionType === 'custom') version = getVersion(versionType, customVersion!);
  else version = getVersion(versionType!);

  /** inject script file hash */
  let jsFileHash = '';
  /** inject css file hash */
  let cssFileHash = '';

  const cssFileSource = readFileSync(`${resolve(get__Dirname(), INJECT_STYLE_FILE_NAME)}.css`, 'utf8').toString();
  cssFileHash = getFileHash(cssFileSource);

  let jsFileSource = '';

  return {
    name: 'vue-rsbuild-web-update-notice',
    apply: (config,context) =>{
      return when === undefined || context.action === when
    },
    setup(api: RsbuildPluginAPI) {
      const config = api.getRsbuildConfig();
      if (options.injectFileBase === undefined) options.injectFileBase = config.server?.base || '/';

      jsFileSource = generateJsFileContent(
        readFileSync(`${resolve(get__Dirname(), INJECT_SCRIPT_FILE_NAME)}.js`, 'utf8').toString(),
        version,
        options
      );
      jsFileHash = getFileHash(jsFileSource);

      api.modifyHTML((html: string) => {
        return injectPluginHtml(html, version, options, { jsFileHash, cssFileHash });
      });
      api.modifyHTMLTags(({ headTags, bodyTags }: HTMLTags) => {
        return { headTags, bodyTags };
      });
      api.processAssets({ stage: 'additional' }, ({ sources, compilation }) => {
        compilation.emitAsset(`${DIRECTORY_NAME}/${JSON_FILE_NAME}.json`, new sources.RawSource(generateJSONFileContent(version, silence)));

        compilation.emitAsset(`${DIRECTORY_NAME}/${INJECT_STYLE_FILE_NAME}.${cssFileHash}.css`, new sources.RawSource(cssFileSource));

        compilation.emitAsset(`${DIRECTORY_NAME}/${INJECT_SCRIPT_FILE_NAME}.${jsFileHash}.js`, new sources.RawSource(jsFileSource));
      });
    },
  };
}
