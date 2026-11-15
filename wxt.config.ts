import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';

export default defineConfig({
  srcDir: 'src',
  outDir: 'output',
  manifestVersion: 3,
  vite: () => ({
    plugins: [react()],
  }),
  hooks: {
    'build:manifestGenerated': (_wxt, manifest) => {
      // WXT forces the small options window; this page is a full settings view.
      if (manifest.options_ui) manifest.options_ui.open_in_tab = true;
    },
  },
  zip: {
    artifactTemplate: '{{name}}-{{browser}}.zip',
  },
  manifest: {
    name: 'MediaGrab',
    description: 'Save images, GIFs and videos from any page',
    permissions: ['downloads', 'contextMenus', 'activeTab', 'scripting', 'storage'],
    host_permissions: ['<all_urls>'],
    commands: {
      'open-batch-modal': {
        suggested_key: {
          default: 'Alt+Shift+I',
          mac: 'Alt+Shift+I',
        },
        description: 'Open MediaGrab Batch Downloader',
      },
      'toggle-select-mode': {
        suggested_key: {
          default: 'Alt+Shift+S',
          mac: 'Alt+Shift+S',
        },
        description: 'Toggle MediaGrab selection mode',
      },
    },
    action: {
      default_title: 'MediaGrab',
      default_icon: {
        16: 'icon-16.png',
        32: 'icon-32.png',
        48: 'icon-48.png',
        128: 'icon-128.png',
      },
    },
    options_ui: {
      open_in_tab: true,
      page: 'options.html',
    },
    icons: {
      16: 'icon-16.png',
      32: 'icon-32.png',
      48: 'icon-48.png',
      128: 'icon-128.png',
    },
    browser_specific_settings: {
      gecko: {
        id: 'mediagrab@madhusudan.dev',
        data_collection_permissions: {
          required: ['none'],
        },
      } as any,
    },
  },
});
