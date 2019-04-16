#!/bin/sh

mongodump --excludeCollection=data --excludeCollection=state_history -d priveos

node src/dump_ipfs.js

tar cfz "priveos_snapshot_$(date +%Y-%m-%d_%H:%M).tar.gz" dump priveos-ipfs-snapshot.sqlite 