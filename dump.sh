#!/bin/sh 

node src/dump_ipfs.js

json=$(cat src/config.json)
chains=$(jq -c .chains[] src/config.json )
# echo $chains

for chain in $chains; do
  dbName=$(echo "$chain" | jq -r '.dbName')
  chainName=$(echo "$chain" | jq -r '.name')
  mongodump --excludeCollection=data --excludeCollection=state_history --db="$dbName" --out="dump_$chainName" 
  tarball="priveos_snapshot_${chainName}_$(date +%Y-%m-%d_%H_%M).tar.gz"

  tar cfz $tarball "dump_$chainName" ipfs_dump_${chainName}.txt
  
  # remove temporary files from above
  rm ipfs_dump_${chainName}.txt 
  rm -rf "dump_$chainName"
  
  # publish the tarball
  hash=$(ipfs --api=/ip4/127.0.0.1/tcp/5001 add -w -Q $tarball)
  
  if [ -f "hashes/latest_${chainName}.txt" ]; then
      old=$(dirname `cat "hashes/latest_${chainName}.txt"`)
      ipfs --api=/ip4/127.0.0.1/tcp/5001 pin rm $old
  fi
  mkdir -p hashes
  echo "$hash/$tarball" > "hashes/latest_${chainName}.txt"
done






