'use strict'
const Mongo = require('./mongo')
const sqlite3 = require('sqlite3')
const mongoUrl = 'mongodb://127.0.0.1:27017'
const dbName = 'priveos'
const mongo = new Mongo(mongoUrl, dbName)
const ipfsClient = require('ipfs-http-client')

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
  sqlite.run("CREATE TABLE IF NOT EXISTS ipfs (hash TEXT UNIQUE, data TEXT)")
  sqlite.run("CREATE TABLE IF NOT EXISTS store (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT)")
  sqlite.run("CREATE TABLE IF NOT EXISTS accessgrant (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT)")

  let blockNumber = 1
  while(true) {
    const blocks = await db.collection('store').find({"blockNumber": { $gt: blockNumber}}).sort({"blockNumber": 1}).limit(100).toArray()
    console.log("Store blocks.length: ", blocks.length)
    if(!blocks.length) {
      break
    }
    
    for(const block of blocks) {
      // console.log("Block: ", JSON.stringify(block))
      blockNumber = block.blockNumber
      // console.log("blockNumber: ", blockNumber)
      const hash = block.data.data
      // console.log(`hash: "${hash}"`)
      const res = await ipfs.get(`/ipfs/${hash}`)
      const data = res[0].content.toString('utf8')
      // console.log("data: ", data)
      sqlite.run("insert into ipfs (hash, data) values (?, ?)", [hash, data])
      sqlite.run("insert into store (data) values (?)", [JSON.stringify(block)])
    }
  }
  
  blockNumber = 1
  while(true) {
    const blocks = await db.collection('accessgrant').find({"blockNumber": { $gt: blockNumber}}).sort({"blockNumber": 1}).limit(100).toArray()
    
    if(!blocks.length) {
      break
    }
    
    for(const block of blocks) {
      blockNumber = block.blockNumber
      sqlite.run("insert into accessgrant (data) values (?)", [JSON.stringify(block)])
    }
  }
  
  
  console.log("Finished!")
  sqlite.close()
  mongo._connection.close()
}

main()