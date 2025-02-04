#!/usr/bin/env python3
import asyncio
import aiohttp
import json
import os
from dotenv import load_dotenv

async def get_token():
    # Load credentials from .env.production
    load_dotenv('.env.production')
    
    email = os.getenv('DISCORD_EMAIL')
    password = os.getenv('DISCORD_PASSWORD')
    
    if not email or not password:
        print("Error: DISCORD_EMAIL and DISCORD_PASSWORD must be set in .env.production")
        return
    
    print("Getting Discord token...")
    async with aiohttp.ClientSession() as session:
        data = {
            "email": email,
            "password": password
        }
        
        async with session.post('https://discord.com/api/v9/auth/login', json=data) as response:
            if response.status == 200:
                result = await response.json()
                token = result.get('token')
                print("Token received successfully")
                
                # Update .env.production with the token
                with open('.env.production', 'r') as f:
                    lines = f.readlines()
                
                # Remove old token if exists
                lines = [line for line in lines if not line.startswith('DISCORD_WEBHOOK_URL=')]
                
                # Add new token
                lines.append('\n# Discord deployment notifications\n')
                lines.append(f'DISCORD_WEBHOOK_URL={token}\n')
                
                with open('.env.production', 'w') as f:
                    f.writelines(lines)
                print("Token added to .env.production as DISCORD_WEBHOOK_URL")
            else:
                print(f"Error: {response.status}")
                print(await response.text())

if __name__ == "__main__":
    asyncio.run(get_token()) 