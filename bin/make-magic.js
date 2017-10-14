#!/usr/bin/env node

if (process.argv.length<3) {
  console.error('usage: make-magic <number of bytes>')
  process.exit(1)
}

process.stdout.write(
  require('crypto').randomBytes(+process.argv[2])
)
