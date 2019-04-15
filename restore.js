'use strict'
const Mongo = require('./mongo')
const sqlite3 = require('sqlite3')
const mongoUrl = 'mongodb://127.0.0.1:27017'
const dbName = 'priveos2'
const mongo = new Mongo(mongoUrl, dbName)
const ipfsClient = require('ipfs-http-client')
const assert = require('assert')
const Bluebird = require('bluebird')
Bluebird.promisifyAll(sqlite3)

const config = {
  ipfsConfig: {
    host: 'localhost',
    port: '5001',
    protocol: 'http',
  }
}
const ipfs = ipfsClient(config.ipfsConfig.host, config.ipfsConfig.port, {'protocol': config.ipfsConfig.protocol})

async function main() {
  const sqlite = new sqlite3.Database('priveos-snapshot.sqlite')
  const db = await mongo.db()
  
  const index_state = await db.collection('index_state').findOne()
  sqlite.run("insert into index_state (data) values (?)", [JSON.stringify(index_state)])
  await sqlite.eachAsync("select * from index_state limit 1", (err, row) => {
    db.collection('index_state').replaceOne({}, JSON.parse(row.data), {upsert: true})
    // console.log("row: ", row)
  })
  
  await sqlite.eachAsync("select * from store", (err, row) => {
    db.collection('store').insertOne(JSON.parse(row.data))
    // console.log("row: ", row.data)
  })
  
  await sqlite.eachAsync("select * from accessgrant", (err, row) => {
    db.collection('accessgrant').insertOne(JSON.parse(row.data))
    // console.log("row: ", row)
  })
  
  await sqlite.eachAsync("select * from ipfs", async (err, row) => {
    const results = await ipfs.add(Buffer.from(row.data), {pin: true})
    const hash = results[0].hash
    assert.equal(hash, row.hash)
  })
  
  console.log("Finished!")

  sqlite.close()
  mongo._connection.close()
}

main()