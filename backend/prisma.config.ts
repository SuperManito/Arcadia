import { defineConfig } from 'prisma/config'
import 'dotenv/config'

export default defineConfig({
  schema: './db/prisma/models/',
  datasource: {
    url: 'file:../../config/config.db',
  },
})
