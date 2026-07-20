const branch = process.env.GITHUB_REF_NAME ?? '';
const isPrereleaseBranch = branch === 'beta' || branch === 'v2-beta';

/**
 * @type {import('semantic-release').GlobalConfig}
 */
export default {
  branches: [
    'main',
    { name: 'beta', prerelease: true },
    { name: 'v2-main', range: '2.x', channel: 'v2-latest' },
    { name: 'v2-beta', prerelease: true },
  ],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          { scope: 'no-release', release: false },
          { type: 'release', release: 'patch' },
        ],
        parserOpts: {
          noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES'],
        },
        mergeCommits: true,
        mergeCommitParser: 'conventionalCommits',
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
      },
    ],
    // Skip CHANGELOG.md updates on prerelease branches to avoid duplicate
    // entries when the same commits are later released on a stable branch.
    ...(isPrereleaseBranch ? [] : ['@semantic-release/changelog']),
    '@semantic-release/npm',
    '@semantic-release/github',
    '@semantic-release/git',
  ],
};
