import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = process.argv[2] || pkg.version;
const tag = process.argv[3] || `v${version}`;
const repo = process.env.GITHUB_REPOSITORY || 'madhusudan-kulkarni/media-grab';
const addonId = 'mediagrab@madhusudan.dev';

const updateLink = `https://github.com/${repo}/releases/download/${tag}/mediagrab-${version}.xpi`;

const manifest = {
  addons: {
    [addonId]: {
      updates: [
        {
          version,
          update_link: updateLink,
        },
      ],
    },
  },
};

fs.writeFileSync('updates.json', `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`updates.json -> ${version} (${updateLink})`);
