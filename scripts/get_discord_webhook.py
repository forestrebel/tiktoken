#!/usr/bin/env python3
import asyncio
import aiohttp
import json
import os
import sys
import subprocess
from dotenv import load_dotenv

async def create_webhook():
    # Load credentials from .env.production
    load_dotenv('.env.production')
    
    bot_token = os.getenv('DISCORD_BOT_TOKEN')
    channel_id = os.getenv('DISCORD_CHANNEL_ID')
    
    if not bot_token or not channel_id:
        print("Error: DISCORD_BOT_TOKEN and DISCORD_CHANNEL_ID must be set in .env.production")
        return
    
    print("Creating Discord webhook...")
    async with aiohttp.ClientSession() as session:
        try:
            headers = {
                "Authorization": f"Bot {bot_token}",
                "Content-Type": "application/json"
            }
            
            # Create webhook
            webhook_data = {
                "name": "tiktoken-deploy",
                "avatar": None
            }
            
            async with session.post(f'https://discord.com/api/v9/channels/{channel_id}/webhooks', headers=headers, json=webhook_data) as response:
                if response.status == 429:  # Rate limit
                    retry_after = int(response.headers.get('Retry-After', 5))
                    print(f"Rate limited. Waiting {retry_after} seconds...")
                    await asyncio.sleep(retry_after)
                    return await create_webhook()
                
                if response.status != 200:
                    print(f"Failed to create webhook: {response.status}")
                    print(await response.text())
                    return
                
                webhook = await response.json()
                webhook_url = f"https://discord.com/api/webhooks/{webhook['id']}/{webhook['token']}"
                print("Created webhook successfully")
            
            # Save webhook URL
            # Update .env.production
            with open('.env.production', 'r') as f:
                lines = f.readlines()
            
            # Remove old webhook if exists
            lines = [line for line in lines if not line.startswith('DISCORD_WEBHOOK_URL=')]
            
            # Add new webhook
            lines.append('\n# Discord deployment notifications\n')
            lines.append(f'DISCORD_WEBHOOK_URL={webhook_url}\n')
            
            with open('.env.production', 'w') as f:
                f.writelines(lines)
            print("Webhook URL added to .env.production")
            
            # Update GitHub secret
            try:
                subprocess.run(['gh', 'secret', 'set', 'DISCORD_WEBHOOK_URL', '--body', webhook_url], check=True)
                print("Webhook URL added to GitHub secrets")
            except subprocess.CalledProcessError as e:
                print(f"Failed to set GitHub secret: {e}")
            
            # Test webhook
            test_data = {
                "content": "🚀 Deployment notifications configured successfully!"
            }
            async with session.post(webhook_url, json=test_data) as response:
                if response.status == 204:
                    print("Test message sent successfully")
                else:
                    print(f"Failed to send test message: {response.status}")
        
        except aiohttp.ClientError as e:
            print(f"Network error: {e}")
        except Exception as e:
            print(f"Unexpected error: {e}")

if __name__ == "__main__":
    asyncio.run(create_webhook()) 