import json
import os
import boto3
from datetime import datetime
from decimal import Decimal
from uuid import uuid4
from utils import response, decimal_to_float

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TIME_ENTRIES_TABLE"])


def handle_entries(event, user_id):
    """Route entry requests to appropriate handler."""
    method = event.get("requestContext", {}).get("http", {}).get("method", "")
    path_params = event.get("pathParameters") or {}
    entry_id = path_params.get("id")

    if method == "GET":
        return get_entries(user_id, event)
    elif method == "POST":
        return create_entry(user_id, event)
    elif method == "PUT" and entry_id:
        return update_entry(user_id, entry_id, event)
    elif method == "DELETE" and entry_id:
        return delete_entry(user_id, entry_id)
    else:
        return response(405, {"error": "Method not allowed"})


def get_entries(user_id, event):
    """Get all time entries for a user, optionally filtered by date range."""
    query_params = event.get("queryStringParameters") or {}
    start_date = query_params.get("start")
    end_date = query_params.get("end")

    try:
        query_kwargs = {
            "KeyConditionExpression": "user_id = :uid",
            "ExpressionAttributeValues": {":uid": user_id},
            "ScanIndexForward": False
        }

        if start_date and end_date:
            query_kwargs["FilterExpression"] = "#d BETWEEN :start AND :end"
            query_kwargs["ExpressionAttributeNames"] = {"#d": "date"}
            query_kwargs["ExpressionAttributeValues"][":start"] = start_date
            query_kwargs["ExpressionAttributeValues"][":end"] = end_date

        result = table.query(**query_kwargs)
        entries = [decimal_to_float(item) for item in result.get("Items", [])]

        return response(200, {"entries": entries})

    except Exception as e:
        return response(500, {"error": str(e)})


def create_entry(user_id, event):
    """Create a new time entry."""
    try:
        body = json.loads(event.get("body", "{}"))

        required = ["date", "project_id", "hours"]
        missing = [f for f in required if f not in body]
        if missing:
            return response(400, {"error": f"Missing fields: {', '.join(missing)}"})

        entry_id = f"{body['date']}#{uuid4().hex[:8]}"
        now = datetime.utcnow().isoformat()

        item = {
            "user_id": user_id,
            "entry_id": entry_id,
            "date": body["date"],
            "project_id": body["project_id"],
            "hours": Decimal(str(body["hours"])),
            "description": body.get("description", ""),
            "created_at": now,
            "updated_at": now
        }

        table.put_item(Item=item)

        return response(201, {"entry": decimal_to_float(item)})

    except json.JSONDecodeError:
        return response(400, {"error": "Invalid JSON"})
    except Exception as e:
        return response(500, {"error": str(e)})


def update_entry(user_id, entry_id, event):
    """Update an existing time entry."""
    try:
        body = json.loads(event.get("body", "{}"))

        update_parts = []
        expr_names = {}
        expr_values = {":updated": datetime.utcnow().isoformat()}

        allowed_fields = ["date", "project_id", "hours", "description"]
        for field in allowed_fields:
            if field in body:
                update_parts.append(f"#{field} = :{field}")
                expr_names[f"#{field}"] = field
                value = body[field]
                if field == "hours":
                    value = Decimal(str(value))
                expr_values[f":{field}"] = value

        if not update_parts:
            return response(400, {"error": "No fields to update"})

        update_parts.append("updated_at = :updated")

        result = table.update_item(
            Key={"user_id": user_id, "entry_id": entry_id},
            UpdateExpression="SET " + ", ".join(update_parts),
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values,
            ConditionExpression="attribute_exists(user_id)",
            ReturnValues="ALL_NEW"
        )

        return response(200, {"entry": decimal_to_float(result["Attributes"])})

    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
        return response(404, {"error": "Entry not found"})
    except json.JSONDecodeError:
        return response(400, {"error": "Invalid JSON"})
    except Exception as e:
        return response(500, {"error": str(e)})


def delete_entry(user_id, entry_id):
    """Delete a time entry."""
    try:
        table.delete_item(
            Key={"user_id": user_id, "entry_id": entry_id},
            ConditionExpression="attribute_exists(user_id)"
        )
        return response(204)

    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
        return response(404, {"error": "Entry not found"})
    except Exception as e:
        return response(500, {"error": str(e)})
