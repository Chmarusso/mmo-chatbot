# Deployment Guide

Deploy MMOPLAYA to your VPS using rsync.

## Prerequisites

- VPS with SSH access
- Node.js 20+ installed on VPS
- pnpm installed on VPS
- PostgreSQL database on VPS

## Initial Setup

### 1. Configure Deployment Script

Edit `scripts/deploy.sh` and update these variables:

```bash
VPS_USER="your-username"          # Your SSH username
VPS_HOST="your-server-ip"         # Server IP or domain
VPS_PATH="/var/www/mmo-match"     # Installation path on VPS
VPS_PORT="22"                      # SSH port (default: 22)
```

### 2. Set Up SSH Key (Recommended)

For password-less deployment, add your SSH key to the VPS:

```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy to VPS
ssh-copy-id -p 22 your-username@your-server-ip
```

### 3. Prepare VPS

Connect to your VPS and create the directory:

```bash
ssh your-username@your-server-ip

# Create application directory
sudo mkdir -p /var/www/mmo-match
sudo chown $USER:$USER /var/www/mmo-match

# Create logs directory
mkdir -p /var/www/mmo-match/logs
```

## Deployment

### Deploy to VPS

Run the deployment script:

```bash
pnpm deploy
```

This will:
1. Build the production bundle locally
2. Sync files to VPS (excluding node_modules, .git, etc.)
3. Install dependencies on VPS

### First-Time Setup on VPS

After first deployment, SSH into your VPS:

```bash
ssh your-username@your-server-ip
cd /var/www/mmo-match
```

**1. Create .env file:**

```bash
nano .env
```

Add production environment variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mmo_match_prod"
APP_URL="https://yourdomain.com"

# SMTP Configuration
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="user@example.com"
SMTP_PASS="your-password"
SMTP_FROM="MMOPLAYA <noreply@example.com>"

# Optional
OTP_EXPIRATION_MINUTES=10
SESSION_TTL_DAYS=30
```

**2. Run database migrations:**

```bash
pnpm prisma migrate deploy
```

**3. Seed the database:**

```bash
pnpm db:seed
```

**4. Start the application:**

```bash
pnpm start
```

The app will run on port 3000 by default.

## Running with PM2

For production, use PM2 to keep the app running:

### Install PM2

```bash
npm install -g pm2
```

### Start with PM2

```bash
cd /var/www/mmo-match

# Start the app
pm2 start npm --name "mmo-match" -- start

# Save PM2 process list
pm2 save

# Set up PM2 to start on system boot
pm2 startup
```

### PM2 Commands

```bash
# View logs
pm2 logs mmo-match

# Restart app
pm2 restart mmo-match

# Stop app
pm2 stop mmo-match

# Monitor
pm2 monit

# View status
pm2 status
```

## Setting Up Nginx (Optional)

If you want to use Nginx as a reverse proxy:

### 1. Install Nginx

```bash
sudo apt update
sudo apt install nginx
```

### 2. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/mmo-match
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 10M;
}
```

### 3. Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/mmo-match /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Set Up SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Updating the Application

To deploy updates:

```bash
# On your local machine
pnpm deploy
```

Then on VPS:

```bash
cd /var/www/mmo-match

# Run migrations if needed
pnpm prisma migrate deploy

# Restart app
pm2 restart mmo-match
```

## Troubleshooting

### Check Application Logs

```bash
# PM2 logs
pm2 logs mmo-match

# Or manual logs if not using PM2
cd /var/www/mmo-match/logs
tail -f pm2-error.log
```

### Check Nginx Logs

```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Database Connection Issues

Verify PostgreSQL is running:

```bash
sudo systemctl status postgresql
```

Test database connection:

```bash
psql -U username -d mmo_match_prod
```

### Port Already in Use

Check what's using port 3000:

```bash
sudo lsof -i :3000
```

Kill the process:

```bash
sudo kill -9 <PID>
```

## Backup Before Deployment

Always backup before deploying:

```bash
# On VPS
cd /var/www/mmo-match
./scripts/db-dump.sh
```

## Environment-Specific Considerations

- Make sure `NODE_ENV=production` on VPS
- Use production database credentials
- Configure proper SMTP settings
- Set up proper SSL certificates
- Enable firewall (ufw) and only allow necessary ports
- Keep system and dependencies updated
