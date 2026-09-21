/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'This dependency is part of a circular relationship.',
      from: {},
      to: { circular: true }
    },
    {
      name: 'web-cannot-import-api',
      severity: 'error',
      comment: 'Apps/web cannot import from apps/api.',
      from: { path: '^apps/web' },
      to: { path: '^apps/api' }
    },
    {
      name: 'shared-cannot-import-apps',
      severity: 'error',
      comment: 'Packages/shared cannot import from apps.',
      from: { path: '^packages/shared' },
      to: { path: '^apps' }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default']
    }
  }
};
