#!/bin/sh -e

mongorestore --stopOnError

node src/restore_ipfs.js