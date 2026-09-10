from marshmallow import Schema, fields, validate

from app.models.enums import WorkType


class CreateRequestSchema(Schema):
    description = fields.String(required=True, validate=validate.Length(min=1))
    work_type = fields.String(
        data_key="workType", required=True, validate=validate.OneOf([w.value for w in WorkType])
    )
    images = fields.List(
        fields.String(), data_key="images", load_default=list, validate=validate.Length(max=5)
    )


class CreateOfferSchema(Schema):
    price = fields.Decimal(required=True, as_string=False, validate=validate.Range(min=0.01))


class ChooseOfferSchema(Schema):
    offer_id = fields.String(data_key="offerId", required=True)


class AiSuggestSchema(Schema):
    description = fields.String(required=True, validate=validate.Length(min=1))
