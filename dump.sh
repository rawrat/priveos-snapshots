#!/bin/sh -e

# this will create a dump dir in the local path
mongodump --excludeCollection=data --excludeCollection=state_history -d priveos

# this will create a file named priveos-ipfs-snapshot.sqlite
node src/dump_ipfs.js

tarball="priveos_snapshot_$(date +%Y-%m-%d_%H:%M).tar.gz"

tar cfz $tarball dump priveos-ipfs-snapshot.sqlite 

# remove temporary files from above
rm priveos-ipfs-snapshot.sqlite 
rm -rf dump

# publish the tarball
hash=$(ipfs --api=/ip4/127.0.0.1/tcp/5001 add -Q $tarball)
echo $hash > latest.txt
