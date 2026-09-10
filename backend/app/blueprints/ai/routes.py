from flask import jsonify, request as flask_request
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from app.blueprints.ai import ai_bp
from app.models.enums import WorkType
from app.providers import gemini
from app.schemas.request_schemas import AiSuggestSchema


@ai_bp.route("", methods=["POST"])
@jwt_required()
def ai_suggest():
    try:
        data = AiSuggestSchema().load(flask_request.get_json(silent=True) or {})
    except ValidationError as exc:
        return jsonify({"error": {"code": "validation_error", "message": exc.messages}}), 400

    result = gemini.suggest(data["description"])

    recommended = result.recommended_work_type
    if recommended not in [w.value for w in WorkType]:
        recommended = WorkType.IT.value

    return (
        jsonify(
            {
                "suggestedDescription": result.suggested_description,
                "recommendedWorkType": recommended,
            }
        ),
        200,
    )
