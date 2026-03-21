import { MongoClient, Db } from 'mongodb'

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DATABASE || 'smartpark'

let client: MongoClient
let db: Db

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined
}

async function getDb(): Promise<Db> {
  if (!uri) throw new Error('MONGODB_URI is not configured in environment variables.')
  if (db) return db

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClient) {
      global._mongoClient = new MongoClient(uri)
    }
    client = global._mongoClient
  } else {
    if (!client) client = new MongoClient(uri)
  }

  if (!db) {
    await client.connect()
    db = client.db(dbName)
  }
  return db
}

export { getDb }
