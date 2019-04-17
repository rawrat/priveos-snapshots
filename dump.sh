#!/bin/sh -e

# this will create a dump dir in the local path
mongodump --excludeCollection=data --excludeCollection=state_history -d priveos

# this will create a file named ipfs_dump.txt
node src/dump_ipfs.js

tarball="priveos_snapshot_$(date +%Y-%m-%d_%H_%M).tar.gz"

tar cfz $tarball dump ipfs_dump.txt

# remove temporary files from above
rm ipfs_dump.txt 
rm -rf dump

# publish the tarball
hash=$(ipfs --api=/ip4/127.0.0.1/tcp/5001 add -w -Q $tarball)

if [ -f latest.txt ]; then
    old=$(dirname `cat latest.txt`)
    ipfs --api=/ip4/127.0.0.1/tcp/5001 pin rm $old
fi

echo "$hash/$tarball" > latest.txt
