module.exports = {
  types: [
    { value: 'feat', name: 'feat:     增加新功能' },
    { value: 'fix', name: 'fix:      修复bug' },
    { value: 'docs', name: 'docs:     文档/注释' },
    { value: 'style', name: 'style:    代码风格相关不影响运行结果' },
    { value: 'refactor', name: 'refactor: 代码重构（不包括 bug 修复、功能新增）' },
    { value: 'perf', name: 'perf:     优化/性能提升' },
    { value: 'test', name: 'test:     添加、修改测试用例' },
    { value: 'build', name: 'build:    构建/打包 流程' },
    { value: 'workflow', name: 'workflow:    工作流改进' },
    { value: 'ci', name: 'ci:       修改 CI 配置、脚本' },
    { value: 'chore', name: 'chore:    依赖更新/脚手架配置修改等' },
    { value: 'revert', name: 'revert:   撤销修改' },
    { value: 'wip', name: 'wip:   开发中' }
  ],
  messages: {
    type: '遵循 Angular 提交规范！\n选择你要提交的类型：',
    customScope: '请输入 scope：',
    subject: '填写简短的变更描述：\n',
    body: '填写更加详细的变更描述（可选）。使用 "|" 换行：\n',
    breaking: '列举非兼容性重大的变更（可选）：\n',
    footer: '列举出所有变更的 ISSUES CLOSED（可选）。 例如: #31, #34：\n',
    confirmCommit: '确认提交？'
  },
  allowBreakingChanges: ['feat', 'fix'],
  subjectLimit: 100,
  breaklineChar: '|'
};