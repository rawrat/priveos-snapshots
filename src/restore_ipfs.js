'use strict'
const config = require('./config')
const ipfsClient = require('ipfs-http-client')
const assert = require('assert')
const _ = require('underscore')
const fs = require('fs')
const readline = require('readline')
const Bluebird = require('bluebird')

const CHUNK_SIZE = 500


async function main() {
  const ipfs = ipfsClient(config.ipfsConfig.host, config.ipfsConfig.port, {'protocol': config.ipfsConfig.protocol})
  const file = fs.createReadStream('ipfs_dump.txt', 'utf8')
  const rl = readline.createInterface({
    input: file,
    crlfDelay: Infinity
  })
  let count = 0
  
  /*
   * This queue waits until CHUNK_SIZE items have been pushed into it
   * and then calls the callback with those items and clears the list.
   */
  const queue = new Queue(CHUNK_SIZE, async (rows) => {
    const files = rows.map(row => Buffer.from(row.data))
    const results = await ipfs.add(files, {pin: true})
    for (const [row, result] of _.zip(rows, results)) {
      // make sure the hash of the newly imported file is identical
      assert.equal(row.hash, result.hash)
      count++
    }
    console.log("Finished chunk! count: ", count)
  })
  for await (const line of rl) {
    const [hash, data] = line.split('|||')
    await queue.push({hash, data})
  }
  
  /* 
   * If there are undrained items in the queue, call the callback 
   * with those now.
   */
  await queue.drain()
  console.log("Total number of hashes: ", count)
}

class Queue {
  constructor(chunk_size, callback) {
    this.list = []
    this.chunk_size = chunk_size
    this.callback = callback
  }
    
  async push(e) {
    this.list.push(e)
    if(this.list.length >= this.chunk_size) {
      await this.drain()
    }
  }
  
  async drain() {
    await this.callback(this.list)
    this.list = []
  }
}

main()