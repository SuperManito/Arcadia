import siteConfig from '@generated/docusaurus.config'
import type * as PrismNamespace from 'prismjs'

export default function prismIncludeLanguages (
  PrismObject: typeof PrismNamespace,
): void {
  const {
    themeConfig: { prism },
  } = siteConfig
  const { additionalLanguages } = prism as { additionalLanguages: string[] }

  // Prism components work on the Prism instance on the window, while prism-
  // react-renderer uses its own Prism instance. We temporarily mount the
  // instance onto window, import components to enhance it, then remove it to
  // avoid polluting global namespace.
  // You can mutate PrismObject: registering plugins, deleting languages... As
  // long as you don't re-assign it
  // @ts-expect-error - globalThis is not defined
  globalThis.Prism = PrismObject

  additionalLanguages.forEach((lang) => {
    require(`prismjs/components/prism-${lang}`)
  })

  require('../prism/prism-prisma.js')

  // 手动定义类型并删除 Prism 属性
  type GlobalThisWithPrism = typeof globalThis & { Prism?: typeof PrismNamespace }
  delete (globalThis as GlobalThisWithPrism).Prism
}
