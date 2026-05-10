import json
import logging
from entries import handle_entries
from projects import handle_projects
from profile import handle_profile
from utils import response

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    """Main Lambda handler - routes requests to appropriate handlers."""
    logger.info(f"Event: {json.dumps(event)}")

    try:
        path = event.get("rawPath") or event.get("path", "")

        # Get user ID from Cognito JWT claims
        user_id = get_user_id(event)
        if not user_id:
            return response(401, {"error": "Unauthorized"})

        # Route to appropriate handler
        if "/entries" in path:
            return handle_entries(event, user_id)
        elif "/projects" in path:
            return handle_projects(event, user_id)
        elif "/profile" in path:
            return handle_profile(event, user_id)
        else:
            return response(404, {"error": "Not found"})

    except Exception as e:
        logger.error(f"Error: {str(e)}", exc_info=True)
        return response(500, {"error": "Internal server error"})


def get_user_id(event):
    """Extract user ID from Cognito JWT claims."""
    try:
        authorizer = event.get("requestContext", {}).get("authorizer", {})
        # HTTP API v2 puts claims directly under authorizer, not under jwt.claims
        claims = authorizer.get("claims", {}) or authorizer.get("jwt", {}).get("claims", {})
        return claims.get("sub")
    except Exception:
        return None
