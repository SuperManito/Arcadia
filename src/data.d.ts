export interface Form {
  repo: string
  title: string
  type: string
  systemArch: string
  systemPlatform: string
  reproduce: string
  steps: string
  expected: string
  actual: string
  remarks: string
  functionContent: string
  functionalExpectations: string
}

export interface FormData {
  form: Form
  system: {
    arch: Array<{ label: string, value: string }>
    platform: Array<{ label: string, value: string }>
  }
}
