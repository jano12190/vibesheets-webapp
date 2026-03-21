import json
import os
import boto3
from datetime import datetime
from decimal import Decimal
from uuid import uuid4
from utils import response, decimal_to_float

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["PROJECTS_TABLE"])


def handle_projects(event, user_id):
    """Route project requests to appropriate handler."""
    method = event.get("requestContext", {}).get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "")
    path_params = event.get("pathParameters") or {}
    project_id = path_params.get("id")

    if method == "GET":
        return get_projects(user_id)
    elif method == "POST":
        return create_project(user_id, event)
    elif method == "PUT" and project_id:
        return update_project(user_id, project_id, event)
    elif method == "DELETE" and project_id:
        return delete_project(user_id, project_id)
    else:
        return response(405, {"error": "Method not allowed"})


def get_projects(user_id):
    """Get all projects for a user."""
    try:
        result = table.query(
            KeyConditionExpression="user_id = :uid",
            ExpressionAttributeValues={":uid": user_id},
            ScanIndexForward=True
        )
        projects = [decimal_to_float(item) for item in result.get("Items", [])]

        return response(200, {"projects": projects})

    except Exception as e:
        return response(500, {"error": str(e)})


def create_project(user_id, event):
    """Create a new project."""
    try:
        body = json.loads(event.get("body", "{}"))

        if "name" not in body:
            return response(400, {"error": "Missing required field: name"})

        project_id = uuid4().hex[:12]
        now = datetime.utcnow().isoformat()

        item = {
            "user_id": user_id,
            "project_id": project_id,
            "name": body["name"],
            "client": body.get("client", ""),
            "hourly_rate": Decimal(str(body.get("hourly_rate", 0))),
            "color": body.get("color", "#3B82F6"),
            "active": True,
            "created_at": now,
            "updated_at": now
        }

        table.put_item(Item=item)

        return response(201, {"project": decimal_to_float(item)})

    except json.JSONDecodeError:
        return response(400, {"error": "Invalid JSON"})
    except Exception as e:
        return response(500, {"error": str(e)})


def update_project(user_id, project_id, event):
    """Update an existing project."""
    try:
        body = json.loads(event.get("body", "{}"))

        update_parts = []
        expr_names = {}
        expr_values = {":updated": datetime.utcnow().isoformat()}

        allowed_fields = ["name", "client", "hourly_rate", "color", "active"]
        for field in allowed_fields:
            if field in body:
                update_parts.append(f"#{field} = :{field}")
                expr_names[f"#{field}"] = field
                value = body[field]
                if field == "hourly_rate":
                    value = Decimal(str(value))
                expr_values[f":{field}"] = value

        if not update_parts:
            return response(400, {"error": "No fields to update"})

        update_parts.append("updated_at = :updated")

        result = table.update_item(
            Key={"user_id": user_id, "project_id": project_id},
            UpdateExpression="SET " + ", ".join(update_parts),
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values,
            ConditionExpression="attribute_exists(user_id)",
            ReturnValues="ALL_NEW"
        )

        return response(200, {"project": decimal_to_float(result["Attributes"])})

    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
        return response(404, {"error": "Project not found"})
    except json.JSONDecodeError:
        return response(400, {"error": "Invalid JSON"})
    except Exception as e:
        return response(500, {"error": str(e)})


def delete_project(user_id, project_id):
    """Soft delete a project by setting active=false."""
    try:
        result = table.update_item(
            Key={"user_id": user_id, "project_id": project_id},
            UpdateExpression="SET active = :active, updated_at = :updated",
            ExpressionAttributeValues={
                ":active": False,
                ":updated": datetime.utcnow().isoformat()
            },
            ConditionExpression="attribute_exists(user_id)",
            ReturnValues="ALL_NEW"
        )
        return response(200, {"project": decimal_to_float(result["Attributes"])})

    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
        return response(404, {"error": "Project not found"})
    except Exception as e:
        return response(500, {"error": str(e)})
