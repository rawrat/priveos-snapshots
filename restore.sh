#!/bin/sh -e

rm -rf dump 
rm -f ipfs_dump.txt

curl https://snapshots.priveos.io/latest -L | tar xfz -

mongorestore --stopOnError

node src/restore_ipfs.js