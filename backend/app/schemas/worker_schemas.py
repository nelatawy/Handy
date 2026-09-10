from marshmallow import Schema, ValidationError, fields, validates_schema


class UpdateWorkerProfileSchema(Schema):
    bio = fields.String(load_default=None)
    has_shop = fields.Boolean(data_key="hasShop", load_default=None)
    shop_location = fields.String(data_key="shopLocation", load_default=None)

    @validates_schema
    def validate_shop_location(self, data, **kwargs):
        if data.get("has_shop") is True and not data.get("shop_location"):
            raise ValidationError(
                "shopLocation is required when hasShop is true", field_name="shopLocation"
            )
