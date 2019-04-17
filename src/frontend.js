'use strict'
const restify = require('restify')
const errs = require('restify-errors')
const fs = require('fs').promises
const config = require('./config.json')
const server = restify.createServer()
const mustache = require('mustache')
const assert = require('assert')

server.get('/', async function(req, res, next) {
  const template = `<!DOCTYPE html>
  <html>
  Latest privEOS snapshots: 
  <ul>
    {{#chains}}
      <li><a href="https://ipfs.io/ipfs/{{hash}}">{{filename}}</a></li>
    {{/chains}}
  </ul>
  <br>
  You can always get the latest snapshot by following these links: 
  <ul>
    {{#latest}}
      <li><a href="https://snapshots.priveos.io/{{name}}/latest">https://snapshots.priveos.io/{{name}}/latest</a></li>
    {{/latest}}
  </ul>
  
  </html>`
  const files = await fs.readdir('hashes')
  let data = {
    chains: [],
    latest: config.chains,
  }
  for (const file of files) {
    const hash = (await fs.readFile(`hashes/${file}`, 'utf8')).trim()
    const filename = hash.split('/')[1]
    data.chains.push({hash, filename})
  }
  const html = mustache.render(template, data)
  res.header('Content-Type', 'text/html')
  res.sendRaw(html)
  next()
})

server.get('/:chain/latest', async function(req, res, next) {
  const chain = `latest_${req.params.chain}.txt`
  console.log("Chain: ", chain)
  const files = await fs.readdir('hashes')
  // assert.ok(files.includes(chain), "Not found")
  if(!files.includes(chain)) {
    const err = new errs.NotFoundError('Not found');
    return next(err)
  }
  const hash = (await fs.readFile(`hashes/${chain}`, 'utf8')).trim()
  res.redirect(301, `https://ipfs.io/ipfs/${hash}`, next)
})

server.listen(config.listenPort, "127.0.0.1", function() {
  console.log('Listening on port ', config.listenPort)
  
})