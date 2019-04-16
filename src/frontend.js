'use strict'
const restify = require('restify')
const fs = require('fs').promises
const server = restify.createServer()

server.get('/', async function(req, res, next) {
  const hash = (await fs.readFile('latest.txt', 'utf8')).trim()
  
  res.send(`Ohai Latest hash is ${hash}`)
  next()
})

server.get('/latest', async function(req, res, next) {
  const hash = (await fs.readFile('latest.txt', 'utf8')).trim()
  res.redirect(301, `https://cloudflare-ipfs.com/ipfs/${hash}`, next)
})

server.listen(3333, "127.0.0.1", function() {
  console.log('Listening on port 3333')
  
})