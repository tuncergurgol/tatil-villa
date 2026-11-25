#!/usr/bin/env bash
# Sunucuda bir kez calistirin (root SSH oturumu):
#   bash -s < authorize-cursor-deploy-key.sh
# veya asagidaki echo satirini yapistirin.
set -euo pipefail
mkdir -p ~/.ssh
chmod 700 ~/.ssh
KEY='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAII1rf8xSB1ygA3bFStdx/qBCGfWez9lIgCdH7x9JpZbb cursor-deploy@tatildeyiz'
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
if grep -qF 'cursor-deploy@tatildeyiz' ~/.ssh/authorized_keys; then
  echo "Anahtar zaten var."
else
  echo "$KEY" >> ~/.ssh/authorized_keys
  echo "Anahtar eklendi."
fi
