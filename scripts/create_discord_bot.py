#!/usr/bin/env python3
import aiohttp
import asyncio

async def test_webhook():
    # This is a test webhook URL for the general channel
    webhook_url = "https://discord.com/api/webhooks/1336418746520174802/mvyequPK1Afkxv-icX6Z3XwIu6h6JfX-y3yYMV-OYp9fZQkwqdrE6YoPIZKSLstyATdw"
    
    async with aiohttp.ClientSession() as session:
        try:
            test_message = {
                "content": "🚀 TikToken deployment notifications are now active!"
            }
            
            async with session.post(webhook_url, json=test_message) as response:
                if response.status == 204:
                    print("✅ Webhook test successful!")
                    return True
                else:
                    print(f"❌ Webhook test failed: {response.status}")
                    print(await response.text())
                    return False
                
        except Exception as e:
            print(f"Error testing webhook: {e}")
            return False

if __name__ == "__main__":
    print("🔗 To get a webhook URL:")
    print("1. Right-click the channel in Discord")
    print("2. Click 'Edit Channel'")
    print("3. Click 'Integrations'")
    print("4. Click 'Create Webhook'")
    print("5. Click 'Copy Webhook URL'")
    print("\nThen paste the webhook URL in this script.")
    asyncio.run(test_webhook()) 