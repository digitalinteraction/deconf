#!/usr/bin/env npx tsx

import process from 'node:process'
import { useTokenService } from '../source/lib/mod.js'

const [subject] = process.argv.slice(2)

const usage = `
usage:
  ./scripts/dev_token.ts <subject>

info:
  Signs a JWT to use for local API development.
  It will sign a development app token if no subject,
  or sign a user token if "subject" is provided
`

if (process.argv.includes('--help') || !subject) {
  console.log(usage.trim())
  process.exit()
}

const tokens = useTokenService()

const expiration = new Date()
expiration.setHours(expiration.getHours() + 1)

console.log(await tokens.sign(parseInt(subject), 'admin', { expiration }))
