import { getPostgresMigrator, loader } from 'gruber'

import { useDatabase } from './globals.js'

export async function runMigrations(direction: string) {
  const directory = new URL('../migrations/', import.meta.url)
  const sql = useDatabase()

  try {
    const migrator = getPostgresMigrator({ sql, directory })
    if (direction === 'down') await migrator.down()
    else if (direction === 'up') await migrator.up()
    else throw new Error('Unknown migration direction')
  } finally {
    await sql.end()
  }
}
