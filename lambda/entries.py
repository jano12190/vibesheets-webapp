import json
import os
import boto3
from datetime import datetime
from decimal import Decimal
from uuid import uuid4
from utils import response, decimal_to_float

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TIME_ENTRIES_TABLE"])


def calculate_hours(start_time, end_time):
    """Calculate hours between two ISO timestamps."""
    start = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
    end = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
    delta = end - start
    hours = Decimal(str(round(delta.total_seconds() / 3600, 2)))
    return hours


def handle_entries(event, user_id):
    """Route entry requests to appropriate handler."""
    method = event.get("requestContext", {}).get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "")
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
    """Create a new time entry. Supports both manual (hours) and clock-in (start_time)."""
    try:
        body = json.loads(event.get("body", "{}"))

        # Must have date and project_id
        if "date" not in body or "project_id" not in body:
            return response(400, {"error": "Missing required fields: date, project_id"})

        # Must have either hours (manual) or start_time (clock-in)
        if "hours" not in body and "start_time" not in body:
            return response(400, {"error": "Must provide either 'hours' or 'start_time'"})

        entry_id = f"{body['date']}_{uuid4().hex[:8]}"
        now = datetime.utcnow().isoformat()

        item = {
            "user_id": user_id,
            "entry_id": entry_id,
            "date": body["date"],
            "project_id": body["project_id"],
            "created_at": now,
            "updated_at": now
        }

        # Clock-in mode: start_time provided
        if "start_time" in body:
            item["start_time"] = body["start_time"]
            if "end_time" in body:
                item["end_time"] = body["end_time"]
                # Calculate hours from timestamps
                item["hours"] = calculate_hours(body["start_time"], body["end_time"])
            else:
                item["hours"] = Decimal("0")  # Running timer
        else:
            item["hours"] = Decimal(str(body["hours"]))

        table.put_item(Item=item)

        return response(201, {"entry": decimal_to_float(item)})

    except json.JSONDecodeError:
        return response(400, {"error": "Invalid JSON"})
    except Exception as e:
        return response(500, {"error": str(e)})


def update_entry(user_id, entry_id, event):
    """Update an existing time entry. Supports clock-out by adding end_time."""
    try:
        body = json.loads(event.get("body", "{}"))

        update_parts = []
        expr_names = {}
        expr_values = {":updated": datetime.utcnow().isoformat()}

        # Calculate hours from timestamps if both provided
        will_calculate_hours = "end_time" in body and "start_time" in body

        allowed_fields = ["date", "project_id", "start_time", "end_time"]
        # Only allow manual hours if not calculating from timestamps
        if not will_calculate_hours:
            allowed_fields.append("hours")

        for field in allowed_fields:
            if field in body:
                update_parts.append(f"#{field} = :{field}")
                expr_names[f"#{field}"] = field
                value = body[field]
                if field == "hours":
                    value = Decimal(str(value))
                expr_values[f":{field}"] = value

        # Calculate hours from timestamps
        if will_calculate_hours:
            hours = calculate_hours(body["start_time"], body["end_time"])
            update_parts.append("#hours = :hours")
            expr_names["#hours"] = "hours"
            expr_values[":hours"] = hours

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
