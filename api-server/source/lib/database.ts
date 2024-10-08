import { getNodePostgresMigrator, loader } from 'gruber'
import postgres from 'postgres'
import { appConfig } from '../config.js'

export { default as createDebug } from 'debug'

export const useDatabase = loader(() =>
  postgres(appConfig.postgres.url.toString()),
)

export async function runMigrations(direction: string) {
  const directory = new URL('../migrations/', import.meta.url)
  const sql = useDatabase()

  try {
    const migrator = getNodePostgresMigrator({ sql, directory })
    if (direction === 'down') await migrator.down()
    else if (direction === 'up') await migrator.up()
    else throw new Error('Unknown migration direction')
  } finally {
    await sql.end()
  }
}
