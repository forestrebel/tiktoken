"""Check latest DO App Platform deployments."""
import os
import asyncio
from pathlib import Path
import aiohttp
from dotenv import load_dotenv

# Load environment variables
env_file = Path(__file__).parents[2] / ".env.production"
load_dotenv(env_file)

async def get_deployments():
    """Get latest deployments for the app."""
    token = os.getenv("DO_API_TOKEN")
    app_id = os.getenv("DO_APP_ID")
    
    if not token or not app_id:
        print("Error: DO_API_TOKEN or DO_APP_ID not set")
        return
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # First check if we can access the app
    app_url = f"https://api.digitalocean.com/v2/apps/{app_id}"
    deployments_url = f"{app_url}/deployments"
    
    async with aiohttp.ClientSession() as session:
        print("\nChecking app access...")
        async with session.get(app_url, headers=headers) as resp:
            if resp.status != 200:
                print(f"Error accessing app: HTTP {resp.status}")
                print("Response:", await resp.text())
                return
            
            app_data = await resp.json()
            print(f"App name: {app_data.get('app', {}).get('spec', {}).get('name')}")
            print(f"Active deployment: {app_data.get('app', {}).get('active_deployment', {}).get('id')}")
        
        print("\nFetching deployments...")
        async with session.get(deployments_url, headers=headers) as resp:
            if resp.status != 200:
                print(f"Error fetching deployments: HTTP {resp.status}")
                print("Response:", await resp.text())
                return
                
            data = await resp.json()
            deployments = data.get("deployments", [])
            
            if not deployments:
                print("No deployments found")
                return
                
            print("\nLatest deployments:")
            for d in deployments[:5]:  # Show last 5
                print(f"\nID: {d.get('id')}")
                print(f"Phase: {d.get('phase')}")
                print(f"Created: {d.get('created_at')}")
                print(f"Progress: {d.get('progress', {}).get('success_steps', 0)}/{d.get('progress', {}).get('total_steps', 0)} steps")
                if d.get("error"):
                    print(f"Error: {d['error'].get('message')}")

if __name__ == "__main__":
    asyncio.run(get_deployments()) 