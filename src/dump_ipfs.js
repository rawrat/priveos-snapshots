'use strict'
const Mongo = require('./mongo')
const sqlite3 = require('sqlite3')
const mongoUrl = 'mongodb://127.0.0.1:27017'
const dbName = 'priveos'
const axios = require('axios')
axios.defaults.timeout = 10000 // make sure we're not hanging forever
global.Promise = require('bluebird')
Promise.promisifyAll(sqlite3)

const config = {
  ipfsConfig: {
    host: 'localhost',
    port: '5001',
    protocol: 'http',
  }
}
let ipfs

const CHUNK_SIZE = 10
const START_BLOCK = 0

let sqlite

async function main() {
  const mongo = new Mongo(mongoUrl, dbName)

  sqlite = new sqlite3.Database('priveos-ipfs-snapshot.sqlite')
  const db = await mongo.db()
  await sqlite.runAsync("CREATE TABLE IF NOT EXISTS ipfs (hash TEXT UNIQUE, data TEXT)")

  let blockNumber = START_BLOCK
  while(true) {
    const a = new Date()
    const blocks = await db.collection('store').find({"blockNumber": { $gt: blockNumber}}).sort({"blockNumber": 1}).limit(CHUNK_SIZE).toArray()
    // console.log("Store blocks.length: ", blocks.length)
    if(!blocks.length) {
      break
    }
    
    // we're running these in parallel
    const promises = blocks.map(x => copy_from_ipfs(x))
    await Promise.all(promises)
    
    // increment blockNumber count for next run of the loop
    blockNumber = blocks[blocks.length-1].blockNumber
    const b = new Date()
    // console.log(`Loop took ${b-a}`)
    if(blockNumber % 20 == 0) {
      console.log("Block: ", blockNumber)
    }
  }
  
  console.log("Finished!")
  sqlite.close()
  mongo._connection.close()
}

async function copy_from_ipfs(block) {
  const hash = block.data.data
  try {
    console.log("getting hash ", hash)
    const data = await ipfs_get(hash)
    console.log("received: ", data)
    await sqlite.runAsync("insert into ipfs (hash, data) values (?, ?)", [hash, data])
  } catch(e) {
    console.log(`Error in block ${JSON.stringify(block)}: ${e}`)
  }
}

/* 
 * The ipfs.get call from `ipfs-http-client` is buggy, so we're manually 
 * calling the API. The problem with ipfs.get is that if the hash is not
 * available, the API hangs indefinitely and ipfs.get does not allow one 
 * to set a timeout.
 */
async function ipfs_get(hash) {
  const url = `${config.ipfsConfig.protocol}://${config.ipfsConfig.host}:${config.ipfsConfig.port}/api/v0/cat`
  const params = {
    arg: hash,
  }
  
  /* arraybuffer to prevent automatic parsing of response data as JSON */
  const res = await axios.get(url, {params, responseType: 'arraybuffer'})
  return res.data.toString()
}
main()
