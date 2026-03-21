import json
import os
import logging
from entries import handle_entries
from projects import handle_projects

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    """Main Lambda handler - routes requests to appropriate handlers."""
    logger.info(f"Event: {json.dumps(event)}")

    try:
        # Extract route info from API Gateway v2 event
        route_key = event.get("routeKey", "")
        http_method = event.get("requestContext", {}).get("http", {}).get("method", "")
        path = event.get("rawPath", "")

        # Get user ID from Cognito JWT claims
        user_id = get_user_id(event)
        if not user_id:
            return response(401, {"error": "Unauthorized"})

        # Route to appropriate handler
        if "/entries" in path:
            return handle_entries(event, user_id)
        elif "/projects" in path:
            return handle_projects(event, user_id)
        else:
            return response(404, {"error": "Not found"})

    except Exception as e:
        logger.error(f"Error: {str(e)}", exc_info=True)
        return response(500, {"error": "Internal server error"})


def get_user_id(event):
    """Extract user ID from Cognito JWT claims."""
    try:
        claims = event.get("requestContext", {}).get("authorizer", {}).get("jwt", {}).get("claims", {})
        # Cognito uses 'sub' as the unique user identifier
        return claims.get("sub")
    except Exception:
        return None


def response(status_code, body):
    """Create API Gateway response."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
        },
        "body": json.dumps(body)
    }
