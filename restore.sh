#!/bin/sh

mongorestore --stopOnError

node src/restore_ipfs.js