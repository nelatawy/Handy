from marshmallow import Schema, fields, validate


class UpdateUserSchema(Schema):
    username = fields.String(load_default=None, validate=validate.Length(min=3, max=80))
    country = fields.String(load_default=None)
    governorate = fields.String(load_default=None)
