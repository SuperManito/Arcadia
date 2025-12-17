import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: './db/prisma/models/',
  datasource: {
    url: 'file:../../config/config.db',
  },
})
