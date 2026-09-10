from marshmallow import Schema, fields, validate


class RateJobSchema(Schema):
    stars = fields.Integer(required=True, validate=validate.Range(min=1, max=5))
    comment = fields.String(load_default=None)
