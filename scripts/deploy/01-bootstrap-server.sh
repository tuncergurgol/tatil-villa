#!/usr/bin/env bash
# Radore tatildeyiz-app — ilk kurulum (root olarak çalıştırın)
# Kullanım: bash 01-bootstrap-server.sh

set -euo pipefail

HOSTNAME="tatildeyiz-app"
APP_USER="deploy"
APP_DIR="/var/www/tatil-villa"
NODE_MAJOR=22

echo "==> Hostname: $HOSTNAME"
hostnamectl set-hostname "$HOSTNAME" || true
echo "$HOSTNAME" > /etc/hostname

echo "==> Sistem güncellemesi"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y \
  ca-certificates curl git gnupg ufw fail2ban \
  nginx certbot python3-certbot-nginx \
  build-essential

echo "==> Saat dilimi (Europe/Istanbul)"
timedatectl set-timezone Europe/Istanbul || true

echo "==> deploy kullanıcısı"
if ! id "$APP_USER" &>/dev/null; then
  adduser --disabled-password --gecos "" "$APP_USER"
  usermod -aG sudo "$APP_USER"
  mkdir -p "/home/$APP_USER/.ssh"
  chmod 700 "/home/$APP_USER/.ssh"
  if [[ -f /root/.ssh/authorized_keys ]]; then
    cp /root/.ssh/authorized_keys "/home/$APP_USER/.ssh/authorized_keys"
    chown -R "$APP_USER:$APP_USER" "/home/$APP_USER/.ssh"
    chmod 600 "/home/$APP_USER/.ssh/authorized_keys"
  fi
fi

echo "==> Docker"
if ! command -v docker &>/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  usermod -aG docker "$APP_USER"
fi

echo "==> Node.js $NODE_MAJOR"
if ! command -v node &>/dev/null; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi

echo "==> PM2"
npm install -g pm2

echo "==> Uygulama dizini"
mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

echo "==> UFW (22, 80, 443)"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> fail2ban"
systemctl enable fail2ban
systemctl restart fail2ban

echo ""
echo "Bootstrap tamamlandı."
echo "Sonraki adım: deploy kullanıcısı ile repo clone + .env + docker postgres + pm2"
echo "  su - deploy"
echo "  cd $APP_DIR"
