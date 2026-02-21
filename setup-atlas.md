# MongoDB Atlas Setup (Free Tier)

## 1. Create Account
- Go to https://www.mongodb.com/atlas
- Sign up (free, no credit card)

## 2. Create Free Cluster
- Click "Build a Database"
- Select **M0 Free** tier
- Choose provider: **GCP** (since backend is on GCP Cloud Run)
- Region: **us-central1** (same as Cloud Run for lowest latency)
- Cluster name: `interviewhub`
- Click "Create Deployment"

## 3. Create Database User
- Username: `interviewhub-admin`
- Password: generate a strong one and save it
- Click "Create User"

## 4. Network Access (Whitelist)
- Go to: Network Access > Add IP Address
- Click **"Allow Access from Anywhere"** (adds `0.0.0.0/0`)
  - Required because Cloud Run uses dynamic IPs
- Click "Confirm"

## 5. Get Connection String
- Go to: Database > Connect > Drivers
- Copy the connection string, it looks like:
  ```
  mongodb+srv://interviewhub-admin:<password>@interviewhub.xxxxx.mongodb.net/?retryWrites=true&w=majority
  ```
- Replace `<password>` with your actual password
- Add database name: `interviewhub` before the `?`:
  ```
  mongodb+srv://interviewhub-admin:YOUR_PASSWORD@interviewhub.xxxxx.mongodb.net/interviewhub?retryWrites=true&w=majority
  ```

## 6. Use It
Set this as `MONGODB_URI` in:
- `server/.env` (local development)
- GCP Cloud Run environment variables (production)
