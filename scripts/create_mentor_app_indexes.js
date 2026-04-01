/*
  Script: create_mentor_app_indexes.js
  Usage: set MONGO_URI and run with `node scripts/create_mentor_app_indexes.js`
  This will create the `mentor_applications` collection (if missing) and add indexes.
*/
const { MongoClient } = require('mongodb')

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/devlink'
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  try {
    await client.connect()
    const dbName = client.db().databaseName
    console.log(`Connected to ${uri} (db=${dbName})`)

    const db = client.db()
    const collName = 'mentor_applications'

    const collections = await db.listCollections({ name: collName }).toArray()
    if (collections.length === 0) {
      console.log(`Creating collection: ${collName}`)
      await db.createCollection(collName)
    } else {
      console.log(`Collection ${collName} already exists`)
    }

    const coll = db.collection(collName)

    console.log('Creating index: { userId: 1, status: 1 }')
    await coll.createIndex({ userId: 1, status: 1 })

    console.log('Creating index: { status: 1, submittedAt: -1 }')
    await coll.createIndex({ status: 1, submittedAt: -1 })

    console.log('Creating index: { "userId.email": 1 }')
    try {
      // Note: indexing userId.email only makes sense if you embed user docs here or store userId.email as a denormalized field.
      await coll.createIndex({ 'userId.email': 1 })
    } catch (err) {
      console.warn('Could not create index userId.email — this is expected if userId is an ObjectId. Consider denormalizing user email into the application document if you need this index.')
    }

    console.log('Indexes created successfully')
  } catch (err) {
    console.error('Error while creating indexes:', err)
    process.exitCode = 1
  } finally {
    await client.close()
  }
}

if (require.main === module) main()
