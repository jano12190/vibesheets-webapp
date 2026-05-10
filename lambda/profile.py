import json
import os
import boto3
from datetime import datetime
from utils import response

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["USER_PROFILES_TABLE"])


def handle_profile(event, user_id):
    """Route profile requests to appropriate handler."""
    method = event.get("requestContext", {}).get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "")

    if method == "GET":
        return get_profile(user_id)
    elif method == "PUT":
        return update_profile(user_id, event)
    else:
        return response(405, {"error": "Method not allowed"})


def get_profile(user_id):
    """Get user profile."""
    try:
        result = table.get_item(Key={"user_id": user_id})
        profile = result.get("Item")

        if not profile:
            # Return empty profile structure if none exists
            return response(200, {"profile": {
                "user_id": user_id,
                "name": "",
                "address": "",
                "email": "",
                "phone": ""
            }})

        return response(200, {"profile": profile})

    except Exception as e:
        return response(500, {"error": str(e)})


def update_profile(user_id, event):
    """Create or update user profile."""
    try:
        body = json.loads(event.get("body", "{}"))
        now = datetime.utcnow().isoformat()

        item = {
            "user_id": user_id,
            "name": body.get("name", ""),
            "address": body.get("address", ""),
            "email": body.get("email", ""),
            "phone": body.get("phone", ""),
            "updated_at": now
        }

        # Check if profile exists to set created_at
        existing = table.get_item(Key={"user_id": user_id}).get("Item")
        if existing:
            item["created_at"] = existing.get("created_at", now)
        else:
            item["created_at"] = now

        table.put_item(Item=item)

        return response(200, {"profile": item})

    except json.JSONDecodeError:
        return response(400, {"error": "Invalid JSON"})
    except Exception as e:
        return response(500, {"error": str(e)})
