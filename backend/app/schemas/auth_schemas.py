from marshmallow import Schema, ValidationError, fields, validate, validates_schema

from app.models.enums import WorkType


class SendOtpSchema(Schema):
    phone = fields.String(required=True)


class VerifyOtpSchema(Schema):
    phone = fields.String(required=True)
    code = fields.String(required=True)


class RegisterSchema(Schema):
    username = fields.String(required=True, validate=validate.Length(min=3, max=80))
    phone = fields.String(required=True)
    country = fields.String(required=True)
    governorate = fields.String(required=True)
    password = fields.String(required=True, validate=validate.Length(min=6))
    role = fields.String(required=True, validate=validate.OneOf(["user", "worker"]))

    work_type = fields.String(
        data_key="workType", load_default=None, validate=validate.OneOf([w.value for w in WorkType])
    )
    bio = fields.String(load_default=None)
    has_shop = fields.Boolean(data_key="hasShop", load_default=False)
    shop_location = fields.String(data_key="shopLocation", load_default=None)

    @validates_schema
    def validate_worker_fields(self, data, **kwargs):
        if data.get("role") != "worker":
            return
        if not data.get("work_type"):
            raise ValidationError("workType is required for workers", field_name="workType")
        if not data.get("bio"):
            raise ValidationError("bio is required for workers", field_name="bio")
        if data.get("has_shop") and not data.get("shop_location"):
            raise ValidationError(
                "shopLocation is required when hasShop is true", field_name="shopLocation"
            )


class LoginSchema(Schema):
    identifier_type = fields.String(
        data_key="identifierType", required=True, validate=validate.OneOf(["username", "phone"])
    )
    identifier = fields.String(required=True)
    password = fields.String(required=True)
