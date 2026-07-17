import sys
import os
# Adjust path to include the backend directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

try:
    from app.main import app
    from fastapi.openapi.utils import get_openapi
    
    schema = get_openapi(
        title=app.title,
        version=app.version,
        openapi_version=app.openapi_version,
        description=app.description,
        routes=app.routes,
    )
    print("Schema generated successfully")
except Exception as e:
    import traceback
    traceback.print_exc()
