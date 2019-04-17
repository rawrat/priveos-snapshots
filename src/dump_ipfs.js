'use strict'
const Mongo = require('./mongo')
const config = require('./config.json')
const assert = require('assert')
const _ = require('underscore')
const fs = require('fs')
const axios = require('axios')
axios.defaults.timeout = 10000 // make sure we're not hanging forever
global.Promise = require('bluebird')


let ipfs

const CHUNK_SIZE = 10
const START_BLOCK = config.startBlock || 0

async function main() {
  for(const chain of config.chains) {
    await dump(chain)
  }
}

async function dump(chain) {
  const mongo = new Mongo(config.mongoUrl, chain.dbName)
  const file = fs.createWriteStream(`ipfs_dump_${chain.name}.txt`, 'utf8', 'w')
  const db = await mongo.db()

  let blockNumber = START_BLOCK
  while(true) {
    const blocks = await db.collection('store').find({"blockNumber": { $gt: blockNumber}}).sort({"blockNumber": 1}).limit(CHUNK_SIZE).toArray()
    // console.log("Store blocks.length: ", blocks.length)
    if(!blocks.length) {
      break
    }
    
    const hashes = blocks.map(x => x.data.data)
    
    // we're running these in parallel
    const promises = blocks.map(x => ipfs_get(x))
    const datasets = await Promise.all(promises)
    
    const lines = serialize(hashes, datasets)
    for (const line of lines) {
      file.write(line)      
    }
    
    // increment blockNumber count for next run of the loop
    blockNumber = blocks[blocks.length-1].blockNumber

    if(blockNumber % 20 == 0) {
      console.log("Block: ", blockNumber)
    }
  }
  
  console.log("Finished!")
  file.end()
  mongo._connection.close()
}

/* That data can never contain "|||". If it does, something fishy is going on. */
function validate(str) {
  return !str.includes('|||')
}

function serialize(hashes, datasets) {
  let lines = []
  for (const [hash, data] of _.zip(hashes, datasets)) {
    assert.ok(hash, "Hash must not be null")
    if(!data) {
      continue
    }
    assert.ok(validate(data))
    assert.ok(validate(hash))
    lines.push([hash, data].join('|||') + '\n')
  }
  return lines
}

/* 
 * The ipfs.get call from `ipfs-http-client` is buggy, so we're manually 
 * calling the API. The problem with ipfs.get is that if the hash is not
 * available, the API hangs indefinitely and ipfs.get does not allow one 
 * to set a timeout.
 */
async function ipfs_get(block) {
  const hash = block.data.data
  const url = `${config.ipfsConfig.protocol}://${config.ipfsConfig.host}:${config.ipfsConfig.port}/api/v0/cat`
  const params = {
    arg: hash,
  }
  
  try {
    /* arraybuffer to prevent automatic parsing of response data as JSON */
    const res = await axios.get(url, {params, responseType: 'arraybuffer'})
    return res.data.toString()
  } catch(e) {
    console.log(`Error in block ${JSON.stringify(block)}: ${e}`)
  }
}
main()
