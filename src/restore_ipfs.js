'use strict'
const Mongo = require('./mongo')
const sqlite3 = require('sqlite3')
const mongoUrl = 'mongodb://127.0.0.1:27017'
const dbName = 'priveos2'
const mongo = new Mongo(mongoUrl, dbName)
const ipfsClient = require('ipfs-http-client')
const assert = require('assert')
const _ = require('underscore')
const Bluebird = require('bluebird')
Bluebird.promisifyAll(sqlite3)

const CHUNK_SIZE = 500

const config = {
  ipfsConfig: {
    host: 'localhost',
    port: '5001',
    protocol: 'http',
  }
}
const ipfs = ipfsClient(config.ipfsConfig.host, config.ipfsConfig.port, {'protocol': config.ipfsConfig.protocol})

async function main() {
  const sqlite = new sqlite3.Database('priveos-ipfs-snapshot.sqlite')
  const db = await mongo.db()
  
  let offset = 0
  let count = 0
  while(true) {
    const rows = await sqlite.allAsync("select * from ipfs order by hash limit ? offset ?",[CHUNK_SIZE, offset])  
    
    if(!rows.length) {
      break
    }
    
    const files = rows.map(row => Buffer.from(row.data))
    const results = await ipfs.add(files, {pin: true})
    for (const [row, result] of _.zip(rows, results)) {
      // console.log(`row.hash: ${row.hash} result.hash: ${result.hash}`)
      assert.equal(row.hash, result.hash)
      count++
    }
    
    offset += CHUNK_SIZE
    // console.log("Finished! offset: ", offset)
  }
  
  console.log("Total number of hashes: ", count)

  sqlite.close()
  mongo._connection.close()
}

main()