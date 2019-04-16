#!/bin/sh

mongodump --excludeCollection=data --excludeCollection=state_history -d priveos

node src/dump_ipfs.js
